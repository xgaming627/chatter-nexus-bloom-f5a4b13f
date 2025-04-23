import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Message, Conversation } from "@/types/supabase";

export type { Message, Conversation };

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  setCurrentConversationId: (id: string | null) => void;
  createConversation: (participants: string[], isGroup?: boolean, groupName?: string) => Promise<string>;
  refreshConversations: () => Promise<void>;
  uploadFile: (file: File, conversationId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  reportMessage: (messageId: string, reason: string) => Promise<void>;
  startVideoCall: (conversationId: string) => void;
  startVoiceCall: (conversationId: string) => void;
  endCall: () => void;
  isCallActive: boolean;
  activeCallType: 'voice' | 'video' | null;
  updateUserDescription: (description: string) => Promise<void>;
  updateOnlineStatus: (status: 'online' | 'away' | 'offline') => void;
  blockUser: (userId: string, reason?: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  hasNewMessages: boolean;
  getBlockedUsers: () => Promise<any[]>;
  deleteMessage: (messageId: string, deletedBy: string) => Promise<void>;
  storeChat: (conversationId: string) => Promise<void>;
  unstoreChat: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [activeCallType, setActiveCallType] = useState<'voice' | 'video' | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('public:conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participants=cs.{${currentUser.uid}}`
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    fetchConversations();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentConversation) {
      setMessages([]);
      return;
    }

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversation.id}`
        },
        () => {
          fetchMessages(currentConversation.id);
        }
      )
      .subscribe();

    fetchMessages(currentConversation.id);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversation]);

  const fetchConversations = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [currentUser.uid]);

      if (error) throw error;
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error fetching conversations",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const refreshConversations = async () => {
    await fetchConversations();
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error fetching messages",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async (content: string, conversationId: string) => {
    if (!currentUser || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.uid,
          content: content.trim()
        });

      if (error) {
        if (error.message.includes('cooldown')) {
          toast({
            title: "Message cooldown",
            description: "Please wait 2 seconds between messages",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error sending message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const createConversation = async (participants: string[], isGroup = false, groupName?: string) => {
    if (!currentUser) throw new Error("Must be logged in to create conversations");

    try {
      if (!participants.includes(currentUser.uid)) {
        participants.push(currentUser.uid);
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participants,
          is_group_chat: isGroup,
          group_name: groupName,
          created_by: currentUser.uid
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error creating conversation",
        description: "Please try again later",
        variant: "destructive"
      });
      throw error;
    }
  };

  const setCurrentConversationId = async (id: string | null) => {
    if (!id) {
      setCurrentConversation(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCurrentConversation(data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast({
        title: "Error fetching conversation",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const uploadFile = async (file: File, conversationId: string) => {
    toast({
      title: "Feature not implemented",
      description: "File upload feature is not yet implemented with Supabase",
      variant: "destructive"
    });
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const reportMessage = async (messageId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ reported: true, flagged_for_moderation: true })
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error reporting message:', error);
      toast({
        title: "Error reporting message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const startVideoCall = (conversationId: string) => {
    setIsCallActive(true);
    setActiveCallType('video');
    toast({
      title: "Video call started",
      description: "Video call feature is limited in this demo",
    });
  };

  const startVoiceCall = (conversationId: string) => {
    setIsCallActive(true);
    setActiveCallType('voice');
    toast({
      title: "Voice call started",
      description: "Voice call feature is limited in this demo",
    });
  };

  const endCall = () => {
    setIsCallActive(false);
    setActiveCallType(null);
  };

  const updateUserDescription = async (description: string) => {
    toast({
      title: "Feature not implemented",
      description: "User profile update is not yet implemented",
    });
    return Promise.resolve();
  };

  const updateOnlineStatus = (status: 'online' | 'away' | 'offline') => {
    console.log(`Status updated to: ${status}`);
  };

  const blockUser = async (userId: string, reason?: string) => {
    toast({
      title: "User blocked",
      description: "User blocking feature is not fully implemented",
    });
    return Promise.resolve();
  };

  const unblockUser = async (userId: string) => {
    toast({
      title: "User unblocked",
      description: "User unblocking feature is not fully implemented",
    });
    return Promise.resolve();
  };

  const getBlockedUsers = async () => {
    return Promise.resolve([]);
  };

  const deleteMessage = async (messageId: string, deletedBy: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          deleted: true,
          deleted_by: deletedBy
        })
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error deleting message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const storeChat = async (conversationId: string) => {
    const updatedConversations = conversations.map(conv => 
      conv.id === conversationId ? { ...conv, isStored: true } : conv
    );
    setConversations(updatedConversations);
    
    if (currentConversation && currentConversation.id === conversationId) {
      setCurrentConversation({ ...currentConversation, isStored: true });
    }
    
    toast({
      title: "Chat stored",
      description: "This feature is not fully implemented with database storage",
    });
    
    return Promise.resolve();
  };

  const unstoreChat = async (conversationId: string) => {
    const updatedConversations = conversations.map(conv => 
      conv.id === conversationId ? { ...conv, isStored: false } : conv
    );
    setConversations(updatedConversations);
    
    if (currentConversation && currentConversation.id === conversationId) {
      setCurrentConversation({ ...currentConversation, isStored: false });
    }
    
    toast({
      title: "Chat unstored",
      description: "This feature is not fully implemented with database storage",
    });
    
    return Promise.resolve();
  };

  const processConversations = (convs: Conversation[]) => {
    return convs.map(conv => {
      const participantsInfo = conv.participants.map(uid => ({
        uid,
        displayName: "User",
        username: "user",
        onlineStatus: 'offline' as const,
      }));
      
      return {
        ...conv,
        participantsInfo,
      };
    });
  };

  useEffect(() => {
    if (conversations.length > 0) {
      const processedConversations = processConversations(conversations);
      setConversations(processedConversations);
    }
  }, [conversations.length]);

  const value = {
    conversations,
    currentConversation,
    messages,
    sendMessage,
    setCurrentConversationId,
    createConversation,
    refreshConversations,
    uploadFile,
    markAsRead,
    reportMessage,
    startVideoCall,
    startVoiceCall,
    endCall,
    isCallActive,
    activeCallType,
    updateUserDescription,
    updateOnlineStatus,
    blockUser,
    unblockUser,
    hasNewMessages,
    getBlockedUsers,
    deleteMessage,
    storeChat,
    unstoreChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
