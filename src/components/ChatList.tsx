
import React, { useEffect, useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Conversation } from '@/types/supabase';
import UserAvatar from './UserAvatar';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';

const ChatList: React.FC = () => {
  const { conversations, currentConversation, setCurrentConversationId, refreshConversations } = useChat();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Refresh conversations when component mounts
    const loadConversations = async () => {
      setIsLoading(true);
      try {
        await refreshConversations();
      } finally {
        setIsLoading(false);
      }
    };
    loadConversations();
    console.log("Conversations:", conversations);
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      setIsLoading(false);
    }
  }, [conversations]);

  const getConversationName = (conversation: Conversation) => {
    if (conversation.is_group_chat && conversation.group_name) {
      return conversation.group_name;
    }
    
    if (conversation.participantsInfo && conversation.participantsInfo.length > 0) {
      const participant = conversation.participantsInfo[0];
      return participant.displayName || participant.username || 'Chat';
    }
    
    return 'Chat';
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.last_message) return 'No messages yet';
    
    const senderName = conversation.last_message.sender_name || 'Someone';
    const content = conversation.last_message.content;
    
    if (content.length > 30) {
      return `${senderName}: ${content.substring(0, 30)}...`;
    }
    
    return `${senderName}: ${content}`;
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 p-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
            {conversations
              .sort((a, b) => {
                const aTime = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : new Date(a.created_at).getTime();
                const bTime = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : new Date(b.created_at).getTime();
                return bTime - aTime; // Most recent first
              })
              .map((conversation) => {
            const { username, photoURL } = getAvatarInfo(conversation);
            const isActive = currentConversation?.id === conversation.id;
            
            return (
              <li key={conversation.id} className="border-b last:border-b-0 animate-fadeIn">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start p-3 h-auto hover:scale-[1.02] transition-transform",
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
                          {/* Only show unread badge if the last message was NOT sent by the current user */}
                          {!isActive && conversation.unread_count > 0 && conversation.last_message?.sender_id !== currentUser?.uid && (
                            <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse">
                              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conversation.last_message && (
                          <div className="text-sm text-muted-foreground truncate">
                            {getLastMessagePreview(conversation)}
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
