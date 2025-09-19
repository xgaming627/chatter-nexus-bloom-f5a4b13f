
import React, { useState, useEffect } from 'react';
import { useLiveSupport, SupportSession } from '@/context/LiveSupportContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Archive, MessageCircle, Star } from 'lucide-react';
import UserAvatar from './UserAvatar';

const ArchivedSupportSessions: React.FC = () => {
  const { supportSessions, setCurrentSupportSessionId } = useLiveSupport();
  const [archivedSessions, setArchivedSessions] = useState<SupportSession[]>([]);

  useEffect(() => {
    // Filter ended support sessions
    const ended = supportSessions.filter(session => session.status === 'ended');
    setArchivedSessions(ended);
  }, [supportSessions]);

  const handleViewSession = (session: SupportSession) => {
    setCurrentSupportSessionId(session.id);
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archived Support Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {archivedSessions.length > 0 ? (
              <div className="space-y-4">
                {archivedSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <UserAvatar 
                          username={session.userInfo?.username || "User"} 
                          photoURL={session.userInfo?.photo_url} 
                          size="sm"
                        />
                        <div>
                          <div className="font-medium">{session.userInfo?.display_name || "User"}</div>
                          <div className="text-xs text-muted-foreground">
                            @{session.userInfo?.username || "user"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.rating && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-3 w-3 inline ${i < session.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                              />
                            ))}
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          Archived
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-3">
                      {session.created_at ? format(new Date(session.created_at), 'PPpp') : "Unknown date"}
                    </div>
                    
                    {session.last_message && (
                      <div className="text-sm border-l-2 pl-2 mb-3">
                        "{session.last_message.content}"
                      </div>
                    )}
                    
                    {session.feedback && (
                      <div className="text-sm border-t pt-2 mt-2">
                        <span className="font-medium">Feedback:</span> {session.feedback}
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => handleViewSession(session)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      View Session
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No archived support sessions
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchivedSupportSessions;
