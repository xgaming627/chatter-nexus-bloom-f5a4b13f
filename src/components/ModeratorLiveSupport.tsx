
import React, { useState, useEffect } from 'react';
import { useLiveSupport, SupportSession } from '@/context/LiveSupportContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import UserAvatar from './UserAvatar';
import { Button } from '@/components/ui/button';
import LiveSupportWindow from './LiveSupportWindow';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ModeratorLiveSupport: React.FC = () => {
  const { 
    supportSessions, 
    setCurrentSupportSessionId,
    currentSupportSession
  } = useLiveSupport();
  
  const [showSupportWindow, setShowSupportWindow] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SupportSession | null>(null);
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  
  useEffect(() => {
    // Generate mock feedback data for the chart
    const mockData = [
      { rating: 1, count: Math.floor(Math.random() * 5) },
      { rating: 2, count: Math.floor(Math.random() * 10) },
      { rating: 3, count: Math.floor(Math.random() * 15) },
      { rating: 4, count: Math.floor(Math.random() * 25) },
      { rating: 5, count: Math.floor(Math.random() * 40) }
    ];
    setFeedbackData(mockData);
  }, []);
  
  const handleSelectSession = (session: SupportSession) => {
    setSelectedSession(session);
    setCurrentSupportSessionId(session.id);
    setShowSupportWindow(true);
  };
  
  return (
    <>
      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active Support Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Support Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 border rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-medium">Active Sessions</h3>
              </div>
              <div className="overflow-y-auto max-h-[500px]">
                {supportSessions.length > 0 ? (
                  supportSessions.map(session => (
                    <Button
                      key={session.id}
                      variant="ghost"
                      className="w-full justify-start p-4 h-auto border-b hover:bg-accent"
                      onClick={() => handleSelectSession(session)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <UserAvatar 
                          username={session.userInfo?.username || "User"} 
                          photoURL={session.userInfo?.photoURL} 
                        />
                        <div className="flex-1 text-left">
                          <div className="font-medium">
                            {session.userInfo?.displayName || "User"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{session.userInfo?.username || "user"}
                          </div>
                          {session.lastMessage && (
                            <div className="text-sm text-muted-foreground truncate mt-1">
                              {session.lastMessage.content}
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))
                ) : (
                  <p className="p-4 text-center text-muted-foreground">
                    No active support sessions
                  </p>
                )}
              </div>
            </div>
            
            <div className="col-span-2 border rounded-lg overflow-hidden">
              {selectedSession ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserAvatar 
                          username={selectedSession.userInfo?.username || "User"} 
                          photoURL={selectedSession.userInfo?.photoURL} 
                        />
                        <div>
                          {selectedSession.userInfo?.displayName || "User"}
                          <div className="text-xs text-muted-foreground">
                            @{selectedSession.userInfo?.username || "user"}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {selectedSession.status === 'active' ? 'Active' : 
                         selectedSession.status === 'requested-end' ? 'End Requested' : 'Ended'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedSession.userInfo?.email || "Unknown"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Account Created</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedSession.userInfo?.createdAt ? 
                             format(selectedSession.userInfo.createdAt.toDate(), 'PPP') : 
                             "Unknown"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Support Session Started</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedSession.createdAt ? 
                             format(selectedSession.createdAt.toDate(), 'PPp') : 
                             "Unknown"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Total Messages</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedSession.userInfo?.messageCount || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Button onClick={() => setShowSupportWindow(true)}>
                      Reply to Support Session
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <p className="text-muted-foreground">
                    Select a support session to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card className="p-4">
            <CardHeader>
              <CardTitle>Support Feedback Ratings</CardTitle>
            </CardHeader>
            <CardContent>
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
                    <Bar dataKey="count" name="Number of Ratings" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <h3 className="font-medium mb-2">Recent Feedback Comments</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} filled={i <= 5} />
                        ))}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        2 days ago
                      </span>
                    </div>
                    <p className="text-sm">
                      Very helpful support team, resolved my issue quickly!
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} filled={i <= 4} />
                        ))}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        5 days ago
                      </span>
                    </div>
                    <p className="text-sm">
                      Good support but took a while to get a response.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Live Support Window */}
      {selectedSession && (
        <LiveSupportWindow 
          open={showSupportWindow} 
          onOpenChange={setShowSupportWindow} 
        />
      )}
    </>
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
