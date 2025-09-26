import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import UserAvatar from './UserAvatar';

const IncomingCallDialog: React.FC = () => {
  const webRTC = useWebRTC();
  
  if (!webRTC.incomingCall) return null;
  
  const { roomId, callerName, callType } = webRTC.incomingCall;
  
  const handleAnswer = () => {
    webRTC.answerCall(roomId);
  };
  
  const handleDecline = () => {
    // Just clear the incoming call notification
    // The caller will get a timeout/failed connection
    webRTC.endCall();
  };
  
  return (
    <Dialog open={!!webRTC.incomingCall}>
      <DialogContent className="max-w-md">
        <div className="text-center py-6">
          <div className="mb-6">
            <UserAvatar username={callerName} size="lg" />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">
            Incoming {callType} call
          </h3>
          
          <p className="text-muted-foreground mb-8">
            {callerName} is calling you
          </p>
          
          <div className="flex justify-center space-x-8">
            {/* Decline Button */}
            <Button
              variant="destructive"
              size="icon"
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
              onClick={handleDecline}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            
            {/* Answer Button */}
            <Button
              variant="default"
              size="icon"
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
              onClick={handleAnswer}
            >
              {callType === 'video' ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;