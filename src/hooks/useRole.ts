import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type AppRole = 'admin' | 'moderator' | 'user';

export const useRole = () => {
  const { currentUser } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!currentUser) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.uid);

        if (error) throw error;

        const userRoles = data?.map(row => row.role as AppRole) || [];
        setRoles(userRoles);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [currentUser]);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const isModerator = (): boolean => {
    return hasRole('admin') || hasRole('moderator');
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  return {
    roles,
    loading,
    hasRole,
    isModerator,
    isAdmin
  };
};