import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

export const LevelDisplay = () => {
  const { currentUser } = useAuth();
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [nextLevelXP, setNextLevelXP] = useState(100);

  useEffect(() => {
    if (!currentUser) return;

    const fetchLevel = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.uid)
          .single();

        if (data && 'level' in data && 'xp' in data) {
          setLevel((data as any).level || 1);
          setXp((data as any).xp || 0);
          setNextLevelXP(100 * Math.pow(((data as any).level || 1) + 1, 2));
        }
      } catch (error) {
        console.log('Level data not yet available');
      }
    };

    fetchLevel();

    const subscription = supabase
      .channel('level-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${currentUser.uid}`
        },
        (payload: any) => {
          if (payload.new && 'level' in payload.new) {
            setLevel(payload.new.level || 1);
            setXp(payload.new.xp || 0);
            setNextLevelXP(100 * Math.pow((payload.new.level || 1) + 1, 2));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  const currentLevelXP = 100 * Math.pow(level, 2);
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededInLevel = nextLevelXP - currentLevelXP;
  const progress = Math.max(0, Math.min(100, (xpInCurrentLevel / xpNeededInLevel) * 100));

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-background/50 backdrop-blur-sm rounded-lg border">
      <Badge variant="secondary" className="flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Level {level}
      </Badge>
      <div className="flex-1 min-w-[120px]">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {xpInCurrentLevel} / {xpNeededInLevel} XP
        </p>
      </div>
    </div>
  );
};
