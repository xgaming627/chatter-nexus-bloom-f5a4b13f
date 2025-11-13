import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';

const AppInitializer: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Force dark mode
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  
  // Initialize activity tracker and notifications only after auth is ready
  useActivityTracker();
  useNotifications();

  // Grant 3-day free trial on first login
  React.useEffect(() => {
    if (!currentUser) return;

    const grantFreeTrial = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('free_trial_claimed, nexus_plus_active, nexus_plus_expires_at')
          .eq('user_id', currentUser.uid)
          .single();

        if (!profile || profile.free_trial_claimed) {
          return; // Already claimed or profile doesn't exist
        }

        // Calculate 3 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 3);

        // Grant free trial
        await supabase
          .from('profiles')
          .update({
            nexus_plus_active: true,
            nexus_plus_expires_at: expiryDate.toISOString(),
            free_trial_claimed: true
          })
          .eq('user_id', currentUser.uid);

        console.log('Free trial granted:', expiryDate);
      } catch (error) {
        console.error('Error granting free trial:', error);
      }
    };

    grantFreeTrial();
  }, [currentUser]);

  return null; // This component doesn't render anything
};

export default AppInitializer;