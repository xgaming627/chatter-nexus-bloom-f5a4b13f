import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Video } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { Button } from './ui/button';

interface ActiveCall {
  id: string;
  room_name: string;
  conversation_id: string;
  caller_id: string;
  participant_ids: string[];
  is_video_call: boolean;
  caller_info?: {
    display_name: string;
    photo_url: string;
  };
}

export const ActiveNowPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const { setCurrentConversationId, conversations } = useChat();
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    fetchActiveCalls();

    // Listen for changes in call_rooms
    const channel = supabase
      .channel('active-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_rooms',
        },
        () => {
          fetchActiveCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, conversations]);

  const fetchActiveCalls = async () => {
    if (!currentUser) return;

    try {
      // Get all conversations user is part of
      const userConversationIds = conversations.map(c => c.id);

      if (userConversationIds.length === 0) return;

      // Fetch active calls in those conversations
      const { data, error } = await supabase
        .from('call_rooms')
        .select('*')
        .in('conversation_id', userConversationIds)
        .eq('status', 'active');

      if (error) throw error;

      // Fetch caller info for each call
      const callsWithInfo = await Promise.all(
        (data || []).map(async (call) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, photo_url')
            .eq('user_id', call.caller_id)
            .single();

          return {
            id: call.id,
            room_name: call.room_id,
            conversation_id: call.conversation_id || '',
            caller_id: call.caller_id,
            participant_ids: call.participant_ids || [],
            is_video_call: call.call_type === 'video',
            caller_info: profile || undefined
          };
        })
      );

      setActiveCalls(callsWithInfo);
    } catch (error) {
      console.error('Error fetching active calls:', error);
    }
  };

  const handleJoinCall = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  if (activeCalls.length === 0) {
    return (
      <div className="w-80 bg-background border-l flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Active Now</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
          <p className="text-sm">It's quiet for now...</p>
          <p className="text-xs mt-2">
            When a friend starts an activity—like playing a game or hanging out on voice—we'll show it here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-background border-l flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Active Now</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeCalls.map((call) => (
          <div
            key={call.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            onClick={() => handleJoinCall(call.conversation_id)}
          >
            <UserAvatar
              photoURL={call.caller_info?.photo_url}
              username={call.caller_info?.display_name}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{call.caller_info?.display_name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                {call.is_video_call ? (
                  <Video className="h-3 w-3" />
                ) : (
                  <Phone className="h-3 w-3" />
                )}
                <span>In a {call.is_video_call ? 'video' : 'voice'} call</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full text-xs">
                Join Call
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
