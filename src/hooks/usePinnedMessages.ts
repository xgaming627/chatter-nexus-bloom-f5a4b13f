import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePinnedMessages = (conversationId: string | null) => {
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    const fetchPinnedMessages = async () => {
      const { data, error } = await supabase
        .from('pinned_messages')
        .select(`
          *,
          messages (*)
        `)
        .eq('conversation_id', conversationId)
        .order('pinned_at', { ascending: false });

      if (error) {
        console.error('Error fetching pinned messages:', error);
      } else {
        setPinnedMessages(data || []);
      }
    };

    fetchPinnedMessages();

    const channel = supabase
      .channel(`pinned_messages_${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pinned_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        fetchPinnedMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const pinMessage = async (messageId: string) => {
    if (!conversationId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('pinned_messages')
      .insert({
        message_id: messageId,
        conversation_id: conversationId,
        pinned_by: user.id,
      });

    if (error) {
      console.error('Error pinning message:', error);
      toast.error("Failed to pin message");
    } else {
      toast.success("Message pinned");
    }
  };

  const unpinMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('pinned_messages')
      .delete()
      .eq('message_id', messageId)
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error unpinning message:', error);
      toast.error("Failed to unpin message");
    } else {
      toast.success("Message unpinned");
    }
  };

  return { pinnedMessages, pinMessage, unpinMessage };
};