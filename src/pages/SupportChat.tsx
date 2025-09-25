import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveSupport } from '@/context/LiveSupportContext';
import { useAuth } from '@/context/AuthContext';
import LiveSupportChat from '@/components/LiveSupportChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserAvatar from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Shield } from 'lucide-react';

const SupportChat: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { currentUser } = useAuth();
  const { 
    supportSessions,
    setCurrentSupportSessionId,
    currentSupportSession,
    getUserSupportStats
  } = useLiveSupport();
  
  const [userStats, setUserStats] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      const foundSession = supportSessions.find(s => s.id === sessionId);
      if (foundSession) {
        setSession(foundSession);
        setCurrentSupportSessionId(sessionId);
        
        if (foundSession.user_id) {
          getUserSupportStats(foundSession.user_id).then(setUserStats);
        }
      }
    }
  }, [sessionId, supportSessions, setCurrentSupportSessionId, getUserSupportStats]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have permission to access this support session.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Support Session Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The requested support session could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-4">
        {/* Session Header */}
        <Card className="mb-4">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar 
                  username={session.userInfo?.username || "User"} 
                  photoURL={session.userInfo?.photo_url} 
                />
                <div>
                  <CardTitle className="text-lg">
                    {session.userInfo?.display_name || "User"}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    @{session.userInfo?.username || "user"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {session.userInfo?.vpnDetected && (
                  <Badge variant="outline" className="bg-orange-200 text-orange-800">
                    VPN Detected
                  </Badge>
                )}
                <Badge variant="outline">
                  {session.status === 'active' ? 'Active' : 
                   session.status === 'requested-end' ? 'End Requested' : 'Ended'}
                </Badge>
              </div>
            </div>
            
            {/* User Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {session.userInfo?.email || "Unknown"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Account Created</p>
                <p className="text-sm text-muted-foreground">
                  {session.userInfo?.created_at ? 
                   format(new Date(session.userInfo.created_at), 'PPP') : 
                   "Unknown"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Total Messages</p>
                <p className="text-sm text-muted-foreground">
                  {session.userInfo?.messageCount || 0}
                </p>
              </div>
              {session.userInfo?.warnings && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Warnings</p>
                  <p className="text-sm text-orange-500 font-medium">
                    <Shield className="inline-block h-4 w-4 mr-1" />
                    {session.userInfo.warnings} previous warnings
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Chat Interface */}
        <Card className="h-[600px] flex flex-col">
          <CardContent className="flex-1 p-0 overflow-hidden">
            <LiveSupportChat />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupportChat;