import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useRealTimeStatus = () => {
  const { currentUser } = useAuth();
  const statusRef = useRef<'online' | 'dnd' | 'offline'>('online');
  const dndModeRef = useRef(false);

  const updateStatus = async (status: 'online' | 'dnd' | 'offline') => {
    if (!currentUser) return;
    
    statusRef.current = status;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          online_status: status,
          do_not_disturb: status === 'dnd'
        })
        .eq('user_id', currentUser.uid);
      
      console.log('Status updated to:', status);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const setOnline = () => {
    if (!dndModeRef.current) {
      updateStatus('online');
    }
  };

  const setOffline = () => {
    if (!dndModeRef.current) {
      updateStatus('offline');
    }
  };

  const toggleDND = async (enabled: boolean) => {
    dndModeRef.current = enabled;
    await updateStatus(enabled ? 'dnd' : 'online');
  };

  useEffect(() => {
    if (!currentUser) return;

    // Set online when component mounts
    updateStatus('online');

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline();
      } else if (document.visibilityState === 'hidden') {
        setOffline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle beforeunload - set offline when leaving
    const handleBeforeUnload = () => {
      // Simply update status to offline on unload
      updateStatus('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set offline on cleanup
      updateStatus('offline');
    };
  }, [currentUser]);

  return { updateStatus, toggleDND, setOnline, setOffline };
};
