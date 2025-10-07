import React from 'react';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NEWS_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001'; // Special UUID for news

const NewsButton: React.FC = () => {
  const { setCurrentConversationId, refreshConversations } = useChat();
  const { currentUser } = useAuth();

  const handleOpenNews = async () => {
    if (!currentUser) return;

    try {
      // Check if news conversation exists
      const { data: existingNews, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', NEWS_CONVERSATION_ID)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingNews) {
        // Create the special news conversation
        const { error: insertError } = await supabase
          .from('conversations')
          .insert({
            id: NEWS_CONVERSATION_ID,
            participants: [currentUser.uid],
            created_by: currentUser.uid,
            is_group_chat: true,
            group_name: '📰 News & Updates',
            created_by_role: 'moderator'
          });

        if (insertError && insertError.code !== '23505') { // Ignore duplicate key error
          throw insertError;
        }
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

      // Refresh conversations to show the news channel
      await refreshConversations();
      
      // Set current conversation after a short delay to ensure it's in the list
      setTimeout(() => {
        setCurrentConversationId(NEWS_CONVERSATION_ID);
      }, 300);
    } catch (error: any) {
      console.error('Error opening news:', error);
      if (error.code !== '23505') { // Don't show error for duplicate key
        toast.error('Failed to open news channel');
      } else {
        // If duplicate, just try to open it
        await refreshConversations();
        setTimeout(() => {
          setCurrentConversationId(NEWS_CONVERSATION_ID);
        }, 300);
      }
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
