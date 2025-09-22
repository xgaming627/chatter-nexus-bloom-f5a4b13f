import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface User {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

interface UsernameEditDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: (updatedUser: User) => void;
}

const UsernameEditDialog: React.FC<UsernameEditDialogProps> = ({
  user,
  open,
  onOpenChange,
  onUserUpdated
}) => {
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user && open) {
      setNewUsername(user.username || '');
    }
  }, [user, open]);

  const isValidUsername = (username: string) => {
    return /^[a-zA-Z0-9_]+$/.test(username) && username.length >= 3 && username.length <= 20;
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username)
      .single();

    // If no data or error PGRST116 (no rows), username is available
    // Also allow if the username belongs to the current user
    return !data || (error && error.code === 'PGRST116') || data.user_id === user.user_id;
  };

  const handleSave = async () => {
    if (!user || !newUsername.trim()) return;

    if (!isValidUsername(newUsername)) {
      toast({
        title: "Invalid username", 
        description: "Username must be 3-20 characters and contain only letters, numbers, and underscores",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Check availability
      const isAvailable = await checkUsernameAvailability(newUsername);
      if (!isAvailable) {
        toast({
          title: "Username unavailable",
          description: "This username is already taken",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Update username
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: "Username updated",
        description: `Username changed to ${newUsername}`,
      });

      onUserUpdated({ ...user, username: newUsername });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating username:', error);
      toast({
        title: "Error",
        description: "Failed to update username",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Username</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !newUsername.trim()}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameEditDialog;