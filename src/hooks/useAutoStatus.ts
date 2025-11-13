import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useAutoStatus = () => {
  const { currentUser } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateStatus = async (status: 'online' | 'offline') => {
    if (!currentUser) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ online_status: status })
        .eq('user_id', currentUser.uid);
      
      console.log('Online status updated to:', status);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleActivity = () => {
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    if (!currentUser) return;

    // Set status to online when component mounts
    updateStatus('online');

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Check activity every 5 seconds
    intervalRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const oneMinute = 60 * 1000;

      // If no activity for 1 minute, don't change status (user might be reading)
      // Status will only change to offline when they leave the website
    }, 5000);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus('online');
        handleActivity();
      } else if (document.visibilityState === 'hidden') {
        updateStatus('offline');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle beforeunload - set offline when leaving
    const handleBeforeUnload = async () => {
      updateStatus('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set offline on cleanup
      updateStatus('offline');
    };
  }, [currentUser]);

  return { updateStatus };
};
