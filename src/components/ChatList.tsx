
import React from 'react';
import { useChat, Conversation } from '@/context/ChatContext';
import UserAvatar from './UserAvatar';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ChatList: React.FC = () => {
  const { conversations, currentConversation, setCurrentConversationId } = useChat();

  const getConversationName = (conversation: Conversation) => {
    if (conversation.isGroupChat && conversation.groupName) {
      return conversation.groupName;
    }
    
    if (conversation.participantsInfo.length > 0) {
      return conversation.participantsInfo[0].displayName;
    }
    
    return 'Chat';
  };

  const getLastMessageTime = (conversation: Conversation) => {
    if (!conversation.lastMessage?.timestamp) return '';
    
    const timestamp = conversation.lastMessage.timestamp.toDate ? 
      conversation.lastMessage.timestamp.toDate() : 
      new Date(conversation.lastMessage.timestamp);
    
    const now = new Date();
    const isToday = timestamp.getDate() === now.getDate() &&
      timestamp.getMonth() === now.getMonth() &&
      timestamp.getFullYear() === now.getFullYear();
    
    return isToday 
      ? format(timestamp, 'HH:mm')
      : format(timestamp, 'dd/MM/yyyy');
  };

  const getAvatarInfo = (conversation: Conversation) => {
    if (conversation.isGroupChat) {
      return {
        username: conversation.groupName || 'Group',
        photoURL: conversation.groupPhotoURL
      };
    }
    
    if (conversation.participantsInfo.length > 0) {
      return {
        username: conversation.participantsInfo[0].username,
        photoURL: conversation.participantsInfo[0].photoURL
      };
    }
    
    return {
      username: 'Chat'
    };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Chats</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length > 0 ? (
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
                    onClick={() => setCurrentConversationId(conversation.id)}
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
                        {conversation.lastMessage && (
                          <div className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            No conversations yet
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
