import React from 'react';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { NEWS_CONVERSATION_ID } from '@/constants/conversations';

const NewsButton: React.FC = () => {
  const { setCurrentConversationId } = useChat();
  const { currentUser } = useAuth();

  const handleOpenNews = async () => {
    if (!currentUser) return;

    try {
      // Just open the conversation directly
      setCurrentConversationId(NEWS_CONVERSATION_ID);
    } catch (error: any) {
      console.error('Error opening news:', error);
    }
  };

  return (
    <Button 
      className="w-full mb-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" 
      onClick={handleOpenNews}
    >
      <Megaphone className="mr-2 h-4 w-4" /> News
    </Button>
  );
};

export default NewsButton;
