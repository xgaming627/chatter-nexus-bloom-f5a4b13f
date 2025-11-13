import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Moon, Zap, Copy, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProfileDropdownMenuProps {
  onClose: () => void;
}

export const ProfileDropdownMenu: React.FC<ProfileDropdownMenuProps> = ({ onClose }) => {
  const { profile, updateProfile } = useProfile();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleStatusChange = async (status: 'online' | 'dnd') => {
    const isDND = status === 'dnd';
    await updateProfile({
      doNotDisturb: isDND,
    });

    // Update status in database
    await supabase
      .from('profiles')
      .update({ 
        online_status: status,
        do_not_disturb: isDND
      })
      .eq('user_id', currentUser?.uid);

    toast({
      title: isDND ? "Do Not Disturb Enabled" : "Status Set to Online",
      description: isDND ? "You won't receive notifications" : "You'll receive all notifications",
    });
    onClose();
  };

  const copyUserId = () => {
    if (currentUser) {
      navigator.clipboard.writeText(currentUser.uid);
      toast({
        title: "User ID Copied",
        description: "Your user ID has been copied to clipboard",
      });
      onClose();
    }
  };

  const handleEditProfile = () => {
    navigate('/settings');
    onClose();
  };

  const currentStatus = profile.doNotDisturb ? 'dnd' : profile.onlineStatus || 'online';

  return (
    <div className="absolute bottom-16 left-2 w-64 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
      {/* User Info Section */}
      <div className="bg-primary/20 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
              {(profile.displayName || profile.username || 'U')[0].toUpperCase()}
            </div>
            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-popover ${
              currentStatus === 'dnd' ? 'bg-destructive' : 'bg-green-500'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {profile.displayName || profile.username || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile.username ? `@${profile.username}` : currentUser?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="p-2">
        {/* Status Options */}
        <div className="space-y-1 mb-2">
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm ${
              currentStatus === 'online' ? 'bg-accent' : ''
            }`}
            onClick={() => handleStatusChange('online')}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Online</span>
            </div>
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm ${
              currentStatus === 'dnd' ? 'bg-accent' : ''
            }`}
            onClick={() => handleStatusChange('dnd')}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span>Do Not Disturb</span>
            </div>
          </Button>
        </div>

        <Separator className="my-2" />

        {/* Menu Options */}
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={handleEditProfile}
          >
            <User className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={copyUserId}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy User ID
          </Button>
        </div>
      </div>
    </div>
  );
};
