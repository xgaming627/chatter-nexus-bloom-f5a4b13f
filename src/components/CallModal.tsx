import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import UserAvatar from './UserAvatar';

const CallModal: React.FC = () => {
  const webRTC = useWebRTC();
  const { currentUser } = useAuth();
  const { currentConversation, conversations } = useChat();
  const [callTime, setCallTime] = useState(0);
  const [otherUserName, setOtherUserName] = useState('Unknown User');

  // Only show modal when call is not idle
  if (webRTC.callStatus === 'idle') return null;

  // Get other user info for display
  useEffect(() => {
    if (currentConversation && !currentConversation.is_group_chat) {
      const otherUserId = currentConversation.participants.find(id => id !== currentUser?.uid);
      if (otherUserId) {
        // Try to get name from participants info first
        const participantInfo = currentConversation.participantsInfo?.find(p => p.uid === otherUserId);
        if (participantInfo) {
          setOtherUserName(participantInfo.displayName || participantInfo.username || 'Unknown User');
        }
      }
    }
  }, [currentConversation, currentUser?.uid]);

  // Timer effect for connected calls
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

  const getStatusText = () => {
    switch (webRTC.callStatus) {
      case 'initiating':
        return 'Starting call...';
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatTime(callTime);
      case 'ended':
        return 'Call ended';
      default:
        return 'Call active';
    }
  };

  const getStatusColor = () => {
    switch (webRTC.callStatus) {
      case 'connected':
        return 'text-green-500';
      case 'ended':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-background/95 backdrop-blur-lg border border-white/10"
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
            <span className="capitalize">{webRTC.callType} call</span>
          </div>

          {/* Status and Timer */}
          <div className="text-center">
            <div className={`text-2xl font-semibold mb-2 ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <div className="text-sm text-muted-foreground capitalize">
              Status: {webRTC.callStatus}
            </div>
          </div>

          {/* User Avatar and Name */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <UserAvatar 
                username={otherUserName}
                photoURL={undefined}
                size="lg"
              />
              {/* Animated ring for ringing state */}
              {webRTC.callStatus === 'ringing' && (
                <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-75" />
              )}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {otherUserName}
              </h3>
            </div>
          </div>

          {/* Video Display */}
          {webRTC.callType === 'video' && webRTC.callStatus === 'connected' && (
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

          {/* Call Controls */}
          <div className="flex items-center justify-center space-x-4">
            {/* Mute Button */}
            <Button
              variant="outline"
              size="lg"
              className="h-14 w-14 rounded-full"
              onClick={webRTC.toggleMute}
              disabled={webRTC.callStatus !== 'connected'}
            >
              {webRTC.isMuted ? (
                <MicOff className="h-6 w-6 text-red-500" />
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
                disabled={webRTC.callStatus !== 'connected'}
              >
                {webRTC.isVideoEnabled ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <VideoOff className="h-6 w-6 text-red-500" />
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

          {/* Connection Info */}
          {webRTC.callStatus === 'connecting' && (
            <div className="text-xs text-muted-foreground text-center">
              <p>Establishing secure connection...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;