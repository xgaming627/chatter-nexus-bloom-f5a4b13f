import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useActivityTracker = () => {
  const { currentUser } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const statusRef = useRef<'online' | 'away' | 'offline'>('online');

  const updateStatus = async (status: 'online' | 'away' | 'offline') => {
    if (!currentUser || statusRef.current === status) return;
    
    statusRef.current = status;
    
    try {
      await supabase
        .from('profiles')
        .update({ online_status: status })
        .eq('user_id', currentUser.uid);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleActivity = () => {
    lastActivityRef.current = Date.now();
    if (statusRef.current !== 'online') {
      updateStatus('online');
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    // Set initial status to online
    updateStatus('online');

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Check activity every 30 seconds
    const activityChecker = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (timeSinceActivity > fiveMinutes && statusRef.current !== 'away') {
        updateStatus('away');
      }
    }, 30000);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity();
      } else if (document.visibilityState === 'hidden') {
        // Set to away when tab becomes hidden
        setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            updateStatus('away');
          }
        }, 60000); // 1 minute delay
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page unload
    const handleBeforeUnload = () => {
      navigator.sendBeacon && navigator.sendBeacon('/api/status', JSON.stringify({
        userId: currentUser.uid,
        status: 'offline'
      }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(activityChecker);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set offline on cleanup
      updateStatus('offline');
    };
  }, [currentUser]);

  return { updateStatus };
};