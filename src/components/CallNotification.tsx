import React, { useEffect, useState } from 'react';
import { Phone, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import UserAvatar from './UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface CallNotificationProps {
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  roomName: string;
  isVideoCall: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const CallNotification: React.FC<CallNotificationProps> = ({
  callerId,
  callerName,
  callerPhoto,
  roomName,
  isVideoCall,
  onAccept,
  onDecline
}) => {
  const [audio] = useState(() => new Audio('/notification-sound.mp3'));

  useEffect(() => {
    // Play notification sound
    audio.play().catch(e => console.log('Could not play notification sound:', e));

    // Auto-decline after 1 minute
    const timeout = setTimeout(() => {
      onDecline();
      toast.info('Call missed');
    }, 60000);

    return () => {
      clearTimeout(timeout);
      audio.pause();
    };
  }, [audio, onDecline]);

  return (
    <Card className="fixed top-4 right-4 z-50 w-96 shadow-lg animate-in slide-in-from-top">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserAvatar username={callerName} photoURL={callerPhoto} />
            <div>
              <p className="font-semibold">{callerName}</p>
              <p className="text-sm text-muted-foreground">
                Incoming {isVideoCall ? 'video' : 'voice'} call...
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            className="flex-1 bg-green-500 hover:bg-green-600" 
            onClick={onAccept}
          >
            {isVideoCall ? <Video className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
            Accept
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={onDecline}
          >
            <X className="h-4 w-4 mr-2" />
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface CallNotificationsManagerProps {
  onAcceptCall: (roomName: string, isVideoCall: boolean) => void;
}

export const CallNotificationsManager: React.FC<CallNotificationsManagerProps> = ({
  onAcceptCall
}) => {
  const { currentUser } = useAuth();
  const [incomingCalls, setIncomingCalls] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to call notifications
    const channel = supabase
      .channel('call_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_notifications',
          filter: `receiver_id=eq.${currentUser.uid}`
        },
        (payload) => {
          const notification = payload.new;
          if (notification.status === 'ringing') {
            setIncomingCalls(prev => [...prev, notification]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_notifications',
          filter: `receiver_id=eq.${currentUser.uid}`
        },
        (payload) => {
          const notification = payload.new;
          // Remove call if it was declined or accepted
          if (notification.status !== 'ringing') {
            setIncomingCalls(prev => prev.filter(call => call.id !== notification.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const handleAcceptCall = async (callNotification: any) => {
    try {
      // Update call status
      await supabase
        .from('call_notifications')
        .update({ status: 'accepted' })
        .eq('id', callNotification.id);

      // Remove from local state
      setIncomingCalls(prev => prev.filter(call => call.id !== callNotification.id));

      // Join the call
      onAcceptCall(callNotification.room_name, callNotification.is_video_call);
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
    }
  };

  const handleDeclineCall = async (callNotification: any) => {
    try {
      // Update call status
      await supabase
        .from('call_notifications')
        .update({ status: 'declined' })
        .eq('id', callNotification.id);

      // Remove from local state
      setIncomingCalls(prev => prev.filter(call => call.id !== callNotification.id));

      toast.info('Call declined');
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  return (
    <>
      {incomingCalls.map(call => (
        <CallNotification
          key={call.id}
          callerId={call.caller_id}
          callerName={call.caller_name}
          callerPhoto={call.caller_photo}
          roomName={call.room_name}
          isVideoCall={call.is_video_call}
          onAccept={() => handleAcceptCall(call)}
          onDecline={() => handleDeclineCall(call)}
        />
      ))}
    </>
  );
};
