
import { useChat } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';
import { Phone, Video, Mic, MicOff, X, PhoneOff, VideoOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import UserAvatar from './UserAvatar';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAuth } from '@/context/AuthContext';

interface CallModalProps {
  isGroup?: boolean;
}

const CallModal: React.FC<CallModalProps> = ({ isGroup = false }) => {
  const { currentUser } = useAuth();
  const { currentConversation, endCall: chatEndCall, activeCallType } = useChat();
  const webRTC = useWebRTC();
  const [callTime, setCallTime] = useState(0);
  
  // Auto-start the call when modal opens
  useEffect(() => {
    if (activeCallType && currentConversation && currentUser) {
      const targetUserId = currentConversation.participants.find(id => id !== currentUser.uid);
      if (targetUserId) {
        webRTC.startCall(currentConversation.id, activeCallType, targetUserId);
      }
    }
  }, [activeCallType, currentConversation, currentUser, webRTC]);
  
  // Start call timer when call becomes active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (webRTC.callStatus === 'connected') {
      setCallTime(0);
      interval = setInterval(() => {
        setCallTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [webRTC.callStatus]);
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    webRTC.endCall();
    chatEndCall();
  };
  
  if (!currentConversation) return null;
  
  const getCallStatusText = () => {
    switch (webRTC.callStatus) {
      case 'calling': return 'Calling...';
      case 'ringing': return 'Ringing...';
      case 'connected': return formatTime(callTime);
      default: return 'Connecting...';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-screen flex flex-col">
        {/* Video Containers */}
        {activeCallType === 'video' && (
          <>
            {/* Remote Video (Full Screen) */}
            <video
              ref={webRTC.remoteVideoRef}
              className="w-full h-full object-cover bg-gray-900"
              autoPlay
              playsInline
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
              <video
                ref={webRTC.localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>
          </>
        )}
        
        {/* Voice Call UI */}
        {activeCallType === 'voice' && (
          <div className="bg-gradient-to-br from-primary/20 to-primary-foreground/20 backdrop-blur-lg rounded-lg shadow-xl w-full max-w-md mx-auto mt-32 p-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                {isGroup ? (
                  <div className="grid grid-cols-3 gap-2">
                    {currentConversation.participantsInfo?.slice(0, 6).map((user) => (
                      <div key={user.uid} className="flex flex-col items-center">
                        <UserAvatar username={user.username} photoURL={user.photoURL} />
                        <span className="text-xs mt-1 text-white">{user.displayName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <UserAvatar 
                    username={currentConversation.participantsInfo?.[0]?.username || 'User'} 
                    photoURL={currentConversation.participantsInfo?.[0]?.photoURL}
                    size="lg"
                  />
                )}
              </div>
              
              <h3 className="text-xl font-medium mb-2 text-white">
                {isGroup 
                  ? currentConversation.groupName 
                  : currentConversation.participantsInfo?.[0]?.displayName || 'User'}
              </h3>
              
              <p className="text-white/80 text-lg">
                {getCallStatusText()}
              </p>
            </div>
          </div>
        )}
        
        {/* Hidden video elements for voice calls (still needed for WebRTC) */}
        {activeCallType === 'voice' && (
          <>
            <video ref={webRTC.localVideoRef} style={{ display: 'none' }} autoPlay playsInline muted />
            <video ref={webRTC.remoteVideoRef} style={{ display: 'none' }} autoPlay playsInline />
          </>
        )}
        
        {/* Call Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex justify-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-4">
            {/* Mute Button */}
            <Button
              variant={webRTC.isMuted ? "destructive" : "secondary"}
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={webRTC.toggleMute}
            >
              {webRTC.isMuted ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
            
            {/* Video Toggle (only for video calls) */}
            {activeCallType === 'video' && (
              <Button
                variant={webRTC.isVideoEnabled ? "secondary" : "destructive"}
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={webRTC.toggleVideo}
              >
                {webRTC.isVideoEnabled ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <VideoOff className="h-6 w-6" />
                )}
              </Button>
            )}
            
            {/* End Call Button */}
            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600"
              onClick={handleEndCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        {/* Call Info */}
        <div className="absolute top-4 left-4 text-white">
          <p className="text-sm opacity-80">
            {activeCallType === 'video' ? 'Video Call' : 'Voice Call'}
          </p>
          <p className="text-lg font-medium">
            {isGroup 
              ? currentConversation.groupName 
              : currentConversation.participantsInfo?.[0]?.displayName || 'User'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
