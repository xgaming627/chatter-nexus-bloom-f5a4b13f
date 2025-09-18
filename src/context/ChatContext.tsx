import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Message, Conversation, ExtendedUser, User } from "@/types/supabase";

// Re-export the types for consumers to use
export type { Message, Conversation, ExtendedUser, User };

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  setCurrentConversationId: (id: string | null) => void;
  createConversation: (participants: string[], isGroup?: boolean, groupName?: string) => Promise<string>;
  createGroupChat: (groupName: string, participants: string[]) => Promise<string>;
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
  searchUsers: (query: string) => Promise<ExtendedUser[]>;
  updateDmSettings: (settings: any) => Promise<void>;
  deleteChat: (conversationId: string) => Promise<void>;
  leaveChat: (conversationId: string) => Promise<void>;
  addMemberToChat: (conversationId: string, userId: string) => Promise<void>;
  removeMemberFromChat: (conversationId: string, userId: string) => Promise<void>;
  isRateLimited: boolean;
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
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const rateLimitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onlineStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [onlineStatusLastUpdated, setOnlineStatusLastUpdated] = useState<Date | null>(null);
  
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participants.cs.{${currentUser.uid}}`
        },
        (payload) => {
          console.log('Conversation change:', payload);
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
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversation.id}`
        },
        (payload) => {
          console.log('Message change:', payload);
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
        .select(`
          *,
          profiles!conversations_created_by_fkey(username, display_name, photo_url)
        `)
        .contains('participants', [currentUser.uid])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsData = data.map(conv => new Conversation({
        id: conv.id,
        ...conv,
        created_at: conv.created_at,
        updated_at: conv.updated_at
      }));
      
      setConversations(conversationsData);
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
        .select(`
          *,
          profiles!messages_sender_id_fkey(username, display_name, photo_url)
        `)
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const messagesData = data.map(msg => new Message({
        id: msg.id,
        ...msg
      }));
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error fetching messages",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const checkRateLimit = (): boolean => {
    const now = new Date();
    
    if (!lastMessageTime || (now.getTime() - lastMessageTime.getTime() > 2000)) { 
      setLastMessageTime(now);
      setIsRateLimited(false);
      return false;
    }
    
    setIsRateLimited(true);
    
    if (rateLimitTimeoutRef.current) {
      clearTimeout(rateLimitTimeoutRef.current);
    }
    
    rateLimitTimeoutRef.current = setTimeout(() => {
      setIsRateLimited(false);
    }, 2000);
    
    return true;
  };

  const sendMessage = async (content: string, conversationId: string) => {
    if (!currentUser || !content.trim()) return;
    
    if (isRateLimited) {
      toast({
        title: "Rate limited",
        description: "Please wait 2 seconds between messages",
        variant: "destructive"
      });
      return;
    }

    if (checkRateLimit()) {
      toast({
        title: "Slow down",
        description: "Please wait 2 seconds between messages",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.uid,
          content: content.trim(),
        });

      if (error) throw error;

      // Update conversation's updated_at timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
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

      const conversationData: any = {
        participants,
        is_group_chat: isGroup,
        created_by: currentUser.uid,
      };
      
      if (isGroup && groupName) {
        conversationData.group_name = groupName;
      }
      
      const { data, error } = await supabase
        .from('conversations')
        .insert(conversationData)
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

  const createGroupChat = async (groupName: string, participants: string[]) => {
    if (!groupName || !groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please provide a name for the group chat",
        variant: "destructive"
      });
      throw new Error("Group name is required");
    }
    return createConversation(participants, true, groupName.trim());
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

      setCurrentConversation(new Conversation({
        id: data.id,
        ...data
      }));
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
      description: "File upload feature is not yet implemented",
      variant: "destructive"
    });
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const reportMessage = async (messageId: string, reason: string) => {
    try {
      await supabase
        .from('messages')
        .update({ 
          reported: true,
          flagged_for_moderation: true 
        })
        .eq('id', messageId);
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
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ description })
        .eq('user_id', currentUser.uid);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your description has been updated",
      });
    } catch (error) {
      console.error('Error updating description:', error);
      toast({
        title: "Error updating profile",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const updateOnlineStatus = async (status: 'online' | 'away' | 'offline') => {
    if (!currentUser) return;

    const now = new Date();
    
    if (!onlineStatusLastUpdated || (now.getTime() - onlineStatusLastUpdated.getTime() > 10000)) {
      try {
        await supabase
          .from('profiles')
          .update({ online_status: status })
          .eq('user_id', currentUser.uid);
        
        setOnlineStatusLastUpdated(now);
        
        if (onlineStatusTimeoutRef.current) {
          clearTimeout(onlineStatusTimeoutRef.current);
          onlineStatusTimeoutRef.current = null;
        }
      } catch (error) {
        console.error('Error updating online status:', error);
      }
      return;
    }
    
    if (onlineStatusTimeoutRef.current) {
      return;
    }
    
    onlineStatusTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase
          .from('profiles')
          .update({ online_status: status })
          .eq('user_id', currentUser.uid);
        
        setOnlineStatusLastUpdated(new Date());
        onlineStatusTimeoutRef.current = null;
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    }, 10000);
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
      await supabase
        .from('messages')
        .update({ 
          deleted: true,
          deleted_by: deletedBy 
        })
        .eq('id', messageId);
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
    toast({
      title: "Chat stored",
      description: "Chat storage feature is not fully implemented",
    });
  };

  const unstoreChat = async (conversationId: string) => {
    toast({
      title: "Chat unstored",
      description: "Chat storage feature is not fully implemented",
    });
  };

  const searchUsers = async (query: string): Promise<ExtendedUser[]> => {
    if (!query.trim()) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      return data.map(profile => ({
        id: profile.user_id,
        uid: profile.user_id,
        email: null,
        displayName: profile.display_name,
        username: profile.username,
        photoURL: profile.photo_url,
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  const updateDmSettings = async (settings: any) => {
    toast({
      title: "Settings updated",
      description: "DM settings feature is not fully implemented",
    });
  };

  const deleteChat = async (conversationId: string) => {
    try {
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      toast({
        title: "Chat deleted",
        description: "The chat has been permanently deleted",
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Error deleting chat",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const leaveChat = async (conversationId: string) => {
    if (!currentUser) return;

    try {
      // Get current conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      // Remove current user from participants
      const updatedParticipants = conversation.participants.filter(
        (participant: string) => participant !== currentUser.uid
      );

      await supabase
        .from('conversations')
        .update({ participants: updatedParticipants })
        .eq('id', conversationId);

      toast({
        title: "Left chat",
        description: "You have left the chat",
      });
    } catch (error) {
      console.error('Error leaving chat:', error);
      toast({
        title: "Error leaving chat",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const addMemberToChat = async (conversationId: string, userId: string) => {
    try {
      // Get current conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      // Add user to participants if not already included
      if (!conversation.participants.includes(userId)) {
        const updatedParticipants = [...conversation.participants, userId];

        await supabase
          .from('conversations')
          .update({ participants: updatedParticipants })
          .eq('id', conversationId);

        toast({
          title: "Member added",
          description: "User has been added to the chat",
        });
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error adding member",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const removeMemberFromChat = async (conversationId: string, userId: string) => {
    try {
      // Get current conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      // Remove user from participants
      const updatedParticipants = conversation.participants.filter(
        (participant: string) => participant !== userId
      );

      await supabase
        .from('conversations')
        .update({ participants: updatedParticipants })
        .eq('id', conversationId);

      toast({
        title: "Member removed",
        description: "User has been removed from the chat",
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error removing member",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const value = {
    conversations,
    currentConversation,
    messages,
    sendMessage,
    setCurrentConversationId,
    createConversation,
    createGroupChat,
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
    unstoreChat,
    searchUsers,
    updateDmSettings,
    deleteChat,
    leaveChat,
    addMemberToChat,
    removeMemberFromChat,
    isRateLimited,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};