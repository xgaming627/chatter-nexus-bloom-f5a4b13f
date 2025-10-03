import React, { useState, useEffect } from 'react';
import { LiveKitRoom as LKRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { useAuth } from '@/context/AuthContext';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import { toast } from 'sonner';

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
            <DialogDescription>Please wait while we connect you</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onLeave(); }}>
      <DialogContent className="max-w-6xl h-[80vh] p-0" onInteractOutside={(e) => e.preventDefault()}>
        <LKRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          video={isVideoCall}
          audio={true}
          onDisconnected={onLeave}
          onError={(error) => {
            console.error('LiveKit connection error:', error);
            toast.error(`Connection failed: ${error.message}. Please check LiveKit credentials.`);
            onLeave();
          }}
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
  receiverId?: string;
  receiverName?: string;
  receiverPhoto?: string;
}

export const CallButton: React.FC<CallButtonProps> = ({
  roomName,
  participantName,
  isVideoCall,
  buttonText,
  variant = 'default',
  size = 'default',
  className = '',
  receiverId,
  receiverName,
  receiverPhoto
}) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const { sendCallNotification, isSendingNotification } = useCallNotifications();

  const startCall = async () => {
    if (isInitiating) return; // Prevent double-clicks
    
    setIsInitiating(true);
    
    // If we have receiver info, send notification first
    if (receiverId && receiverName) {
      const notification = await sendCallNotification(
        receiverId,
        receiverName,
        receiverPhoto,
        roomName,
        isVideoCall
      );
      
      if (!notification) {
        toast.error('Failed to notify the other user');
        setIsInitiating(false);
        return;
      }
      
      toast.success(`Calling ${receiverName}...`);
      
      // Wait a moment before opening call window so notification is sent
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsInCall(true);
    setIsInitiating(false);
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
        disabled={isSendingNotification || isInitiating}
      >
        {isVideoCall ? <Video className={buttonText ? "h-4 w-4 mr-2" : "h-4 w-4"} /> : <Phone className={buttonText ? "h-4 w-4 mr-2" : "h-4 w-4"} />}
        {isInitiating ? 'Calling...' : buttonText}
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
