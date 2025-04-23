
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Message, Conversation } from "@/types/supabase";

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  setCurrentConversationId: (id: string | null) => void;
  createConversation: (participants: string[], isGroup?: boolean, groupName?: string) => Promise<string>;
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

  // Subscribe to conversations
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

  // Subscribe to messages for current conversation
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
        // Check if it's a cooldown error
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
      // Include current user in participants if not already included
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

  const value = {
    conversations,
    currentConversation,
    messages,
    sendMessage,
    setCurrentConversationId,
    createConversation
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
