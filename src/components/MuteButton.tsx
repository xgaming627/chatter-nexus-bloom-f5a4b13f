import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MuteButton: React.FC = () => {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('moderator-muted') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('moderator-muted', isMuted.toString());
  }, [isMuted]);

  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    toast({
      title: newMutedState ? "Notifications Muted" : "Notifications Unmuted",
      description: newMutedState ? "Sound notifications are now disabled" : "Sound notifications are now enabled"
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggleMute}
      className="flex items-center gap-2"
    >
      {isMuted ? (
        <>
          <VolumeX className="h-4 w-4" />
          Unmute
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4" />
          Mute
        </>
      )}
    </Button>
  );
};

export default MuteButton;