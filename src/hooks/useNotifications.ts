import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { playMessageSound } from '@/utils/notificationSound';

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
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  const showNotification = useCallback((data: NotificationData) => {
    // Skip if we've already shown this notification in this session
    if (shownNotificationsRef.current.has(data.id)) {
      return;
    }

    // Check if user is currently viewing the app
    const isWindowFocused = document.hasFocus();
    
    // For messages, only show notification if window is not focused
    if (data.type === 'message' && isWindowFocused) {
      return;
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(data.title, {
        body: data.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.id, // Prevent duplicate notifications
        silent: !data.is_sound_enabled,
        requireInteraction: data.type === 'call' || data.type === 'mention'
      });

      // Mark as shown
      shownNotificationsRef.current.add(data.id);

      // Auto close after 8 seconds for non-critical notifications
      if (data.type !== 'call' && data.type !== 'mention' && data.type !== 'warning') {
        setTimeout(() => notification.close(), 8000);
      }

      if (data.is_sound_enabled) {
        playMessageSound();
      }

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

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
    const checkUnread = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', currentUser.uid)
        .eq('is_read', false);

      if (data && data.length > 0) {
        setHasUnreadNotifications(true);
      }
    };

    checkUnread();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, showNotification]);

  const markAllAsRead = async () => {
    if (!currentUser) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.uid)
      .eq('is_read', false);

    setHasUnreadNotifications(false);
  };

  return { hasUnreadNotifications, markAllAsRead, showNotification };
};