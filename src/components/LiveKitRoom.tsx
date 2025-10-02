import React, { useState, useEffect } from 'react';
import { LiveKitRoom as LKRoom, VideoConference, useToken } from '@livekit/components-react';
import '@livekit/components-styles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { useAuth } from '@/context/AuthContext';

interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  isVideoCall: boolean;
  onLeave: () => void;
}

export const LiveKitRoom: React.FC<LiveKitRoomProps> = ({
  roomName,
  participantName,
  isVideoCall,
  onLeave
}) => {
  const { generateToken } = useLiveKit();
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    const initializeRoom = async () => {
      const tokenData = await generateToken(roomName, participantName);
      if (tokenData) {
        setToken(tokenData.token);
        setServerUrl(tokenData.serverUrl);
        setIsConnecting(false);
      } else {
        onLeave();
      }
    };

    initializeRoom();
  }, [roomName, participantName, generateToken, onLeave]);

  if (isConnecting || !token || !serverUrl) {
    return (
      <Dialog open={true} onOpenChange={onLeave}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connecting to call...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onLeave}>
      <DialogContent className="max-w-6xl h-[80vh] p-0">
        <LKRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          video={isVideoCall}
          audio={true}
          onDisconnected={onLeave}
          className="h-full"
        >
          <VideoConference />
        </LKRoom>
      </DialogContent>
    </Dialog>
  );
};

interface CallButtonProps {
  roomName: string;
  participantName: string;
  isVideoCall: boolean;
  buttonText?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const CallButton: React.FC<CallButtonProps> = ({
  roomName,
  participantName,
  isVideoCall,
  buttonText,
  variant = 'default',
  size = 'default',
  className = ''
}) => {
  const [isInCall, setIsInCall] = useState(false);

  const startCall = () => {
    setIsInCall(true);
  };

  const endCall = () => {
    setIsInCall(false);
  };

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        onClick={startCall}
        className={className}
      >
        {isVideoCall ? <Video className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
        {buttonText || (isVideoCall ? 'Video Call' : 'Voice Call')}
      </Button>

      {isInCall && (
        <LiveKitRoom
          roomName={roomName}
          participantName={participantName}
          isVideoCall={isVideoCall}
          onLeave={endCall}
        />
      )}
    </>
  );
};
