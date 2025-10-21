import { supabase } from '@/integrations/supabase/client';
import { NEWS_CONVERSATION_ID, COMMUNITY_CONVERSATION_ID } from '@/constants/conversations';

export const initializeSpecialChats = async (userId: string) => {
  try {
    // Check if News conversation exists
    const { data: newsConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', NEWS_CONVERSATION_ID)
      .single();

    if (!newsConv) {
      // Create News conversation
      await supabase
        .from('conversations')
        .insert({
          id: NEWS_CONVERSATION_ID,
          is_group_chat: true,
          group_name: 'Nexus News',
          participants: [],
          created_by: userId
        });
    }

    // Check if Community conversation exists
    const { data: commConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', COMMUNITY_CONVERSATION_ID)
      .single();

    if (!commConv) {
      // Create Community conversation
      await supabase
        .from('conversations')
        .insert({
          id: COMMUNITY_CONVERSATION_ID,
          is_group_chat: true,
          group_name: 'Nexus Community',
          participants: [],
          created_by: userId
        });
    }
  } catch (error) {
    console.error('Error initializing special chats:', error);
  }
};
