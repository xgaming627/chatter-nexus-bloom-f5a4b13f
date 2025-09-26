import { useState, useRef, useCallback, useEffect } from 'react';
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

interface RealCallHook {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
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

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const useRealCall = (): RealCallHook => {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Refs for WebRTC
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);

  // State
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType>('voice');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  console.log('🎯 useRealCall hook initialized, user:', currentUser?.uid, 'status:', callStatus);

  // Clean up function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up call resources');
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset state
    currentRoomIdRef.current = null;
    setCallStatus('idle');
    setIsMuted(false);
    setIsVideoEnabled(false);
  }, []);

  // Get user media
  const getUserMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    try {
      console.log(`🎤 Getting user media for ${type} call`);
      const constraints = {
        audio: true,
        video: type === 'video'
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      setIsVideoEnabled(type === 'video');
      console.log('✅ Got user media successfully');
      return stream;
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      toast({
        title: "Media Error",
        description: "Failed to access camera/microphone. Please allow permissions and try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  // Create peer connection
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    console.log('🔗 Creating peer connection');
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (event.candidate && currentRoomIdRef.current && currentUser?.uid) {
        console.log('📤 Sending ICE candidate');
        try {
          await supabase.from('ice_candidates').insert({
            room_id: currentRoomIdRef.current,
            user_id: currentUser.uid,
            candidate: {
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid
            }
          });
        } catch (error) {
          console.error('❌ Failed to save ICE candidate:', error);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('🎥 Received remote track');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔄 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
        toast({
          title: "Connected",
          description: "Call connected successfully"
        });
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log('❌ Connection failed or disconnected');
        endCall();
      }
    };

    return pc;
  }, [currentUser?.uid, toast]);

  // Start call
  const startCall = useCallback(async (targetUserId: string, type: CallType) => {
    console.log('🚀 startCall called:', { targetUserId, type, currentUser: currentUser?.uid });
    
    if (!currentUser?.uid) {
      console.log('❌ No current user');
      return;
    }

    try {
      setCallStatus('initiating');
      setCallType(type);

      console.log('🎤 Requesting user media...');
      // Get user media first
      const stream = await getUserMedia(type);
      localStreamRef.current = stream;

      // Create room ID
      const roomId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      currentRoomIdRef.current = roomId;

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(track, stream);
        }
      });

      // Create offer
      console.log('📝 Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('💾 Saving call room to database');
      // Save call to database - using correct column names
      const { error } = await supabase.from('call_rooms').insert({
        room_id: roomId,
        caller_id: currentUser.uid,
        callee_id: targetUserId,
        call_type: type,
        status: 'ringing',
        offer: offer as any
      });

      if (error) {
        console.error('❌ Failed to create call room:', error);
        throw error;
      }

      setCallStatus('ringing');
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
  }, [currentUser?.uid, getUserMedia, createPeerConnection, cleanup, toast]);

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

      // Get user media
      const stream = await getUserMedia(incomingCall.callType);
      localStreamRef.current = stream;

      // Get call data from database
      const { data: callData, error } = await supabase
        .from('call_rooms')
        .select('*')
        .eq('room_id', incomingCall.roomId)
        .single();

      if (error || !callData?.offer) {
        throw new Error('Call not found or invalid');
      }

      currentRoomIdRef.current = incomingCall.roomId;

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream
      stream.getTracks().forEach(track => {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(track, stream);
        }
      });

      // Set remote description from offer
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer as any));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Save answer to database
      await supabase.from('call_rooms')
        .update({
          answer: answer as any,
          status: 'connected'
        })
        .eq('room_id', incomingCall.roomId);

      setIncomingCall(null);
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
  }, [currentUser?.uid, incomingCall, getUserMedia, createPeerConnection, cleanup, toast]);

  // Decline call
  const declineCall = useCallback(() => {
    if (incomingCall) {
      console.log('📞 Declining call:', incomingCall.roomId);
      
      // Update call status in database
      supabase.from('call_rooms')
        .update({ status: 'declined' })
        .eq('room_id', incomingCall.roomId);
      
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

    // Clear incoming call
    setIncomingCall(null);
    
    // Set status and cleanup
    setCallStatus('ended');
    setTimeout(() => {
      cleanup();
    }, 1000); // Small delay to show ended status
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
      console.log('🎤 Toggled mute:', !audioTracks[0]?.enabled);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      const enabled = videoTracks[0]?.enabled || false;
      setIsVideoEnabled(enabled);
      console.log('📹 Toggled video:', enabled);
    }
  }, []);

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
        
        console.log('✅ Incoming call state set');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_rooms',
        filter: `caller_id=eq.${currentUser.uid}`
      }, async (payload) => {
        console.log('📞 Call room updated for caller:', payload.new);
        
        // Handle answer received
        if (payload.new.answer && currentRoomIdRef.current === payload.new.room_id && peerConnectionRef.current) {
          console.log('📞 Answer received, setting remote description');
          try {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(payload.new.answer as any)
            );
            console.log('✅ Remote description set successfully');
          } catch (error) {
            console.error('❌ Failed to set remote description:', error);
          }
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

    // Listen for ICE candidates
    const iceChannel = supabase
      .channel('ice_candidates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ice_candidates'
      }, async (payload) => {
        console.log('📤 ICE candidate received:', payload.new.room_id, 'from user:', payload.new.user_id);
        if (currentRoomIdRef.current === payload.new.room_id && 
            payload.new.user_id !== currentUser.uid && 
            peerConnectionRef.current) {
          console.log('📤 Adding ICE candidate to peer connection');
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(payload.new.candidate as any)
            );
            console.log('✅ ICE candidate added successfully');
          } catch (error) {
            console.error('❌ Failed to add ICE candidate:', error);
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 ICE channel subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up real-time listeners');
      supabase.removeChannel(callChannel);
      supabase.removeChannel(iceChannel);
    };
  }, [currentUser?.uid, toast, endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    localVideoRef,
    remoteVideoRef,
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