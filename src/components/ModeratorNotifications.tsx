import React, { useEffect, useState } from 'react';
import { useLiveSupport } from '@/context/LiveSupportContext';
import { useAuth } from '@/context/AuthContext';
import { Bell, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const ModeratorNotifications: React.FC = () => {
  const { currentUser } = useAuth();
  const { supportSessions } = useLiveSupport();
  const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(null);
  
  // Check if user is moderator
  const isModerator = currentUser?.email === 'vitorrossato812@gmail.com' || 
                     currentUser?.email === 'lukasbraga77@gmail.com';

  useEffect(() => {
    if (!isModerator || !supportSessions) return;

    // Find new active sessions that haven't been handled
    const newSessions = supportSessions.filter(session => 
      session.status === 'active' && 
      !session.last_read_by_moderator &&
      (!lastNotificationTime || new Date(session.created_at) > lastNotificationTime)
    );

    if (newSessions.length > 0) {
      // Show notification for new support sessions
      toast({
        title: "New Support Request",
        description: `${newSessions.length} new support session${newSessions.length > 1 ? 's' : ''} waiting for response`,
        duration: 10000,
      });
      
      setLastNotificationTime(new Date());
    }
  }, [supportSessions, isModerator, lastNotificationTime]);

  if (!isModerator) return null;

  const unreadCount = supportSessions?.filter(session => 
    session.status === 'active' && !session.last_read_by_moderator
  ).length || 0;

  if (unreadCount === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <Shield className="h-4 w-4" />
        <span className="text-sm font-medium">Moderator</span>
        <Badge variant="secondary" className="ml-2">
          <Bell className="h-3 w-3 mr-1" />
          {unreadCount}
        </Badge>
      </div>
    </div>
  );
};

export default ModeratorNotifications;