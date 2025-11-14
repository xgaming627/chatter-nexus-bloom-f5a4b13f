import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveSupport, SupportSession } from '@/context/LiveSupportContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import UserAvatar from './UserAvatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from '@/hooks/use-toast';
import { Archive, Shield, Crown, Send, X } from 'lucide-react';
import ArchivedSupportSessions from './ArchivedSupportSessions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/hooks/useRole';

const ModeratorLiveSupport: React.FC = () => {
  const { currentUser } = useAuth();
  const { isAdmin, isModerator: checkIsModerator } = useRole();
  const { 
    supportSessions, 
    setCurrentSupportSessionId,
    currentSupportSession,
    supportMessages,
    sendSupportMessage,
    requestEndSupport,
    forceEndSupport,
  } = useLiveSupport();
  
  const [selectedSession, setSelectedSession] = useState<SupportSession | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const prevSessionCountRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check if user is actually a moderator
  const isMod = checkIsModerator();
  
  useEffect(() => {
    if (!isMod) {
      toast({
        title: "Access Denied",
        description: "You need moderator permissions to access this panel",
        variant: "destructive"
      });
    }
  }, [isMod]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [supportMessages]);
  
  // Memoize feedback data calculation
  const feedbackData = useMemo(() => {
    const ratingCounts = [0, 0, 0, 0, 0];
    
    supportSessions
      .filter(session => session.rating)
      .forEach(session => {
        if (session.rating && session.rating > 0 && session.rating <= 5) {
          ratingCounts[session.rating - 1]++;
        }
      });
    
    return [
      { rating: 1, count: ratingCounts[0] },
      { rating: 2, count: ratingCounts[1] },
      { rating: 3, count: ratingCounts[2] },
      { rating: 4, count: ratingCounts[3] },
      { rating: 5, count: ratingCounts[4] }
    ];
  }, [supportSessions]);

  // Check for NEW sessions only
  useEffect(() => {
    const activeSessions = supportSessions.filter(s => 
      s.status === 'active' || s.status === 'waiting_for_agent'
    );
    
    if (activeSessions.length > prevSessionCountRef.current && prevSessionCountRef.current > 0) {
      toast({
        title: "New support request",
        description: `${activeSessions.length} active support ${activeSessions.length === 1 ? 'session' : 'sessions'}`,
      });
    }
    
    prevSessionCountRef.current = activeSessions.length;
  }, [supportSessions.length]);
  
  const handleSelectSession = (session: SupportSession) => {
    setSelectedSession(session);
    setCurrentSupportSessionId(session.id);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedSession) {
      sendSupportMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleEndSupport = () => {
    if (selectedSession) {
      requestEndSupport();
      toast({
        title: "Support session ended",
        description: "The session has been ended successfully"
      });
      setSelectedSession(null);
    }
  };
  
  if (!isMod) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Access Denied</p>
        </div>
      </div>
    );
  }

  const activeSessions = supportSessions.filter(s => 
    s.status !== 'ended' && s.user_id
  );

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="active" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none px-4">
          <TabsTrigger value="active">
            Active Sessions
            {activeSessions.length > 0 && (
              <Badge className="ml-2">{activeSessions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="flex-1 flex gap-4 p-4 mt-0">
          {/* Sessions List */}
          <Card className="w-80 flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-medium">Support Queue</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {activeSessions.length > 0 ? (
                  activeSessions.map(session => {
                    const userHasVPN = session.userInfo?.vpnDetected;
                    
                    return (
                      <button
                        key={session.id}
                        onClick={() => handleSelectSession(session)}
                        className={`w-full p-3 rounded-lg border text-left hover:bg-muted transition-colors ${
                          selectedSession?.id === session.id ? 'bg-muted border-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              username={session.userInfo?.username || 'User'}
                              photoURL={session.userInfo?.photo_url}
                              isNexusPlus={session.userInfo?.nexus_plus_active}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {session.userInfo?.display_name || session.userInfo?.username || 'Anonymous'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {session.user_name || 'No name provided'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {userHasVPN && (
                            <Badge variant="destructive" className="text-xs">VPN</Badge>
                          )}
                          {session.userInfo?.nexus_plus_active && (
                            <Badge className="text-xs bg-gradient-to-r from-yellow-400 to-amber-500">
                              <Crown className="h-3 w-3 mr-1" />
                              Plus
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {session.status === 'waiting_for_agent' ? 'Waiting' : 'Active'}
                          </Badge>
                        </div>
                        {session.issue && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {session.issue}
                          </p>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No active support sessions</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          {selectedSession ? (
            <div className="flex-1 flex gap-4">
              {/* Messages */}
              <Card className="flex-1 flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      username={selectedSession.userInfo?.username || 'User'}
                      photoURL={selectedSession.userInfo?.photo_url}
                      isNexusPlus={selectedSession.userInfo?.nexus_plus_active}
                    />
                    <div>
                      <p className="font-medium">
                        {selectedSession.userInfo?.display_name || selectedSession.userInfo?.username || 'Anonymous'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{selectedSession.userInfo?.username || 'unknown'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleEndSupport}
                  >
                    <X className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {supportMessages.map((msg) => {
                      const isModerator = msg.sender_role === 'moderator' || msg.sender_role === 'system';
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isModerator ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isModerator
                                ? 'bg-primary text-primary-foreground'
                                : msg.sender_role === 'system'
                                ? 'bg-muted text-muted-foreground italic'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {format(new Date(msg.timestamp), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendMessage} className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="resize-none"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <Button type="submit" size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Card>

              {/* User Info Panel */}
              <Card className="w-80">
                <div className="p-4 border-b">
                  <h3 className="font-medium">User Information</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Real Username</p>
                    <p className="text-sm font-medium">@{selectedSession.userInfo?.username || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Stated Username</p>
                    <p className="text-sm font-medium">{selectedSession.user_username || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Display Name</p>
                    <p className="text-sm font-medium">{selectedSession.userInfo?.display_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Name</p>
                    <p className="text-sm font-medium">{selectedSession.user_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <p className="text-sm font-medium break-all">{selectedSession.user_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">User ID</p>
                    <p className="text-xs font-mono break-all">{selectedSession.user_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nexus Plus</p>
                    {selectedSession.userInfo?.nexus_plus_active ? (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500">
                        <Crown className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Issue</p>
                    <p className="text-sm">{selectedSession.issue || 'No issue specified'}</p>
                  </div>
                  {selectedSession.userInfo?.vpnDetected && (
                    <div>
                      <Badge variant="destructive" className="w-full justify-center">
                        VPN Detected
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>Select a session to start helping</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="flex-1 p-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Session Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{supportSessions.length}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Active Now</p>
                  <p className="text-2xl font-bold">{activeSessions.length}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">
                    {supportSessions.filter(s => s.rating).length > 0
                      ? (
                          supportSessions
                            .filter(s => s.rating)
                            .reduce((sum, s) => sum + (s.rating || 0), 0) /
                          supportSessions.filter(s => s.rating).length
                        ).toFixed(1)
                      : 'N/A'}
                  </p>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Feedback Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={feedbackData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="archived" className="flex-1">
          <ArchivedSupportSessions />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModeratorLiveSupport;
