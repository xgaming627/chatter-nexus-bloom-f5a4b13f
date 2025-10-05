import React, { useState, useEffect, useRef } from 'react';
import { LiveKitRoom as LKRoom, useParticipants, useTracks, useLocalParticipant, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, MonitorUp, Minimize2, Maximize2, Crown } from 'lucide-react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { useAuth } from '@/context/AuthContext';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import { useChat } from '@/context/ChatContext';
import { toast } from 'sonner';
import { Track, LocalParticipant } from 'livekit-client';
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
  nexus_plus_active?: boolean;
}

const screenShareSound = new Audio('/notification-sound.mp3');

const CallInterface: React.FC<{ 
  isVideoCall: boolean; 
  onLeave: () => void; 
  isGroupCall?: boolean; 
  onMinimize: () => void; 
  isMinimized: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}> = ({ isVideoCall, onLeave, isGroupCall, onMinimize, isMinimized, onToggleFullscreen, isFullscreen }) => {
  const participants = useParticipants();
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [hadMultipleParticipants, setHadMultipleParticipants] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(!isVideoCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [focusedParticipantId, setFocusedParticipantId] = useState<string | null>(null);
  const [videoLoadingStates, setVideoLoadingStates] = useState<Record<string, boolean>>({});
  const [screenShareSoundPlayed, setScreenShareSoundPlayed] = useState<Record<string, boolean>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize AudioContext on user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        console.log('AudioContext initialized');
      }
    };
    
    window.addEventListener('click', initAudioContext, { once: true });
    return () => window.removeEventListener('click', initAudioContext);
  }, []);

  useEffect(() => {
    const fetchProfiles = async () => {
      const userIds = participants.map(p => p.identity);
      if (userIds.length === 0) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, photo_url, nexus_plus_active')
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
  
  useEffect(() => {
    if (participants.length >= 2) {
      setHadMultipleParticipants(true);
    }
  }, [participants.length]);
  
  useEffect(() => {
    if (!isGroupCall && hadMultipleParticipants && participants.length === 1) {
      toast.info('The other participant has left the call');
      onLeave();
    }
  }, [participants.length, isGroupCall, hadMultipleParticipants, onLeave]);
  
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare]);

  // Monitor screen sharing and play sound for all participants
  useEffect(() => {
    const screenShareTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);
    
    screenShareTracks.forEach((track) => {
      const participantId = track.participant.identity;
      if (!screenShareSoundPlayed[participantId]) {
        screenShareSound.play().catch(e => console.log('Could not play sound:', e));
        setScreenShareSoundPlayed(prev => ({ ...prev, [participantId]: true }));
        
        if (participantId !== localParticipant?.identity) {
          const profile = profiles[participantId];
          toast.info(`${profile?.username || 'Someone'} is sharing their screen`);
        }
      }
    });
    
    // Clean up played state when screen sharing stops
    const activeScreenShareIds = screenShareTracks.map(t => t.participant.identity);
    setScreenShareSoundPlayed(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(id => {
        if (!activeScreenShareIds.includes(id)) {
          delete newState[id];
        }
      });
      return newState;
    });
  }, [tracks, localParticipant, profiles, screenShareSoundPlayed]);

  const toggleMute = async () => {
    if (!localParticipant) return;
    try {
      const currentlyEnabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!currentlyEnabled);
      setIsMuted(currentlyEnabled);
      console.log('Microphone toggled:', !currentlyEnabled ? 'unmuted' : 'muted');
    } catch (error) {
      console.error('Error toggling microphone:', error);
      toast.error('Failed to toggle microphone');
    }
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    try {
      const currentlyEnabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!currentlyEnabled);
      setIsCameraOff(currentlyEnabled);
      console.log('Camera toggled:', !currentlyEnabled ? 'on' : 'off');
    } catch (error) {
      console.error('Error toggling camera:', error);
      toast.error('Failed to toggle camera');
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant) return;
    
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nexus_plus_active')
        .eq('user_id', localParticipant.identity)
        .single();
      
      const hasNexusPlus = profileData?.nexus_plus_active || false;
      const currentlySharing = localParticipant.isScreenShareEnabled;
      
      if (!currentlySharing) {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true
        });
        setIsScreenSharing(true);
        toast.success(`Screen sharing started ${hasNexusPlus ? '(1080p)' : '(720p)'}`);
      } else {
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        toast.info('Screen sharing stopped');
      }
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
      <RoomAudioRenderer />
      <div className="flex-1 grid gap-4 p-4 overflow-auto" style={{
        gridTemplateColumns: participants.length === 1 ? '1fr' : 
                           participants.length === 2 ? 'repeat(2, 1fr)' : 
                           'repeat(auto-fit, minmax(250px, 1fr))'
      }}>
        {participants.map((participant) => {
          const profile = profiles[participant.identity];
          const videoTrack = tracks.find(t => 
            t.participant.identity === participant.identity && 
            t.source === Track.Source.Camera
          );
          const screenShareTrack = tracks.find(t =>
            t.participant.identity === participant.identity &&
            t.source === Track.Source.ScreenShare
          );
          
          // Don't render audio tracks for local participant to avoid echo
          const shouldRenderAudio = participant.identity !== localParticipant?.identity;
          const audioTrack = shouldRenderAudio ? tracks.find(t =>
            t.participant.identity === participant.identity &&
            t.source === Track.Source.Microphone
          ) : null;
          
          const hasNexusPlus = profile?.nexus_plus_active || false;
          
          return (
            <React.Fragment key={participant.identity}>
              {/* Main camera/avatar view */}
              <div 
                className={cn(
                  "rounded-lg overflow-hidden bg-muted relative aspect-video cursor-pointer transition-all hover:ring-2 hover:ring-primary",
                  focusedParticipantId === participant.identity && "ring-4 ring-primary",
                  isFullscreen && focusedParticipantId === participant.identity && "col-span-full row-span-full"
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
                    muted={participant.identity === localParticipant?.identity}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                    <UserAvatar
                      username={profile?.username || participant.name}
                      photoURL={profile?.photo_url}
                      size="xl"
                    />
                    <p className="mt-4 text-foreground font-medium flex items-center gap-2">
                      {hasNexusPlus && <Crown className="h-4 w-4 text-yellow-500" />}
                      <span className={cn(hasNexusPlus && "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500")}>
                        {profile?.username || participant.name}
                      </span>
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
                  {hasNexusPlus && <Crown className="w-3 h-3 text-yellow-500" />}
                  <span className={cn(
                    "text-sm font-medium",
                    hasNexusPlus ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500" : "text-foreground"
                  )}>
                    {profile?.username || participant.name}
                  </span>
                </div>
              </div>
              
              {/* Screen share view */}
              {screenShareTrack?.publication?.track && (
                <div 
                  className="rounded-lg overflow-hidden bg-black relative aspect-video col-span-full"
                  onClick={() => setFocusedParticipantId(
                    focusedParticipantId === `${participant.identity}-screen` ? null : `${participant.identity}-screen`
                  )}
                >
                  <video
                    ref={(el) => {
                      if (el && screenShareTrack.publication?.track) {
                        screenShareTrack.publication.track.attach(el);
                      }
                    }}
                    className="w-full h-full object-contain"
                    autoPlay
                    playsInline
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-full">
                    <MonitorUp className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {profile?.username || participant.name}'s screen
                    </span>
                  </div>
                </div>
              )}
            </React.Fragment>
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
        
        {isVideoCall && (
          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleCamera}
            className="rounded-full"
          >
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
        )}
        
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
          onClick={onToggleFullscreen}
          className="rounded-full"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
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
  const { currentConversation } = useChat();
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
      const systemMessage = {
        conversation_id: currentConversation.id,
        sender_id: '00000000-0000-0000-0000-000000000000',
        content: `🎥 ${isVideoCall ? 'Video' : 'Voice'} call started`,
        is_system_message: true
      };
      
      supabase.from('messages').insert(systemMessage);

      // Send notification to all group members if it's a group call
      if (isGroupCall && currentConversation.participants) {
        currentConversation.participants.forEach(async (participantId) => {
          if (participantId !== currentUser?.uid) {
            await supabase.from('notifications').insert({
              user_id: participantId,
              type: 'call',
              title: 'Group Call Started',
              message: `${currentUser?.displayName || 'Someone'} started a ${isVideoCall ? 'video' : 'voice'} call in ${currentConversation.group_name || 'group chat'}`,
              is_sound_enabled: true,
              metadata: { 
                conversation_id: currentConversation.id,
                room_name: roomName,
                is_video_call: isVideoCall 
              }
            });
          }
        });
      }
    }
  }, [isConnecting, token, callStarted, currentConversation, isVideoCall, isGroupCall, currentUser, roomName]);

  const handleLeave = () => {
    if (currentConversation && callStarted) {
      const systemMessage = {
        conversation_id: currentConversation.id,
        sender_id: '00000000-0000-0000-0000-000000000000',
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
        "bottom-4 right-4 w-96 h-32"
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
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          isFullscreen={isFullscreen}
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
    if (isInitiating) return;
    
    setIsInitiating(true);
    
    if (receiverId && receiverName && !isGroupCall) {
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
        className={className}
        onClick={startCall}
        disabled={isInitiating || isSendingNotification}
      >
        {isInitiating || isSendingNotification ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            Calling...
          </>
        ) : (
          <>
            {isVideoCall ? <Video className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
            {buttonText || (isVideoCall ? '' : '')}
          </>
        )}
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
