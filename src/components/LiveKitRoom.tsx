import React, { useState, useEffect } from 'react';
import { LiveKitRoom as LKRoom, useParticipants, useTracks, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, MonitorUp, Minimize2, Maximize2 } from 'lucide-react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { useAuth } from '@/context/AuthContext';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import { useChat } from '@/context/ChatContext';
import { toast } from 'sonner';
import { Track } from 'livekit-client';
import UserAvatar from './UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

import VideoLoadingOverlay from './VideoLoadingOverlay';

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

const CallInterface: React.FC<{ isVideoCall: boolean; onLeave: () => void; isGroupCall?: boolean; onMinimize: () => void; isMinimized: boolean }> = ({ isVideoCall, onLeave, isGroupCall, onMinimize, isMinimized }) => {
  const participants = useParticipants();
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [hadMultipleParticipants, setHadMultipleParticipants] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(!isVideoCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [focusedParticipantId, setFocusedParticipantId] = useState<string | null>(null);
  const [videoLoadingStates, setVideoLoadingStates] = useState<Record<string, boolean>>({});
  
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
  
  // Track if we've ever had multiple participants
  useEffect(() => {
    if (participants.length >= 2) {
      setHadMultipleParticipants(true);
    }
  }, [participants.length]);
  
  // End call if someone leaves a 1-on-1 call
  useEffect(() => {
    if (!isGroupCall && hadMultipleParticipants && participants.length === 1) {
      toast.info('The other participant has left the call');
      onLeave();
    }
  }, [participants.length, isGroupCall, hadMultipleParticipants, onLeave]);
  
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare]);

  const toggleMute = async () => {
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!enabled);
      setIsMuted(!enabled);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      const enabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!enabled);
      setIsCameraOff(!enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant) return;
    
    try {
      // Check if user has Nexus Plus for 1080p
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nexus_plus_active')
        .eq('user_id', localParticipant.identity)
        .single();
      
      const hasNexusPlus = profileData?.nexus_plus_active || false;
      const maxResolution = hasNexusPlus ? 1920 : 1280; // 1080p vs 720p
      
      const enabled = localParticipant.isScreenShareEnabled;
      
      if (!enabled) {
        // Start screen sharing with resolution limit
        await localParticipant.setScreenShareEnabled(true);
        toast.info(`Screen sharing started ${hasNexusPlus ? '(1080p)' : '(720p)'}`);
      } else {
        await localParticipant.setScreenShareEnabled(false);
        toast.info('Screen sharing stopped');
      }
      
      setIsScreenSharing(!enabled);
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to toggle screen sharing');
    }
  };
  
  if (isMinimized) {
    return (
      <div className="h-full w-full bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Video className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Call in progress</p>
          <p className="text-xs text-muted-foreground">{participants.length} participant{participants.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="flex-1 grid gap-4 p-4 overflow-auto" style={{
        gridTemplateColumns: participants.length === 1 ? '1fr' : participants.length === 2 ? 'repeat(2, 1fr)' : participants.length === 3 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))'
      }}>
        {participants.map((participant) => {
          const profile = profiles[participant.identity];
          const videoTrack = tracks.find(t => 
            t.participant.identity === participant.identity && 
            (t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare)
          );
          const audioTrack = tracks.find(t =>
            t.participant.identity === participant.identity &&
            t.source === Track.Source.Microphone
          );
          
          return (
            <div 
              key={participant.identity} 
              className={cn(
                "rounded-lg overflow-hidden bg-muted relative aspect-video cursor-pointer transition-all hover:ring-2 hover:ring-primary",
                focusedParticipantId === participant.identity && "ring-4 ring-primary"
              )}
              onClick={() => setFocusedParticipantId(
                focusedParticipantId === participant.identity ? null : participant.identity
              )}
            >
              {videoLoadingStates[participant.identity] && (
                <VideoLoadingOverlay isLoading={true} />
              )}
              {videoTrack?.publication?.track ? (
                <video
                  ref={(el) => {
                    if (el && videoTrack.publication?.track) {
                      videoTrack.publication.track.attach(el);
                      
                      // Track video loading state
                      el.addEventListener('waiting', () => {
                        setVideoLoadingStates(prev => ({
                          ...prev,
                          [participant.identity]: true
                        }));
                      });
                      
                      el.addEventListener('playing', () => {
                        setVideoLoadingStates(prev => ({
                          ...prev,
                          [participant.identity]: false
                        }));
                      });
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
              {audioTrack?.publication?.track && (
                <audio
                  ref={(el) => {
                    if (el && audioTrack.publication?.track) {
                      audioTrack.publication.track.attach(el);
                    }
                  }}
                  autoPlay
                />
              )}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-full">
                <div className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  participant.isSpeaking ? "bg-green-500 animate-pulse scale-125" : "bg-muted-foreground"
                )} />
                {participant.isMicrophoneEnabled === false && (
                  <MicOff className="w-3 h-3 text-red-500" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {profile?.username || participant.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 flex justify-center gap-3 bg-background border-t">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          onClick={toggleMute}
          className="rounded-full"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={isCameraOff ? "destructive" : "secondary"}
          size="lg"
          onClick={toggleCamera}
          className="rounded-full"
        >
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="lg"
          onClick={toggleScreenShare}
          className="rounded-full"
        >
          <MonitorUp className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="lg"
          onClick={onMinimize}
          className="rounded-full"
        >
          {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
        </Button>
        
        <Button
          variant="destructive"
          size="lg"
          onClick={onLeave}
          className="rounded-full"
        >
          <PhoneOff className="h-5 w-5" />
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
  const { sendMessage, currentConversation } = useChat();
  const { currentUser } = useAuth();
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callStarted, setCallStarted] = useState(false);

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

  useEffect(() => {
    if (!isConnecting && token && !callStarted && currentConversation) {
      setCallStarted(true);
      // Send system message that call started from Nexus Chat
      const systemMessage = {
        conversation_id: currentConversation.id,
        sender_id: '00000000-0000-0000-0000-000000000000', // System UUID
        content: `🎥 ${isVideoCall ? 'Video' : 'Voice'} call started`,
        is_system_message: true
      };
      
      supabase.from('messages').insert(systemMessage);
    }
  }, [isConnecting, token, callStarted, currentConversation, isVideoCall]);

  const handleLeave = () => {
    if (currentConversation && callStarted) {
      // Send system message that call ended from Nexus Chat
      const systemMessage = {
        conversation_id: currentConversation.id,
        sender_id: '00000000-0000-0000-0000-000000000000', // System UUID
        content: `📞 ${isVideoCall ? 'Video' : 'Voice'} call ended`,
        is_system_message: true
      };
      
      supabase.from('messages').insert(systemMessage);
    }
    onLeave();
  };

  if (isConnecting || !token || !serverUrl) {
    return (
      <div className={cn(
        "fixed bg-background border shadow-lg rounded-lg overflow-hidden z-50",
        isMinimized ? "bottom-4 right-4 w-80 h-24" : "bottom-4 right-4 w-96 h-[500px]"
      )}>
        <div className="flex items-center justify-center h-full p-8">
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Connecting to call...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed bg-background border shadow-lg overflow-hidden z-50 transition-all duration-300",
      isMinimized 
        ? "bottom-4 right-4 w-80 h-32 rounded-lg" 
        : isFullscreen 
        ? "inset-0 w-full h-full rounded-none" 
        : "bottom-4 right-4 w-[min(90vw,900px)] h-[min(85vh,700px)] rounded-lg"
    )}>
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="bg-background/80 backdrop-blur-sm"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMinimized(!isMinimized)}
          className="bg-background/80 backdrop-blur-sm"
          title={isMinimized ? "Restore" : "Minimize"}
        >
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLeave}
          className="bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
          title="End call"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
      
      <LKRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={isVideoCall}
        audio={true}
        onDisconnected={handleLeave}
        onError={(error) => {
          console.error('LiveKit connection error:', error);
          toast.error(`Connection failed: ${error.message}`);
          handleLeave();
        }}
        className="h-full"
      >
        <CallInterface 
          isVideoCall={isVideoCall} 
          onLeave={handleLeave} 
          isGroupCall={isGroupCall}
          onMinimize={() => setIsMinimized(!isMinimized)}
          isMinimized={isMinimized}
        />
      </LKRoom>
    </div>
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
