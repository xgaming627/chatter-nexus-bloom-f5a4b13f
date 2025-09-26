import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useRealCall } from '@/hooks/useRealCall';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import UserAvatar from './UserAvatar';

const CallModal: React.FC = () => {
  const realCall = useRealCall();
  const { currentUser } = useAuth();
  const { currentConversation } = useChat();
  const [callTime, setCallTime] = useState(0);
  const [otherUserName, setOtherUserName] = useState('Unknown User');

  console.log('🎯 CallModal rendered, callStatus:', realCall.callStatus);

  // Only show modal when call is not idle
  if (realCall.callStatus === 'idle') {
    console.log('💤 CallModal hidden - call status is idle');
    return null;
  }

  console.log('📱 CallModal showing - call status:', realCall.callStatus);

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
    if (realCall.callStatus === 'connected') {
      const timer = setInterval(() => {
        setCallTime(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setCallTime(0);
    }
  }, [realCall.callStatus]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (realCall.callStatus) {
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
    switch (realCall.callStatus) {
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
            {realCall.callType === 'video' ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            <span className="capitalize">{realCall.callType} call</span>
          </div>

          {/* Status and Timer */}
          <div className="text-center">
            <div className={`text-2xl font-semibold mb-2 ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <div className="text-sm text-muted-foreground capitalize">
              Status: {realCall.callStatus}
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
              {realCall.callStatus === 'ringing' && (
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
          {realCall.callType === 'video' && realCall.callStatus === 'connected' && (
            <div className="relative w-full max-w-md aspect-video bg-muted rounded-lg overflow-hidden">
              {/* Remote Video */}
              <video
                ref={realCall.remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local Video (Picture-in-Picture) */}
              <div className="absolute top-4 right-4 w-24 h-18 bg-muted rounded overflow-hidden border-2 border-white">
                <video
                  ref={realCall.localVideoRef}
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
              onClick={realCall.toggleMute}
              disabled={realCall.callStatus !== 'connected'}
            >
              {realCall.isMuted ? (
                <MicOff className="h-6 w-6 text-red-500" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>

            {/* Video Toggle (only for video calls) */}
            {realCall.callType === 'video' && (
              <Button
                variant="outline"
                size="lg"
                className="h-14 w-14 rounded-full"
                onClick={realCall.toggleVideo}
                disabled={realCall.callStatus !== 'connected'}
              >
                {realCall.isVideoEnabled ? (
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
              onClick={realCall.endCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>

          {/* Connection Info */}
          {realCall.callStatus === 'connecting' && (
            <div className="text-xs text-muted-foreground text-center">
              <p>Establishing connection...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;