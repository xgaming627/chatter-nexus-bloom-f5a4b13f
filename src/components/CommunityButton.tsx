import React from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { COMMUNITY_CONVERSATION_ID } from '@/constants/conversations';

const CommunityButton: React.FC = () => {
  const { setCurrentConversationId, refreshConversations } = useChat();
  const { currentUser } = useAuth();

  const handleOpenCommunity = async () => {
    if (!currentUser) return;

    try {
      // Always try to add user to participants
      const { data: existingCommunity } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', COMMUNITY_CONVERSATION_ID)
        .maybeSingle();

      if (existingCommunity) {
        const participants = existingCommunity.participants || [];
        if (!participants.includes(currentUser.uid)) {
          await supabase
            .from('conversations')
            .update({
              participants: [...participants, currentUser.uid]
            })
            .eq('id', COMMUNITY_CONVERSATION_ID);
        }
      }

      // Refresh and open
      await refreshConversations();
      setTimeout(() => {
        setCurrentConversationId(COMMUNITY_CONVERSATION_ID);
      }, 300);
    } catch (error: any) {
      console.error('Error opening community:', error);
      // Try to open anyway
      await refreshConversations();
      setTimeout(() => {
        setCurrentConversationId(COMMUNITY_CONVERSATION_ID);
      }, 300);
    }
  };

  return (
    <Button 
      className="w-full mb-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700" 
      onClick={handleOpenCommunity}
    >
      <Users className="mr-2 h-4 w-4" /> Community
    </Button>
  );
};

export default CommunityButton;
