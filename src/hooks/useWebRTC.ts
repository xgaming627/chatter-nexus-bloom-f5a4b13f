import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type CallStatus = 'idle' | 'initiating' | 'ringing' | 'connected' | 'ending';
export type CallType = 'voice' | 'video';

interface IncomingCall {
  roomId: string;
  callerName: string;
  callType: CallType;
  isGroupCall: boolean;
}

interface WebRTCHook {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  isCallActive: boolean;
  callStatus: CallStatus;
  callType: CallType;
  isMuted: boolean;
  isVideoEnabled: boolean;
  incomingCall: IncomingCall | null;
  startCall: (targetUserId: string, type: CallType) => Promise<void>;
  answerCall: (roomId: string) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export const useWebRTC = (): WebRTCHook => {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Refs
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

  const isCallActive = callStatus !== 'idle' && callStatus !== 'ending';

  // Clean up function
  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC resources...');
    
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
    setIncomingCall(null);
    setCallStatus('idle');
    setIsMuted(false);
    setIsVideoEnabled(false);
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (event.candidate && currentRoomIdRef.current) {
        try {
          await supabase.from('ice_candidates').insert({
            room_id: currentRoomIdRef.current,
            user_id: currentUser?.uid,
            candidate: {
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid
            }
          });
        } catch (error) {
          console.error('Failed to save ICE candidate:', error);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCall();
      }
    };

    return pc;
  }, [currentUser?.uid]);

  // Get user media
  const getUserMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      setIsVideoEnabled(type === 'video');
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      toast({
        title: "Media Error",
        description: "Failed to access camera/microphone",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  // Start call
  const startCall = useCallback(async (targetUserId: string, type: CallType) => {
    if (!currentUser?.uid) return;

    try {
      setCallStatus('initiating');
      setCallType(type);

      // Get user media
      const stream = await getUserMedia(type);
      localStreamRef.current = stream;

      // Create room
      const roomId = `${Date.now()}-${currentUser.uid}-${targetUserId}`;
      currentRoomIdRef.current = roomId;

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Save call room
      await supabase.from('call_rooms').insert({
        room_id: roomId,
        caller_id: currentUser.uid,
        callee_id: targetUserId,
        call_type: type,
        status: 'waiting',
        offer: offer as any
      });

      setCallStatus('ringing');
      
    } catch (error) {
      console.error('Failed to start call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to initiate call",
        variant: "destructive"
      });
      cleanup();
    }
  }, [currentUser?.uid, getUserMedia, createPeerConnection, cleanup, toast]);

  // Answer call
  const answerCall = useCallback(async (roomId: string) => {
    if (!currentUser?.uid || !incomingCall) return;

    try {
      setCallStatus('initiating');
      setCallType(incomingCall.callType);

      // Get user media
      const stream = await getUserMedia(incomingCall.callType);
      localStreamRef.current = stream;

      // Get call room data
      const { data: roomData, error } = await supabase
        .from('call_rooms')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (error || !roomData?.offer) {
        throw new Error('Call room not found');
      }

      currentRoomIdRef.current = roomId;

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer as any));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Update call room with answer
      await supabase.from('call_rooms')
        .update({
          answer: answer as any,
          status: 'active'
        })
        .eq('room_id', roomId);

      setIncomingCall(null);
      
    } catch (error) {
      console.error('Failed to answer call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to answer call",
        variant: "destructive"
      });
      cleanup();
    }
  }, [currentUser?.uid, incomingCall, getUserMedia, createPeerConnection, cleanup, toast]);

  // End call
  const endCall = useCallback(() => {
    console.log('Ending call...');
    
    // Update room status if we have a room
    if (currentRoomIdRef.current) {
      supabase.from('call_rooms')
        .update({ status: 'ended' })
        .eq('room_id', currentRoomIdRef.current);
    }

    setCallStatus('ending');
    cleanup();
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(videoTracks[0]?.enabled || false);
    }
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Listen for new call rooms (incoming calls)
    const callRoomsChannel = supabase
      .channel('call_rooms_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_rooms',
        filter: `callee_id=eq.${currentUser.uid}`
      }, async (payload) => {
        console.log('New incoming call:', payload.new);
        
        // Get caller profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', payload.new.caller_id)
          .single();

        setIncomingCall({
          roomId: payload.new.room_id,
          callerName: profile?.display_name || profile?.username || 'Unknown',
          callType: payload.new.call_type,
          isGroupCall: false
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_rooms',
        filter: `caller_id=eq.${currentUser.uid}`
      }, async (payload) => {
        // Handle answer received
        if (payload.new.answer && currentRoomIdRef.current === payload.new.room_id) {
          try {
            await peerConnectionRef.current?.setRemoteDescription(
              new RTCSessionDescription(payload.new.answer as any)
            );
            console.log('Answer set successfully');
          } catch (error) {
            console.error('Failed to set answer:', error);
          }
        }
      })
      .subscribe();

    // Listen for ICE candidates
    const iceCandidatesChannel = supabase
      .channel('ice_candidates_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ice_candidates'
      }, async (payload) => {
        if (currentRoomIdRef.current === payload.new.room_id && 
            payload.new.user_id !== currentUser.uid && 
            peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(payload.new.candidate as any)
            );
          } catch (error) {
            console.error('Failed to add ICE candidate:', error);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callRoomsChannel);
      supabase.removeChannel(iceCandidatesChannel);
    };
  }, [currentUser?.uid]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    localVideoRef,
    remoteVideoRef,
    isCallActive,
    callStatus,
    callType,
    isMuted,
    isVideoEnabled,
    incomingCall,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};