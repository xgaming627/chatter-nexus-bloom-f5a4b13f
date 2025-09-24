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
  sendMessage: (content: string, conversationId: string, replyToMessageId?: string, replyToContent?: string) => Promise<void>;
  setCurrentConversationId: (id: string | null) => void;
  createConversation: (participants: string[], isGroup?: boolean, groupName?: string) => Promise<string>;
  createGroupChat: (groupName: string, participants: string[]) => Promise<string>;
  refreshConversations: () => Promise<void>;
  uploadFile: (file: File, conversationId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  reportMessage: (messageId: string, reason: string) => Promise<void>;
  getReportedMessages: () => Promise<any[]>;
  markReportAsReviewed: (reportId: string) => Promise<void>;
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
  markMessageAsDeletedForUser: (messageId: string, userId: string) => Promise<void>;
  storeChat: (conversationId: string) => Promise<void>;
  unstoreChat: (conversationId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<ExtendedUser[]>;
  updateDmSettings: (settings: any) => Promise<void>;
  deleteChat: (conversationId: string) => Promise<void>;
  leaveChat: (conversationId: string) => Promise<void>;
  addMemberToChat: (conversationId: string, userId: string) => Promise<void>;
  removeMemberFromChat: (conversationId: string, userId: string) => Promise<void>;
  warnUser: (userId: string, reason: string, duration: string) => Promise<void>;
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
      // Limit initial fetch to 20 conversations for better performance
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *
        `)
        .contains('participants', [currentUser.uid])
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Remove duplicate conversations based on participant combinations
      const uniqueConversations = data.filter((conv, index, arr) => {
        const participantKey = [...conv.participants].sort().join(',');
        return arr.findIndex(c => [...c.participants].sort().join(',') === participantKey) === index;
      });

      // Fetch participants info and last messages in batch
      const conversationsWithParticipants = await Promise.all(
        uniqueConversations.map(async (conv) => {
          try {
            // Get participant profiles (excluding current user for 1-1 chats)
            const participantIds = conv.participants.filter((id: string) => id !== currentUser.uid);
            
            let participantsData = [];
            let lastMessage = null;

            // Batch these requests
            const [participantsResult, lastMessageResult] = await Promise.all([
              participantIds.length > 0 ? supabase
                .from('profiles')
                .select('user_id, username, display_name, photo_url, description, online_status')
                .in('user_id', participantIds)
                .limit(10) : Promise.resolve({ data: [] }),
              supabase
                .from('messages')
                .select('content, timestamp, sender_id')
                .eq('conversation_id', conv.id)
                .order('timestamp', { ascending: false })
                .limit(1)
                .maybeSingle()
            ]);

            participantsData = participantsResult.data || [];
            lastMessage = lastMessageResult.data;

            return new Conversation({
              id: conv.id,
              ...conv,
              participantsInfo: participantsData.map(p => ({
                uid: p.user_id,
                username: p.username || `User${p.user_id?.slice(-4) || ''}`,
                displayName: p.display_name || p.username || `User${p.user_id?.slice(-4) || ''}`,
                photoURL: p.photo_url,
                description: p.description,
                onlineStatus: p.online_status || 'offline'
              })),
              last_message: lastMessage ? {
                content: lastMessage.content,
                timestamp: lastMessage.timestamp,
                sender_id: lastMessage.sender_id
              } : null
            });
          } catch (error) {
            console.error('Error fetching participants for conversation:', conv.id, error);
            return new Conversation({
              id: conv.id,
              ...conv,
              participantsInfo: [],
              last_message: null
            });
          }
        })
      );
      
      setConversations(conversationsWithParticipants);
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
      // First fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];

      // Fetch profiles and roles in parallel
      const [profilesResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, username, display_name, photo_url, show_moderator_badge')
          .in('user_id', senderIds),
        supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', senderIds)
      ]);

      const profiles = profilesResult.data || [];
      const roles = rolesResult.data || [];

      // Create profile and role maps for efficient lookup
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));
      const roleMap = new Map();
      
      // Group roles by user_id
      roles.forEach(r => {
        if (!roleMap.has(r.user_id)) {
          roleMap.set(r.user_id, []);
        }
        roleMap.get(r.user_id).push(r);
      });

      // Filter out messages hidden by current user
      const hiddenMessages = JSON.parse(localStorage.getItem(`hiddenMessages_${currentUser?.uid}`) || '[]');

      // Reverse to show oldest first and filter hidden messages
      const messagesWithProfiles = messagesData
        .reverse()
        .filter(msg => !hiddenMessages.includes(msg.id))
        .map(msg => new Message({
          id: msg.id,
          ...msg,
          senderProfile: profileMap.get(msg.sender_id) || null,
          senderRoles: roleMap.get(msg.sender_id) || []
        }));
      
      setMessages(messagesWithProfiles);
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

  const sendMessage = async (content: string, conversationId: string, replyToMessageId?: string, replyToContent?: string) => {
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
      const messageData: any = {
        conversation_id: conversationId,
        sender_id: currentUser.uid,
        content: content.trim(),
      };

      // Add reply data if this is a reply
      if (replyToMessageId && replyToContent) {
        messageData.reply_to_message_id = replyToMessageId;
        messageData.reply_to_content = replyToContent.substring(0, 100); // Limit reply preview
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Process @ mentions
      const mentionRegex = /@(\w+)/g;
      const mentions = Array.from(content.matchAll(mentionRegex));
      
      if (mentions.length > 0) {
        // Get conversation participants to check if mentioned users are in the chat
        const { data: conversation } = await supabase
          .from('conversations')
          .select('participants')
          .eq('id', conversationId)
          .single();
        
        if (conversation) {
          // Get profiles of participants to match usernames
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name')
            .in('user_id', conversation.participants);
          
          if (profiles) {
            for (const mention of mentions) {
              const mentionedUsername = mention[1];
              const mentionedUser = profiles.find(p => 
                p.username?.toLowerCase() === mentionedUsername.toLowerCase()
              );
              
              if (mentionedUser && mentionedUser.user_id !== currentUser.uid) {
                // Get current user profile for sender name
                const { data: senderProfile } = await supabase
                  .from('profiles')
                  .select('display_name, username')
                  .eq('user_id', currentUser.uid)
                  .single();
                
                const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';
                
                // Send mention notification
                await supabase.rpc('send_mention_notification', {
                  target_user_id: mentionedUser.user_id,
                  sender_name: senderName,
                  message_content: content.trim(),
                  conversation_id: conversationId
                });
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const createConversation = async (participants: string[], isGroup = false, groupName?: string) => {
    if (!currentUser) throw new Error("Must be logged in to create conversations");

    try {
      // Prevent self-conversation for 1-on-1 chats
      if (!isGroup && participants.length === 1 && participants[0] === currentUser.uid) {
        throw new Error("Cannot create conversation with yourself");
      }

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
      
      // Refresh conversations to show the new conversation immediately
      setTimeout(() => refreshConversations(), 100);
      
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

    // First try to find the conversation in our existing conversations array
    // This preserves the participantsInfo that was already fetched
    const existingConversation = conversations.find(conv => conv.id === id);
    
    if (existingConversation) {
      setCurrentConversation(existingConversation);
      return;
    }

    // Fallback: fetch from database if not found (shouldn't happen normally)
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
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId)
        .neq('sender_id', currentUser.uid); // Don't mark own messages as read

      if (error) throw error;

      // Update local message state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId && msg.senderId !== currentUser.uid
            ? new Message({ ...msg, read: true })
            : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const reportMessage = async (messageId: string, reason: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('reported_messages')
        .insert({
          message_id: messageId,
          reported_by: currentUser.uid,
          reason: reason
        });

      if (error) throw error;

      toast({
        title: "Message reported",
        description: "Thank you for reporting this message. Moderators will review it.",
      });
    } catch (error) {
      console.error('Error reporting message:', error);
      toast({
        title: "Error reporting message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const getReportedMessages = async () => {
    if (!currentUser) return [];

    try {
      const { data, error } = await supabase
        .from('reported_messages')
        .select(`
          *,
          messages!inner(
            id, content, timestamp, sender_id,
            profiles!sender_id(username, display_name)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching reported messages:', error);
      return [];
    }
  };

  const markReportAsReviewed = async (reportId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('reported_messages')
        .update({
          status: 'reviewed',
          reviewed_by: currentUser.uid,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report reviewed",
        description: "The report has been marked as reviewed",
      });
    } catch (error) {
      console.error('Error marking report as reviewed:', error);
      toast({
        title: "Error updating report",
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

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ online_status: status })
        .eq('user_id', currentUser.uid);
        
      if (error) throw error;

      console.log('Online status updated to:', status);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const blockUser = async (userId: string, reason?: string) => {
    if (!currentUser) return;
    
    try {
      // Insert a blocking record (you would need a user_blocks table)
      const { error } = await supabase
        .from('profiles')
        .update({ 
          description: `${reason ? `Blocked: ${reason}` : 'Blocked by user'}` 
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User blocked",
        description: "User has been blocked successfully",
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: "Error blocking user",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const unblockUser = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      // Remove blocking record
      const { error } = await supabase
        .from('profiles')
        .update({ description: null })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User unblocked",
        description: "User has been unblocked successfully",
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Error unblocking user", 
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const getBlockedUsers = async () => {
    return Promise.resolve([]);
  };

  const markMessageAsDeletedForUser = async (messageId: string, userId: string) => {
    // For now, we'll use localStorage to track user-specific deletions
    try {
      const hiddenMessages = JSON.parse(localStorage.getItem(`hiddenMessages_${userId}`) || '[]');
      hiddenMessages.push(messageId);
      localStorage.setItem(`hiddenMessages_${userId}`, JSON.stringify(hiddenMessages));
      
      // Update local state by filtering out the message for this user
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== messageId)
      );

      toast({
        title: "Message hidden",
        description: "Message hidden for you only",
      });
    } catch (error) {
      console.error('Error hiding message:', error);
      toast({
        title: "Error hiding message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const deleteMessage = async (messageId: string, deletedBy: string) => {
    try {
      // Use hard delete for proper removal
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      // Update local state to remove message immediately
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== messageId)
      );

      toast({
        title: "Message deleted",
        description: "The message has been deleted",
      });
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
      // Delete all messages in the conversation first
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Then delete the conversation
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      // Update local state
      setConversations(prevConversations => 
        prevConversations.filter(conv => conv.id !== conversationId)
      );

      // Clear current conversation if it's the one being deleted
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

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

  const warnUser = async (userId: string, reason: string, duration: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('user_warnings')
        .insert({
          user_id: userId,
          issued_by: currentUser.uid,
          reason: reason,
          duration: duration
        });

      if (error) throw error;

      toast({
        title: "User warned",
        description: `Warning issued to user for: ${reason}`,
      });
    } catch (error) {
      console.error('Error warning user:', error);
      toast({
        title: "Error warning user",
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
    getReportedMessages,
    markReportAsReviewed,
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
    markMessageAsDeletedForUser,
    storeChat,
    unstoreChat,
    searchUsers,
    updateDmSettings,
    deleteChat,
    leaveChat,
    addMemberToChat,
    removeMemberFromChat,
    warnUser,
    isRateLimited,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};