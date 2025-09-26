import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCustomCall } from '@/hooks/useCustomCall';
import UserAvatar from './UserAvatar';

const IncomingCallDialog: React.FC = () => {
  const customCall = useCustomCall();

  if (!customCall.incomingCall) return null;

  const { callerName, callType } = customCall.incomingCall;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-background/95 backdrop-blur-lg border border-white/10"
        style={{ zIndex: 10000 }}
      >
        <div className="flex flex-col items-center space-y-6 p-6">
          {/* Call Type Header */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {callType === 'video' ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            <span>Incoming {callType} call</span>
          </div>

          {/* Caller Avatar and Name */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <UserAvatar 
                username={callerName} 
                photoURL={undefined}
                size="lg"
              />
              {/* Animated ring effect */}
              <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-75" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {callerName}
              </h3>
              <p className="text-sm text-muted-foreground">
                is calling you
              </p>
            </div>
          </div>

          {/* Call Actions */}
          <div className="flex space-x-4 w-full">
            {/* Decline Button */}
            <Button
              variant="destructive"
              size="lg"
              className="flex-1 h-14 rounded-full"
              onClick={customCall.declineCall}
            >
              <PhoneOff className="h-6 w-6 mr-2" />
              Decline
            </Button>

            {/* Accept Button */}
            <Button
              variant="default"
              size="lg"
              className="flex-1 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white"
              onClick={customCall.answerCall}
            >
              <Phone className="h-6 w-6 mr-2" />
              Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;