import { supabase } from '@/integrations/supabase/client';

export const runChatCleanup = async () => {
  try {
    const { error } = await supabase.rpc('auto_delete_old_conversations');
    
    if (error) {
      console.error('Error running chat cleanup:', error);
      throw error;
    }
    
    console.log('Chat cleanup completed successfully');
  } catch (error) {
    console.error('Failed to run chat cleanup:', error);
    throw error;
  }
};

// Function to reset unread count when user opens a conversation
export const resetUnreadCount = async (conversationId: string, userId: string) => {
  try {
    const { error } = await supabase.rpc('reset_unread_count', {
      conversation_id: conversationId,
      user_id: userId
    });
    
    if (error) {
      console.error('Error resetting unread count:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to reset unread count:', error);
    throw error;
  }
};

// Auto-cleanup function that can be called periodically
export const initializeChatCleanup = () => {
  // Run cleanup every hour
  const cleanup = () => {
    runChatCleanup().catch(console.error);
  };
  
  // Run once on initialization
  cleanup();
  
  // Set up interval for regular cleanup
  const intervalId = setInterval(cleanup, 60 * 60 * 1000); // 1 hour
  
  // Return cleanup function to clear interval if needed
  return () => clearInterval(intervalId);
};