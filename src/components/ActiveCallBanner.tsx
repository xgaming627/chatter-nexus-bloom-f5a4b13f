import { useState, useEffect } from "react";
import { Phone, Video, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface ActiveCallBannerProps {
  conversationId: string;
  onJoinCall: (roomName: string, isVideoCall: boolean) => void;
}

export const ActiveCallBanner = ({ conversationId, onJoinCall }: ActiveCallBannerProps) => {
  const { currentUser } = useAuth();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (!conversationId || !currentUser) return;

    // Check for active call in this conversation
    const checkActiveCall = async () => {
      const { data, error } = await supabase
        .from('call_notifications')
        .select('*')
        .eq('room_name', `conv_${conversationId}`)
        .eq('status', 'active')
        .single();

      if (data && !error) {
        setActiveCall(data);
        
        // Get participant names
        const { data: roomData } = await supabase
          .from('call_rooms')
          .select('participant_ids')
          .eq('room_id', data.room_name)
          .single();

        if (roomData?.participant_ids) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('display_name, username')
            .in('user_id', roomData.participant_ids);

          const names = profiles?.map(p => p.display_name || p.username || 'User') || [];
          setParticipants(names);
        }
      } else {
        setActiveCall(null);
        setParticipants([]);
      }
    };

    checkActiveCall();

    // Subscribe to call updates
    const channel = supabase
      .channel(`active_call_${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'call_notifications',
        filter: `room_name=eq.conv_${conversationId}`,
      }, () => {
        checkActiveCall();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUser]);

  if (!activeCall) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {activeCall.is_video_call ? (
            <Video className="h-4 w-4 text-primary" />
          ) : (
            <Phone className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium text-sm">Call in progress</span>
        </div>
        
        {participants.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{participants.join(", ")}</span>
          </div>
        )}
      </div>

      <Button
        size="sm"
        onClick={() => onJoinCall(activeCall.room_name, activeCall.is_video_call)}
        className="bg-primary hover:bg-primary/90"
      >
        Join Call
      </Button>
    </div>
  );
};