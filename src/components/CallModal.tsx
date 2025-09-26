import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import UserAvatar from './UserAvatar';

const CallModal: React.FC = () => {
  const webRTC = useWebRTC();
  const { currentUser } = useAuth();
  const { currentConversation, conversations } = useChat();
  const [callTime, setCallTime] = useState(0);

  // Only show modal when call is active
  if (!webRTC.isCallActive) return null;

  // Get conversation participants for display
  const conversation = conversations.find(c => c.id === currentConversation?.id);
  const participants = conversation?.participants.filter(p => p !== currentUser?.uid) || [];
  
  // Timer effect
  useEffect(() => {
    if (webRTC.callStatus === 'connected') {
      const timer = setInterval(() => {
        setCallTime(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setCallTime(0);
    }
  }, [webRTC.callStatus]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-2xl bg-background/95 backdrop-blur-lg border border-white/10"
        style={{ zIndex: 9999 }}
      >
        <div className="flex flex-col items-center space-y-6 p-6">
          {/* Call Header */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {webRTC.callType === 'video' ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            <span>{webRTC.callType} call</span>
            {participants.length > 1 && (
              <>
                <Users className="h-4 w-4 ml-2" />
                <span>Group</span>
              </>
            )}
          </div>

          {/* Call Status and Timer */}
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground mb-2">
              {webRTC.callStatus === 'connected' ? formatTime(callTime) : 
               webRTC.callStatus === 'ringing' ? 'Ringing...' :
               webRTC.callStatus === 'initiating' ? 'Connecting...' : 'Call Active'}
            </div>
            <div className="text-sm text-muted-foreground capitalize">
              {webRTC.callStatus}
            </div>
          </div>

          {/* Video Display */}
          {webRTC.callType === 'video' && (
            <div className="relative w-full max-w-md aspect-video bg-muted rounded-lg overflow-hidden">
              {/* Remote Video */}
              <video
                ref={webRTC.remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local Video (Picture-in-Picture) */}
              <div className="absolute top-4 right-4 w-24 h-18 bg-muted rounded overflow-hidden border-2 border-white">
                <video
                  ref={webRTC.localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Voice Call Participants */}
          {webRTC.callType === 'voice' && (
            <div className="flex flex-wrap justify-center gap-4">
              {participants.slice(0, 3).map((participantId) => (
                <div key={participantId} className="flex flex-col items-center space-y-2">
                  <UserAvatar 
                    username={`User ${participantId.slice(0, 8)}`}
                    photoURL={undefined}
                    size="lg"
                  />
                  <span className="text-sm font-medium text-foreground">
                    User {participantId.slice(0, 8)}
                  </span>
                </div>
              ))}
              
              {participants.length > 3 && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">+{participants.length - 3}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">others</span>
                </div>
              )}
            </div>
          )}

          {/* Call Controls */}
          <div className="flex items-center space-x-4">
            {/* Mute Button */}
            <Button
              variant="outline"
              size="lg"
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
                variant="outline"
                size="lg"
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
              size="lg"
              className="h-14 w-14 rounded-full"
              onClick={webRTC.endCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;