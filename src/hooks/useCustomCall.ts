import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type CallStatus = 'idle' | 'initiating' | 'ringing' | 'connecting' | 'connected' | 'ended';
export type CallType = 'voice' | 'video';

interface IncomingCall {
  roomId: string;
  callerName: string;
  callType: CallType;
  callerId: string;
}

interface CustomCallHook {
  callStatus: CallStatus;
  callType: CallType;
  isMuted: boolean;
  isVideoEnabled: boolean;
  incomingCall: IncomingCall | null;
  startCall: (targetUserId: string, type: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

export const useCustomCall = (): CustomCallHook => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const currentRoomIdRef = useRef<string | null>(null);
  const ringToneRef = useRef<HTMLAudioElement | null>(null);

  // State
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType>('voice');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // Initialize audio elements
  useEffect(() => {
    ringToneRef.current = new Audio('/notification-sound.mp3');
    ringToneRef.current.loop = true;
    ringToneRef.current.volume = 0.5;
  }, []);

  // Clean up function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up call resources');
    
    // Stop ring tone
    if (ringToneRef.current) {
      ringToneRef.current.pause();
      ringToneRef.current.currentTime = 0;
    }

    // Reset state
    currentRoomIdRef.current = null;
    setCallStatus('idle');
    setIsMuted(false);
    setIsVideoEnabled(false);
  }, []);

  // Start call
  const startCall = useCallback(async (targetUserId: string, type: CallType) => {
    if (!currentUser?.uid) {
      console.log('❌ No current user');
      return;
    }

    console.log(`📞 Starting ${type} call to:`, targetUserId);

    try {
      setCallStatus('initiating');
      setCallType(type);
      setIsVideoEnabled(type === 'video');

      // Create room ID
      const roomId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      currentRoomIdRef.current = roomId;

      console.log('💾 Saving call room to database');
      // Save call to database
      const { error } = await supabase.from('call_rooms').insert({
        room_id: roomId,
        caller_id: currentUser.uid,
        callee_id: targetUserId,
        call_type: type,
        status: 'ringing'
      });

      if (error) {
        console.error('❌ Failed to create call room:', error);
        throw error;
      }

      setCallStatus('ringing');
      
      // Play ring tone
      if (ringToneRef.current) {
        ringToneRef.current.play().catch(console.error);
      }

      console.log('✅ Call initiated successfully');

    } catch (error) {
      console.error('❌ Failed to start call:', error);
      toast({
        title: "Call Failed",
        description: error instanceof Error ? error.message : "Failed to initiate call",
        variant: "destructive"
      });
      cleanup();
    }
  }, [currentUser?.uid, cleanup, toast]);

  // Answer call
  const answerCall = useCallback(async () => {
    if (!currentUser?.uid || !incomingCall) {
      console.log('❌ Cannot answer call - missing user or incoming call');
      return;
    }

    console.log('📞 Answering call:', incomingCall.roomId);

    try {
      setCallStatus('connecting');
      setCallType(incomingCall.callType);
      setIsVideoEnabled(incomingCall.callType === 'video');

      currentRoomIdRef.current = incomingCall.roomId;

      // Update call status in database
      await supabase.from('call_rooms')
        .update({ status: 'connected' })
        .eq('room_id', incomingCall.roomId);

      // Stop ring tone
      if (ringToneRef.current) {
        ringToneRef.current.pause();
        ringToneRef.current.currentTime = 0;
      }

      setIncomingCall(null);
      
      // Simulate connection delay
      setTimeout(() => {
        setCallStatus('connected');
        toast({
          title: "Connected",
          description: "Call connected successfully"
        });
      }, 1000);

      console.log('✅ Call answered successfully');

    } catch (error) {
      console.error('❌ Failed to answer call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to answer call",
        variant: "destructive"
      });
      cleanup();
    }
  }, [currentUser?.uid, incomingCall, cleanup, toast]);

  // Decline call
  const declineCall = useCallback(() => {
    if (incomingCall) {
      console.log('📞 Declining call:', incomingCall.roomId);
      
      // Update call status in database
      supabase.from('call_rooms')
        .update({ status: 'declined' })
        .eq('room_id', incomingCall.roomId);
      
      // Stop ring tone
      if (ringToneRef.current) {
        ringToneRef.current.pause();
        ringToneRef.current.currentTime = 0;
      }
      
      setIncomingCall(null);
    }
  }, [incomingCall]);

  // End call
  const endCall = useCallback(() => {
    console.log('📞 Ending call');
    
    // Update call status if we have an active room
    if (currentRoomIdRef.current) {
      supabase.from('call_rooms')
        .update({ status: 'ended' })
        .eq('room_id', currentRoomIdRef.current);
    }

    // Stop ring tone
    if (ringToneRef.current) {
      ringToneRef.current.pause();
      ringToneRef.current.currentTime = 0;
    }

    // Clear incoming call
    setIncomingCall(null);
    
    // Set status and cleanup
    setCallStatus('ended');
    setTimeout(() => {
      cleanup();
    }, 1000); // Small delay to show ended status
  }, [cleanup]);

  // Toggle mute (simulated)
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    console.log('🎤 Toggled mute:', !isMuted);
  }, [isMuted]);

  // Toggle video (simulated)
  const toggleVideo = useCallback(() => {
    setIsVideoEnabled(prev => !prev);
    console.log('📹 Toggled video:', !isVideoEnabled);
  }, [isVideoEnabled]);

  // Set up real-time listeners
  useEffect(() => {
    if (!currentUser?.uid) {
      console.log('❌ No current user, skipping real-time listeners');
      return;
    }

    console.log('🔌 Setting up real-time listeners for user:', currentUser.uid);

    // Listen for incoming calls
    const callChannel = supabase
      .channel('incoming_calls')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_rooms',
        filter: `callee_id=eq.${currentUser.uid}`
      }, async (payload) => {
        console.log('📞 Incoming call received:', payload.new);
        
        // Get caller info
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', payload.new.caller_id)
          .single();

        const callerName = callerProfile?.display_name || callerProfile?.username || 'Unknown User';
        console.log('👤 Caller info:', callerName);

        setIncomingCall({
          roomId: payload.new.room_id,
          callerName: callerName,
          callType: payload.new.call_type,
          callerId: payload.new.caller_id
        });

        // Play ring tone for incoming call
        if (ringToneRef.current) {
          ringToneRef.current.play().catch(console.error);
        }
        
        console.log('✅ Incoming call state set');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_rooms',
        filter: `caller_id=eq.${currentUser.uid}`
      }, async (payload) => {
        console.log('📞 Call room updated for caller:', payload.new);
        
        // Handle call answered
        if (payload.new.status === 'connected' && currentRoomIdRef.current === payload.new.room_id) {
          console.log('📞 Call answered');
          
          // Stop ring tone
          if (ringToneRef.current) {
            ringToneRef.current.pause();
            ringToneRef.current.currentTime = 0;
          }
          
          setCallStatus('connecting');
          setTimeout(() => {
            setCallStatus('connected');
            toast({
              title: "Connected",
              description: "Call connected successfully"
            });
          }, 1000);
        }
        
        // Handle call declined
        if (payload.new.status === 'declined') {
          console.log('📞 Call declined');
          toast({
            title: "Call Declined",
            description: "The call was declined"
          });
          endCall();
        }
      })
      .subscribe((status) => {
        console.log('📡 Call channel subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up real-time listeners');
      supabase.removeChannel(callChannel);
    };
  }, [currentUser?.uid, toast, endCall]);

  // Debug effect to track call status changes
  useEffect(() => {
    console.log('📊 Call status changed to:', callStatus);
  }, [callStatus]);

  // Debug effect to track incoming calls
  useEffect(() => {
    console.log('📞 Incoming call state changed:', incomingCall);
  }, [incomingCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callStatus,
    callType,
    isMuted,
    isVideoEnabled,
    incomingCall,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};