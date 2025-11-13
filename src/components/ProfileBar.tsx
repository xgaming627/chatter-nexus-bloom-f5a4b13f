import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Settings, Mic, MicOff, Headphones, HeadphoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserAvatar from './UserAvatar';
import { toast } from '@/hooks/use-toast';
import { ProfileDropdownMenu } from './ProfileDropdownMenu';

interface ProfileBarProps {
  onSettingsClick: () => void;
}

export const ProfileBar: React.FC<ProfileBarProps> = ({ onSettingsClick }) => {
  const { currentUser } = useAuth();
  const { profile } = useProfile();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // When deafened, also mute
    if (isDeafened && !isMuted) {
      setIsMuted(true);
    }
  }, [isDeafened]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: !isMuted ? "Microphone Muted" : "Microphone Unmuted",
      description: !isMuted ? "Your microphone is now muted" : "Your microphone is now unmuted",
    });
  };

  const toggleDeafen = () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    
    if (newDeafened) {
      setIsMuted(true);
      toast({
        title: "Deafened",
        description: "All website audio is now turned off",
      });
    } else {
      toast({
        title: "Undeafened",
        description: "Website audio is now enabled",
      });
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative h-14 bg-muted/30 border-t flex items-center justify-between px-2" ref={menuRef}>
      <button 
        className="flex items-center gap-2 flex-1 min-w-0 hover:bg-accent rounded p-1 transition-colors"
        onClick={() => setShowProfileMenu(!showProfileMenu)}
      >
        <UserAvatar
          photoURL={profile.photoURL}
          username={profile.displayName || profile.username}
          size="sm"
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium truncate">
            {profile.displayName || profile.username || 'User'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {profile.username ? `@${profile.username}` : currentUser.email}
          </p>
        </div>
      </button>
      
      {showProfileMenu && (
        <ProfileDropdownMenu onClose={() => setShowProfileMenu(false)} />
      )}
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isMuted ? 'text-destructive hover:text-destructive' : ''}`}
          onClick={toggleMute}
          disabled={isDeafened}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isDeafened ? 'text-destructive hover:text-destructive' : ''}`}
          onClick={toggleDeafen}
        >
          {isDeafened ? <HeadphoneOff className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onSettingsClick}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
