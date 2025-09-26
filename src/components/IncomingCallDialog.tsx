import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, VideoOff, Users } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import UserAvatar from './UserAvatar';
import { cn } from '@/lib/utils';

const IncomingCallDialog: React.FC = () => {
  const webRTC = useWebRTC();
  
  if (!webRTC.incomingCall) return null;
  
  const { roomId, callerName, callType, isGroupCall } = webRTC.incomingCall;
  
  const handleAnswer = () => {
    webRTC.answerCall(roomId);
  };
  
  const handleDecline = () => {
    // Just clear the incoming call notification
    // The caller will get a timeout/failed connection
    webRTC.endCall();
  };
  
  return (
    <Dialog open={!!webRTC.incomingCall} onOpenChange={() => handleDecline()}>
      <DialogContent 
        className="sm:max-w-md bg-gradient-to-br from-primary/10 to-background border-primary/20 animate-pulse fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <UserAvatar username={callerName} size="lg" />
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2">
                {callType === 'video' ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </div>
              {isGroupCall && (
                <div className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full p-1">
                  <Users className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
          
          <div>
            <DialogTitle className="text-xl font-semibold mb-2">
              Incoming {isGroupCall ? 'group ' : ''}{callType} call
            </DialogTitle>
            <p className="text-lg text-muted-foreground">
              {isGroupCall ? `${callerName} is starting a group call` : `${callerName} is calling you`}
            </p>
          </div>
        </DialogHeader>

        <DialogFooter className="flex flex-row justify-center gap-8 mt-6">
          <Button
            variant="destructive"
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center",
              "bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            )}
            onClick={handleDecline}
          >
            <PhoneOff className="h-8 w-8" />
          </Button>
          
          <Button
            variant="default"
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center",
              "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            )}
            onClick={handleAnswer}
          >
            {callType === 'video' ? (
              <Video className="h-8 w-8" />
            ) : (
              <Phone className="h-8 w-8" />
            )}
          </Button>
        </DialogFooter>
        
        <div className="text-center text-sm text-muted-foreground mt-4">
          {isGroupCall ? 'Join the group call' : 'Swipe to decline • Tap to answer'}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;