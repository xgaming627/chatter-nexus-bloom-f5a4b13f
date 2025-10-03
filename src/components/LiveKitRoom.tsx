import React, { useState, useEffect } from 'react';
import { LiveKitRoom as LKRoom, useParticipants, useTracks } from '@livekit/components-react';
import '@livekit/components-styles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { useAuth } from '@/context/AuthContext';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import { toast } from 'sonner';
import { Track } from 'livekit-client';
import UserAvatar from './UserAvatar';
import { supabase } from '@/integrations/supabase/client';

interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  isVideoCall: boolean;
  onLeave: () => void;
  isGroupCall?: boolean;
}

interface UserProfile {
  user_id: string;
  username: string;
  photo_url?: string;
}

const CallInterface: React.FC<{ isVideoCall: boolean; onLeave: () => void; isGroupCall?: boolean }> = ({ isVideoCall, onLeave, isGroupCall }) => {
  const participants = useParticipants();
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  
  useEffect(() => {
    const fetchProfiles = async () => {
      const userIds = participants.map(p => p.identity);
      if (userIds.length === 0) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, photo_url')
        .in('user_id', userIds);
      
      if (data) {
        const profileMap: Record<string, UserProfile> = {};
        data.forEach(profile => {
          profileMap[profile.user_id] = profile;
        });
        setProfiles(profileMap);
      }
    };
    
    fetchProfiles();
  }, [participants]);
  
  // End call if only 1 participant left in non-group calls
  useEffect(() => {
    if (!isGroupCall && participants.length === 1) {
      toast.info('The other participant has left the call');
      onLeave();
    }
  }, [participants.length, isGroupCall, onLeave]);
  
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="flex-1 grid gap-4 p-4" style={{
        gridTemplateColumns: participants.length === 1 ? '1fr' : participants.length === 2 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(300px, 1fr))'
      }}>
        {participants.map((participant) => {
          const profile = profiles[participant.identity];
          const videoTrack = tracks.find(t => 
            t.participant.identity === participant.identity && 
            t.source === Track.Source.Camera
          );
          
          return (
            <div key={participant.identity} className="rounded-lg overflow-hidden bg-muted relative aspect-video">
              {videoTrack ? (
                <video
                  ref={(el) => {
                    if (el && videoTrack.publication?.track) {
                      videoTrack.publication.track.attach(el);
                    }
                  }}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                  <UserAvatar
                    username={profile?.username || participant.name}
                    photoURL={profile?.photo_url}
                    size="xl"
                  />
                  <p className="mt-4 text-foreground font-medium">
                    {profile?.username || participant.name}
                  </p>
                </div>
              )}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-full">
                <div className={`w-2 h-2 rounded-full transition-colors ${participant.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-sm font-medium text-foreground">
                  {profile?.username || participant.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 flex justify-center gap-4 bg-background border-t">
        <Button
          variant="destructive"
          size="lg"
          onClick={onLeave}
          className="rounded-full"
        >
          <PhoneOff className="h-5 w-5 mr-2" />
          End Call
        </Button>
      </div>
    </div>
  );
};

export const LiveKitRoom: React.FC<LiveKitRoomProps> = ({
  roomName,
  participantName,
  isVideoCall,
  onLeave,
  isGroupCall = false
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
          <CallInterface isVideoCall={isVideoCall} onLeave={onLeave} isGroupCall={isGroupCall} />
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
  isGroupCall?: boolean;
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
  receiverPhoto,
  isGroupCall = false
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
          isGroupCall={isGroupCall}
        />
      )}
    </>
  );
};
