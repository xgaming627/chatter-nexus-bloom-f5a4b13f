import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ModeratorBadgeToggle: React.FC = () => {
  const { currentUser } = useAuth();
  const { isModerator } = useRole();
  const [showBadge, setShowBadge] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser && isModerator) {
      loadBadgePreference();
    }
  }, [currentUser, isModerator]);

  const loadBadgePreference = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('show_moderator_badge')
        .eq('user_id', currentUser.uid)
        .single();

      if (error) throw error;
      setShowBadge(data?.show_moderator_badge ?? true);
    } catch (error) {
      console.error('Error loading badge preference:', error);
    }
  };

  const toggleBadge = async (checked: boolean) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ show_moderator_badge: checked })
        .eq('user_id', currentUser.uid);

      if (error) throw error;

      setShowBadge(checked);
      toast({
        title: "Badge preference updated",
        description: `Moderator badge is now ${checked ? 'visible' : 'hidden'}`,
      });
    } catch (error) {
      console.error('Error updating badge preference:', error);
      toast({
        title: "Error updating preference",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isModerator) return null;

  return (
    <div className="flex items-center space-x-2 p-4 border rounded-lg">
      <Shield className="h-5 w-5 text-blue-500" />
      <div className="flex-1">
        <Label htmlFor="badge-toggle" className="text-sm font-medium">
          Show Moderator Badge
        </Label>
        <p className="text-xs text-muted-foreground">
          Display your moderator badge in chat messages
        </p>
      </div>
      <Switch
        id="badge-toggle"
        checked={showBadge}
        onCheckedChange={toggleBadge}
        disabled={loading}
      />
    </div>
  );
};

export default ModeratorBadgeToggle;