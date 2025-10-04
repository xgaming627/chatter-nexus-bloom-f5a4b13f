import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePinnedConversations = (userId: string | null) => {
  const [pinnedConversations, setPinnedConversations] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchPinnedConversations = async () => {
      const { data, error } = await supabase
        .from('pinned_conversations')
        .select('conversation_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching pinned conversations:', error);
      } else {
        setPinnedConversations(data?.map(p => p.conversation_id) || []);
      }
    };

    fetchPinnedConversations();

    const channel = supabase
      .channel(`pinned_conversations_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pinned_conversations',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchPinnedConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const pinConversation = async (conversationId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('pinned_conversations')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
      });

    if (error) {
      console.error('Error pinning conversation:', error);
      toast.error("Failed to pin conversation");
    } else {
      toast.success("Conversation pinned");
    }
  };

  const unpinConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('pinned_conversations')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unpinning conversation:', error);
      toast.error("Failed to unpin conversation");
    } else {
      toast.success("Conversation unpinned");
    }
  };

  return { pinnedConversations, pinConversation, unpinConversation };
};