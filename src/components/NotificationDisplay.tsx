import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, Volume2, VolumeX } from 'lucide-react';
import { format } from 'date-fns';
import MentionNotificationSound from './MentionNotificationSound';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  is_sound_enabled: boolean;
  created_at: string;
  metadata?: any;
}

const NotificationDisplay: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [playSound, setPlaySound] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Load dismissed notifications from localStorage
    const stored = localStorage.getItem('dismissedNotifications');
    if (stored) {
      setDismissed(JSON.parse(stored));
    }

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.uid)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        
        const newNotifications = data || [];
        const previousNotificationIds = notifications.map(n => n.id);
        const hasNewNotifications = newNotifications.some(n => !previousNotificationIds.includes(n.id));
        
        setNotifications(newNotifications);
        
        // Play sound for new notifications if enabled
        if (hasNewNotifications) {
          const soundEnabledNotifications = newNotifications.filter(n => 
            n.is_sound_enabled && !previousNotificationIds.includes(n.id)
          );
          if (soundEnabledNotifications.length > 0) {
            setPlaySound(true);
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    // Set up real-time listener for new notifications
    const channel = supabase
      .channel(`notifications:${currentUser.uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.uid}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          fetchNotifications(); // Refresh notifications when new one is added
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, notifications.length]);

  const handleDismiss = async (notificationId: string) => {
    try {
      // Mark as read in database
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      // Add to local dismissed list
      const newDismissed = [...dismissed, notificationId];
      setDismissed(newDismissed);
      localStorage.setItem('dismissedNotifications', JSON.stringify(newDismissed));
      
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  // Filter out dismissed notifications
  const activeNotifications = notifications.filter(notification => 
    !dismissed.includes(notification.id)
  );

  useEffect(() => {
    // Auto-dismiss notifications after 2 seconds
    activeNotifications.forEach((notification) => {
      const timer = setTimeout(() => {
        handleDismiss(notification.id);
      }, 2000);
      
      return () => clearTimeout(timer);
    });
  }, [activeNotifications.length]);

  if (activeNotifications.length === 0) return null;

  return (
    <>
      <MentionNotificationSound 
        play={playSound} 
        onPlayed={() => setPlaySound(false)} 
      />
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {activeNotifications.map((notification) => (
          <Alert 
            key={notification.id} 
            className="relative bg-background border shadow-lg animate-in fade-in slide-in-from-right-4 duration-300"
          >
            <MessageSquare className="h-4 w-4" />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-muted"
              onClick={() => handleDismiss(notification.id)}
            >
              <X className="h-3 w-3" />
            </Button>
            <AlertTitle className="pr-8">{notification.title}</AlertTitle>
            <AlertDescription className="space-y-1 pr-8">
              <p>{notification.message}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(new Date(notification.created_at), 'MMM d, HH:mm')}</span>
                {notification.is_sound_enabled ? (
                  <Volume2 className="h-3 w-3" />
                ) : (
                  <VolumeX className="h-3 w-3" />
                )}
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </>
  );
};

export default NotificationDisplay;