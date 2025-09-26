
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
  const { currentConversation } = useChat();
  const webRTC = useWebRTC();
  const [callTime, setCallTime] = useState(0);
  
  // Auto-start the call when modal opens
  useEffect(() => {
    if (webRTC.callType && currentConversation && currentUser) {
      if (currentConversation.isGroupChat && currentConversation.participants) {
        // Group call - pass all participant IDs
        const participantIds = currentConversation.participants.filter(id => id !== currentUser.uid);
        webRTC.startCall(currentConversation.id, webRTC.callType, undefined, participantIds);
      } else {
        // Direct call - pass target user ID
        const targetUserId = currentConversation.participants.find(id => id !== currentUser.uid);
        if (targetUserId) {
          webRTC.startCall(currentConversation.id, webRTC.callType, targetUserId);
        }
      }
    }
  }, [webRTC.callType, currentConversation, currentUser, webRTC]);
  
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
    <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-screen flex flex-col">{/* Video Containers */}
        {/* Video Containers */}
        {webRTC.callType === 'video' && (
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
        {webRTC.callType === 'voice' && (
          <div className="bg-gradient-to-br from-primary/20 to-primary-foreground/20 backdrop-blur-lg rounded-lg shadow-xl w-full max-w-md mx-auto mt-32 p-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                {isGroup ? (
                  <div className="relative">
                    <div className="grid grid-cols-3 gap-2 max-w-[200px]">
                      {currentConversation.participantsInfo?.slice(0, 9).map((user, index) => (
                        <div key={user.uid} className="flex flex-col items-center">
                          <UserAvatar 
                            username={user.username} 
                            photoURL={user.photoURL} 
                            size="sm"
                          />
                          {index === 0 && (
                            <span className="text-xs mt-1 text-white truncate max-w-[60px]">
                              {user.displayName?.split(' ')[0] || user.username}
                            </span>
                          )}
                        </div>
                      ))}
                      {currentConversation.participantsInfo && currentConversation.participantsInfo.length > 9 && (
                        <div className="flex items-center justify-center bg-primary/50 rounded-full w-10 h-10">
                          <span className="text-xs text-white">
                            +{currentConversation.participantsInfo.length - 9}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UserAvatar 
                      username={currentConversation.participantsInfo?.[0]?.username || 'User'} 
                      photoURL={currentConversation.participantsInfo?.[0]?.photoURL}
                      size="lg"
                    />
                    <h3 className="text-xl font-medium mt-4 mb-2 text-white">
                      {currentConversation.participantsInfo?.[0]?.displayName || 
                       currentConversation.participantsInfo?.[0]?.username || 'User'}
                    </h3>
                  </div>
                )}
              </div>
              
              {isGroup && (
                <h3 className="text-xl font-medium mb-2 text-white">
                  {currentConversation.groupName || 'Group Call'} ({currentConversation.participantsInfo?.length || 0} participants)
                </h3>
              )}
              
              <p className="text-white/80 text-lg">
                {getCallStatusText()}
              </p>
            </div>
          </div>
        )}
        
        {/* Hidden video elements for voice calls (still needed for WebRTC) */}
        {webRTC.callType === 'voice' && (
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
            {webRTC.callType === 'video' && (
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
          <p className="text-sm opacity-80 flex items-center gap-2">
            {webRTC.callType === 'video' ? 'Video Call' : 'Voice Call'}
            {isGroup && <span className="bg-white/20 px-2 py-1 rounded text-xs">Group</span>}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {!isGroup && currentConversation.participantsInfo?.[0] && (
              <>
                <UserAvatar 
                  username={currentConversation.participantsInfo[0].username} 
                  photoURL={currentConversation.participantsInfo[0].photoURL}
                  size="sm"
                />
                <p className="text-lg font-medium">
                  {currentConversation.participantsInfo[0].displayName || 
                   currentConversation.participantsInfo[0].username || 'User'}
                </p>
              </>
            )}
            {isGroup && (
              <p className="text-lg font-medium">
                {currentConversation.groupName || 'Group Call'} ({currentConversation.participantsInfo?.length || 0})
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
