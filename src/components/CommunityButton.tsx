import React from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { COMMUNITY_CONVERSATION_ID } from '@/constants/conversations';

const CommunityButton: React.FC = () => {
  const { setCurrentConversationId } = useChat();
  const { currentUser } = useAuth();

  const handleOpenCommunity = async () => {
    if (!currentUser) return;

    try {
      // Just open the conversation directly
      setCurrentConversationId(COMMUNITY_CONVERSATION_ID);
    } catch (error: any) {
      console.error('Error opening community:', error);
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
