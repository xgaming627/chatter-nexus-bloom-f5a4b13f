import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export const useCallNotifications = () => {
  const { currentUser } = useAuth();
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const sendCallNotification = useCallback(async (
    receiverId: string,
    receiverName: string,
    receiverPhoto: string | undefined,
    roomName: string,
    isVideoCall: boolean
  ) => {
    if (!currentUser) {
      toast.error('You must be logged in to make a call');
      return null;
    }

    setIsSendingNotification(true);
    try {
      const { data, error } = await supabase
        .from('call_notifications')
        .insert({
          caller_id: currentUser.uid,
          caller_name: currentUser.displayName || currentUser.email || 'User',
          caller_photo: currentUser.photoURL,
          receiver_id: receiverId,
          receiver_name: receiverName,
          receiver_photo: receiverPhoto,
          room_name: roomName,
          is_video_call: isVideoCall,
          status: 'ringing'
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error sending call notification:', error);
      toast.error('Failed to send call notification');
      return null;
    } finally {
      setIsSendingNotification(false);
    }
  }, [currentUser]);

  return {
    sendCallNotification,
    isSendingNotification
  };
};
