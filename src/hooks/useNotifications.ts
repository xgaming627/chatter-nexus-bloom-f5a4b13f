import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  is_sound_enabled: boolean;
  metadata?: any;
}

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const showNotification = (data: NotificationData) => {
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      const notification = new Notification(data.title, {
        body: data.message,
        icon: '/favicon.ico',
        silent: !data.is_sound_enabled,
        tag: data.type,
        requireInteraction: data.type === 'mention' || data.type === 'warning'
      });

      // Auto close after 8 seconds for non-critical notifications
      if (data.type !== 'mention' && data.type !== 'warning') {
        setTimeout(() => notification.close(), 8000);
      }

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Play sound if enabled
    if (data.is_sound_enabled) {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = data.type === 'call' ? 0.5 : 0.3; // Louder for calls
        audio.play().catch(() => {
          // Ignore audio play errors (user interaction required)
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.uid}`
        },
        (payload) => {
          const notification = payload.new as NotificationData;
          showNotification(notification);
          setHasUnreadNotifications(true);
        }
      )
      .subscribe();

    // Check for existing unread notifications
    const checkUnreadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', currentUser.uid)
          .eq('is_read', false)
          .limit(1);

        if (!error && data && data.length > 0) {
          setHasUnreadNotifications(true);
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    checkUnreadNotifications();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const markAllAsRead = async () => {
    if (!currentUser) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.uid)
        .eq('is_read', false);

      setHasUnreadNotifications(false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  return {
    hasUnreadNotifications,
    markAllAsRead,
    showNotification
  };
};