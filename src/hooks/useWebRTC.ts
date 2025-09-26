import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface WebRTCHook {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  isCallActive: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  startCall: (conversationId: string, callType: 'voice' | 'video', targetUserId?: string) => Promise<void>;
  answerCall: (roomId: string) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  incomingCall: { roomId: string; callerName: string; callType: 'voice' | 'video' } | null;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const useWebRTC = (): WebRTCHook => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [incomingCall, setIncomingCall] = useState<{ roomId: string; callerName: string; callType: 'voice' | 'video' } | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const callTypeRef = useRef<'voice' | 'video'>('voice');

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUser) return;

    const callRoomsChannel = supabase
      .channel('call-rooms-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_rooms',
          filter: `callee_id=eq.${currentUser.uid}`
        },
        async (payload) => {
          console.log('Incoming call:', payload);
          const callData = payload.new;
          
          // Get caller profile
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('user_id', callData.caller_id)
            .single();
          
          const callerName = callerProfile?.display_name || callerProfile?.username || 'Unknown';
          
          setIncomingCall({
            roomId: callData.room_id,
            callerName,
            callType: callData.call_type
          });
          
          // Create notification for incoming call
          try {
            await supabase
              .from('notifications')
              .insert({
                user_id: currentUser.uid,
                type: 'call',
                title: `Incoming ${callData.call_type} call`,
                message: `${callerName} is calling you`,
                is_sound_enabled: true,
                metadata: { roomId: callData.room_id, callType: callData.call_type }
              });
          } catch (error) {
            console.error('Error creating call notification:', error);
          }
          
          // Show toast notification
          toast({
            title: `Incoming ${callData.call_type} call`,
            description: `${callerName} is calling you`,
            duration: 10000
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_rooms',
          filter: `caller_id=eq.${currentUser.uid}`
        },
        (payload) => {
          console.log('Call room updated:', payload);
          const callData = payload.new;
          
          if (callData.status === 'active' && callData.answer && currentRoomIdRef.current === callData.room_id) {
            handleAnswer(callData.answer);
          }
        }
      )
      .subscribe();

    // Listen for ICE candidates
    const iceCandidatesChannel = supabase
      .channel('ice-candidates-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ice_candidates'
        },
        (payload) => {
          console.log('New ICE candidate:', payload);
          const candidateData = payload.new;
          
          if (candidateData.room_id === currentRoomIdRef.current && 
              candidateData.user_id !== currentUser.uid &&
              peerConnectionRef.current) {
            
            const candidate = new RTCIceCandidate(candidateData.candidate);
            peerConnectionRef.current.addIceCandidate(candidate)
              .catch(error => console.error('Error adding ICE candidate:', error));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callRoomsChannel);
      supabase.removeChannel(iceCandidatesChannel);
    };
  }, [currentUser, toast]);

  const createPeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate && currentRoomIdRef.current && currentUser) {
        console.log('Sending ICE candidate:', event.candidate);
        
          await supabase
            .from('ice_candidates')
            .insert({
              room_id: currentRoomIdRef.current,
              user_id: currentUser.uid,
              candidate: event.candidate.toJSON() as any
            });
      }
    };
    
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (peerConnection.connectionState === 'disconnected' || 
                 peerConnection.connectionState === 'failed') {
        endCall();
      }
    };
    
    return peerConnection;
  }, [currentUser]);

  const getLocalStream = useCallback(async (callType: 'voice' | 'video'): Promise<MediaStream> => {
    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }, []);

  const startCall = useCallback(async (conversationId: string, callType: 'voice' | 'video', targetUserId?: string) => {
    if (!currentUser) return;
    
    try {
      setCallStatus('calling');
      setIsCallActive(true);
      callTypeRef.current = callType;
      
      // Get local stream
      const localStream = await getLocalStream(callType);
      localStreamRef.current = localStream;
      
      // Create peer connection
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;
      
      // Add local stream to peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
      
      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Generate room ID
      const roomId = Math.random().toString(36).substring(2, 15);
      currentRoomIdRef.current = roomId;
      
        // Save call room to database
        await supabase
          .from('call_rooms')
          .insert({
            room_id: roomId,
            caller_id: currentUser.uid,
            callee_id: targetUserId,
            conversation_id: conversationId,
            call_type: callType,
            status: 'waiting',
            offer: offer as any
          });
      
      console.log('Call started with room ID:', roomId);
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Call failed',
        description: 'Failed to start the call. Please try again.',
        variant: 'destructive'
      });
      endCall();
    }
  }, [currentUser, getLocalStream, createPeerConnection, toast]);

  const answerCall = useCallback(async (roomId: string) => {
    if (!currentUser) return;
    
    try {
      setCallStatus('ringing');
      setIsCallActive(true);
      currentRoomIdRef.current = roomId;
      setIncomingCall(null);
      
      // Get call room data
      const { data: callRoom } = await supabase
        .from('call_rooms')
        .select('*')
        .eq('room_id', roomId)
        .single();
      
      if (!callRoom) throw new Error('Call room not found');
      
      callTypeRef.current = callRoom.call_type as 'voice' | 'video';
      
        // Get local stream
        const localStream = await getLocalStream(callRoom.call_type as 'voice' | 'video');
      localStreamRef.current = localStream;
      
      // Create peer connection
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;
      
      // Add local stream to peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
      
        // Set remote description (offer)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(callRoom.offer as unknown as RTCSessionDescriptionInit));
      
      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
        // Update call room with answer
        await supabase
          .from('call_rooms')
          .update({
            status: 'active',
            answer: answer as any
          })
          .eq('room_id', roomId);
      
      console.log('Call answered for room:', roomId);
      
    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: 'Call failed',
        description: 'Failed to answer the call. Please try again.',
        variant: 'destructive'
      });
      endCall();
    }
  }, [currentUser, getLocalStream, createPeerConnection, toast]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description set successfully');
    } catch (error) {
      console.error('Error setting remote description:', error);
    }
  }, []);

  const endCall = useCallback(() => {
    console.log('Ending call');
    
    // Stop local stream tracks properly
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Update call room status if we have a room
    if (currentRoomIdRef.current && currentUser) {
      supabase
        .from('call_rooms')
        .update({ status: 'ended' })
        .eq('room_id', currentRoomIdRef.current)
        .then(() => console.log('Call room status updated to ended'));
    }
    
    // Reset state
    setIsCallActive(false);
    setCallStatus('idle');
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIncomingCall(null);
    currentRoomIdRef.current = null;
    
    // Clear video elements and their source objects
    if (localVideoRef.current) {
      if (localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject) {
        const stream = remoteVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      remoteVideoRef.current.srcObject = null;
    }
  }, [currentUser]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current && callTypeRef.current === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  return {
    localVideoRef,
    remoteVideoRef,
    isCallActive,
    isMuted,
    isVideoEnabled,
    callStatus,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    incomingCall
  };
};