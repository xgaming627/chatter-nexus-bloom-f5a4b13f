import React, { useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { Conversation } from '@/types/supabase';
import UserAvatar from './UserAvatar';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const ChatList: React.FC = () => {
  const { conversations, currentConversation, setCurrentConversationId, refreshConversations } = useChat();

  useEffect(() => {
    // Refresh conversations when component mounts
    refreshConversations();
    console.log("Conversations:", conversations);
  }, []);

  const getConversationName = (conversation: Conversation) => {
    if (conversation.is_group_chat && conversation.group_name) {
      return conversation.group_name;
    }
    
    if (conversation.participantsInfo && conversation.participantsInfo.length > 0) {
      return conversation.participantsInfo[0].displayName;
    }
    
    return 'Chat';
  };

  const getLastMessageTime = (conversation: Conversation) => {
    if (!conversation.last_message?.timestamp) return '';
    
    const timestamp = new Date(conversation.last_message.timestamp);
    
    const now = new Date();
    const isToday = timestamp.getDate() === now.getDate() &&
      timestamp.getMonth() === now.getMonth() &&
      timestamp.getFullYear() === now.getFullYear();
    
    return isToday 
      ? format(timestamp, 'HH:mm')
      : format(timestamp, 'dd/MM/yyyy');
  };

  const getAvatarInfo = (conversation: Conversation) => {
    if (conversation.is_group_chat) {
      return {
        username: conversation.group_name || 'Group',
        photoURL: conversation.group_photo_url
      };
    }
    
    if (conversation.participantsInfo && conversation.participantsInfo.length > 0) {
      return {
        username: conversation.participantsInfo[0].username,
        photoURL: conversation.participantsInfo[0].photoURL
      };
    }
    
    return {
      username: 'Chat'
    };
  };

  const handleSelectConversation = (conversationId: string) => {
    console.log("Setting current conversation:", conversationId);
    setCurrentConversationId(conversationId);
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-muted-foreground mb-2">No conversations yet</p>
            <p className="text-sm text-muted-foreground">Search for users to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Chats</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <ul>
          {conversations.map((conversation) => {
            const { username, photoURL } = getAvatarInfo(conversation);
            const isActive = currentConversation?.id === conversation.id;
            
            return (
              <li key={conversation.id} className="border-b last:border-b-0">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start p-3 h-auto",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <UserAvatar username={username} photoURL={photoURL} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <div className="font-medium truncate">
                          {getConversationName(conversation)}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {getLastMessageTime(conversation)}
                        </div>
                      </div>
                      {conversation.last_message && (
                        <div className="text-sm text-muted-foreground truncate">
                          {conversation.last_message.content}
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ChatList;
