import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  username: string;
  displayName: string;
  photoURL: string;
  description: string;
  onlineStatus: string;
  doNotDisturb?: boolean;
}

export const useProfile = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>({
    username: '',
    displayName: '',
    photoURL: '',
    description: '',
    onlineStatus: 'offline',
    doNotDisturb: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, photo_url, description, online_status, do_not_disturb')
        .eq('user_id', currentUser.uid)
        .single();

      if (error) throw error;

      setProfile({
        username: data.username || currentUser.username || 'User',
        displayName: data.display_name || currentUser.displayName || data.username || 'User',
        photoURL: data.photo_url || currentUser.photoURL || '',
        description: data.description || '',
        onlineStatus: data.online_status || 'offline',
        doNotDisturb: data.do_not_disturb || false
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Use fallback from currentUser
      setProfile({
        username: currentUser.username || 'User',
        displayName: currentUser.displayName || currentUser.username || 'User',
        photoURL: currentUser.photoURL || '',
        description: '',
        onlineStatus: 'offline',
        doNotDisturb: false
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<ProfileData>) => {
    if (!currentUser) return false;

    try {
      const dbUpdates: any = {};
      
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.photoURL !== undefined) dbUpdates.photo_url = updates.photoURL;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.onlineStatus !== undefined) dbUpdates.online_status = updates.onlineStatus;
      if (updates.doNotDisturb !== undefined) dbUpdates.do_not_disturb = updates.doNotDisturb;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('user_id', currentUser.uid);

      if (error) throw error;

      // Update local state
      setProfile(prev => ({ ...prev, ...updates }));

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error updating profile",
        description: "Please try again later",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refreshProfile: fetchProfile
  };
};