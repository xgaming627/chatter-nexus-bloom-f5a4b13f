import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Component that automatically reloads the page when a user receives a warning
 */
const WarningReloadHandler = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to warnings for the current user
    const channel = supabase
      .channel(`user-warnings-${currentUser.uid}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_warnings',
        filter: `user_id=eq.${currentUser.uid}`,
      }, () => {
        // Reload the page when a new warning is received
        window.location.reload();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  return null;
};

export default WarningReloadHandler;
