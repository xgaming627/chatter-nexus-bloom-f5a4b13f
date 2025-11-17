import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useRealTimeStatus = () => {
  const { currentUser } = useAuth();
  const dndModeRef = useRef(false);

  const toggleDND = async (enabled: boolean) => {
    if (!currentUser) return;
    dndModeRef.current = enabled;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          do_not_disturb: enabled,
          online_status: enabled ? 'dnd' : 'online'
        })
        .eq('user_id', currentUser.uid);
      
      console.log('DND status updated to:', enabled);
    } catch (error) {
      console.error('Error updating DND status:', error);
    }
  };

  // Only export DND toggle - online/offline tracking is handled by AuthContext
  return { toggleDND };
};
