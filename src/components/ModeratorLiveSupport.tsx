
import React, { useState, useEffect } from 'react';
import { useLiveSupport, SupportSession } from '@/context/LiveSupportContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import UserAvatar from './UserAvatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LiveSupportChat from './LiveSupportChat';
import { toast } from '@/hooks/use-toast';
import { Archive, Bell, Shield } from 'lucide-react';
import ArchivedSupportSessions from './ArchivedSupportSessions';
import { ScrollArea } from '@/components/ui/scroll-area';

const ModeratorLiveSupport: React.FC = () => {
  const { 
    supportSessions, 
    setCurrentSupportSessionId,
    currentSupportSession,
    getUserSupportStats
  } = useLiveSupport();
  
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SupportSession | null>(null);
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [hasNewSessions, setHasNewSessions] = useState(false);
  
  useEffect(() => {
    // Generate feedback data or fetch it from the database
    const ratings = supportSessions
      .filter(session => session.rating)
      .map(session => ({ rating: session.rating, feedback: session.feedback }));
    
    const ratingCounts = [0, 0, 0, 0, 0]; // For ratings 1-5
    
    ratings.forEach(item => {
      if (item.rating && item.rating > 0 && item.rating <= 5) {
        ratingCounts[item.rating - 1]++;
      }
    });
    
    const chartData = [
      { rating: 1, count: ratingCounts[0] },
      { rating: 2, count: ratingCounts[1] },
      { rating: 3, count: ratingCounts[2] },
      { rating: 4, count: ratingCounts[3] },
      { rating: 5, count: ratingCounts[4] }
    ];
    
    setFeedbackData(chartData);
  }, [supportSessions]);

  // Check for new support sessions
  useEffect(() => {
    const unreadSessions = supportSessions.filter(session => 
      session.status === 'active' && 
      session.last_read_by_moderator === false
    );
    
    if (unreadSessions.length > 0) {
      setHasNewSessions(true);
      toast({
        title: "New support request",
        description: `${unreadSessions.length} support ${unreadSessions.length === 1 ? 'session' : 'sessions'} waiting for assistance`,
      });
    }
  }, [supportSessions]);
  
  const handleSelectSession = async (session: SupportSession) => {
    try {
      // Open support session in a new window
      const newWindow = window.open(
        `/support-chat/${session.id}`, 
        `support-session-${session.id}`,
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!newWindow) {
        // Fallback if popup is blocked - show in current view
        setSelectedSession(session);
        await setCurrentSupportSessionId(session.id);
        
        if (session.user_id) {
          const stats = await getUserSupportStats(session.user_id);
          setUserStats(stats);
        }
        
        setShowSupportChat(true);
        setHasNewSessions(false);
      }
    } catch (error) {
      console.error("Error selecting support session:", error);
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="col-span-1 border rounded-lg overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-medium">Active Support Sessions</h3>
          {hasNewSessions && (
            <Badge variant="destructive" className="animate-pulse">
              <Bell className="h-3 w-3 mr-1" /> New
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[500px]">
          {supportSessions.filter(s => s.status !== 'ended').length > 0 ? (
            supportSessions
              .filter(s => s.status !== 'ended')
              .map(session => {
                const isRead = session.last_read_by_moderator === true;
                const userHasVPN = session.userInfo?.vpnDetected;
                
                return (
                  <Button
                    key={session.id}
                    variant={isRead ? "ghost" : "default"}
                    className={`w-full justify-start p-4 h-auto border-b hover:bg-accent ${!isRead ? 'bg-muted' : ''} ${userHasVPN ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}
                    onClick={() => handleSelectSession(session)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <UserAvatar 
                        username={session.userInfo?.username || "User"} 
                        photoURL={session.userInfo?.photo_url} 
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium flex justify-between">
                          <span>{session.userInfo?.display_name || "User"}</span>
                          <div className="flex space-x-1">
                            {userHasVPN && (
                              <Badge variant="outline" className="ml-2 bg-orange-200 text-orange-800 text-xs">
                                VPN
                              </Badge>
                            )}
                            {!isRead && (
                              <Badge variant="outline" className="ml-2">New</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{session.userInfo?.username || "user"}
                        </div>
                        {session.last_message && (
                          <div className="text-sm text-muted-foreground truncate mt-1">
                            {session.last_message.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })
          ) : (
            <p className="p-4 text-center text-muted-foreground">
              No active support sessions
            </p>
          )}
        </ScrollArea>
      </div>
      
      <div className="col-span-2 border rounded-lg overflow-hidden">
        {selectedSession ? (
          <div className="h-full flex flex-col">
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserAvatar 
                    username={selectedSession.userInfo?.username || "User"} 
                    photoURL={selectedSession.userInfo?.photo_url} 
                  />
                  <div>
                    {selectedSession.userInfo?.display_name || "User"}
                    <div className="text-xs text-muted-foreground">
                      @{selectedSession.userInfo?.username || "user"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedSession.userInfo?.vpnDetected && (
                    <Badge variant="outline" className="bg-orange-200 text-orange-800">
                      VPN Detected
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {selectedSession.status === 'active' ? 'Active' : 
                     selectedSession.status === 'requested-end' ? 'End Requested' : 'Ended'}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.userInfo?.email || "Unknown"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Account Created</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.userInfo?.created_at ? 
                     format(new Date(selectedSession.userInfo.created_at), 'PPP') : 
                     "Unknown"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">IPv4 Address</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.userInfo?.ipAddress || "Unknown"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">IPv6 Address</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.userInfo?.ipv6Address || "Not available"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.userInfo?.city && selectedSession.userInfo?.country 
                      ? `${selectedSession.userInfo.city}, ${selectedSession.userInfo.country}`
                      : "Unknown"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Total Messages</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.userInfo?.messageCount || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Support Session Started</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.created_at ? 
                     format(new Date(selectedSession.created_at), 'PPp') : 
                     "Unknown"}
                  </p>
                </div>
                {selectedSession.userInfo?.warnings ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Warnings</p>
                    <p className="text-sm text-orange-500 font-medium">
                      <Shield className="inline-block h-4 w-4 mr-1" />
                      {selectedSession.userInfo.warnings} previous warnings
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <LiveSupportChat />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-muted-foreground">
              Select a support session to view details
            </p>
          </div>
        )}
      </div>

      <div className="col-span-1 lg:col-span-3 border rounded-lg overflow-hidden">
        <Tabs defaultValue="chart">
          <div className="p-4 border-b">
            <TabsList>
              <TabsTrigger value="chart">Feedback Ratings</TabsTrigger>
              <TabsTrigger value="comments">Feedback Comments</TabsTrigger>
              <TabsTrigger value="files">
                <Archive className="h-4 w-4 mr-2" />
                Archives
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chart" className="p-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={feedbackData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Number of Ratings" fill="#6264A7" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="comments" className="p-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {supportSessions
                  .filter(session => session.feedback)
                  .map(session => (
                    <div key={session.id} className="p-3 bg-muted rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} filled={session.rating ? i <= session.rating : false} />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {session.created_at ? format(new Date(session.created_at), 'PPp') : ''}
                        </span>
                      </div>
                      <p className="text-sm">{session.feedback}</p>
                    </div>
                  ))}
                
                {supportSessions.filter(session => session.feedback).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No feedback comments available
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="files">
            <ArchivedSupportSessions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`w-4 h-4 ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default ModeratorLiveSupport;
