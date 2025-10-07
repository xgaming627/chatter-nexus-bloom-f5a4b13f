import React from 'react';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NEWS_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001'; // Special UUID for news

const NewsButton: React.FC = () => {
  const { setCurrentConversationId, conversations } = useChat();
  const { currentUser } = useAuth();

  const handleOpenNews = async () => {
    if (!currentUser) return;

    try {
      // Check if news conversation exists
      let newsConversation = conversations.find(c => c.id === NEWS_CONVERSATION_ID);
      
      if (!newsConversation) {
        // Create news conversation if it doesn't exist
        const { data: existingNews } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', NEWS_CONVERSATION_ID)
          .maybeSingle();

        if (!existingNews) {
          // Create the special news conversation
          const { error } = await supabase
            .from('conversations')
            .insert({
              id: NEWS_CONVERSATION_ID,
              participants: [currentUser.uid],
              created_by: currentUser.uid,
              is_group_chat: true,
              group_name: '📰 News & Updates',
              created_by_role: 'moderator'
            });

          if (error) throw error;
        } else {
          // Add current user to participants if not already there
          const participants = existingNews.participants || [];
          if (!participants.includes(currentUser.uid)) {
            await supabase
              .from('conversations')
              .update({
                participants: [...participants, currentUser.uid]
              })
              .eq('id', NEWS_CONVERSATION_ID);
          }
        }
      }

      setCurrentConversationId(NEWS_CONVERSATION_ID);
    } catch (error) {
      console.error('Error opening news:', error);
      toast.error('Failed to open news channel');
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
