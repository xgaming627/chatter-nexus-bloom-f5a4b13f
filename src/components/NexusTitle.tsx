import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

const NexusTitle: React.FC = () => {
  const { currentUser } = useAuth();
  const [hasNexusPlus, setHasNexusPlus] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const checkNexusPlus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('nexus_plus_active')
        .eq('user_id', currentUser.uid)
        .single();

      setHasNexusPlus(data?.nexus_plus_active || false);
    };

    checkNexusPlus();

    // Listen for changes
    const channel = supabase
      .channel(`profile:${currentUser.uid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${currentUser.uid}`
        },
        (payload) => {
          if (payload.new.nexus_plus_active !== undefined) {
            setHasNexusPlus(payload.new.nexus_plus_active);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  return (
    <h1 className={cn(
      "text-xl font-bold flex items-center gap-2 transition-all duration-300",
      hasNexusPlus && "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 animate-pulse"
    )}>
      {hasNexusPlus ? (
        <>
          <Crown className="h-5 w-5 text-yellow-400 animate-bounce" />
          Nexus Chat+
          <Crown className="h-5 w-5 text-yellow-400 animate-bounce" />
        </>
      ) : (
        'Nexus Chat'
      )}
    </h1>
  );
};

export default NexusTitle;
