import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  getDoc,
  deleteDoc,
  Timestamp
} from "firebase/firestore";
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
  
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, "conversations"),
        where("participants", "array-contains", currentUser.uid)
      ),
      (snapshot) => {
        const conversationsData = snapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() };
          return new Conversation(data);
        });
        setConversations(conversationsData);
      },
      (error) => {
        console.error("Error fetching conversations:", error);
        toast({
          title: "Error fetching conversations",
          description: "Please try again later",
          variant: "destructive"
        });
      }
    );
    
    return () => unsubscribe();
  }, [currentUser, toast]);

  useEffect(() => {
    if (!currentConversation) {
      setMessages([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, "messages"),
        where("conversation_id", "==", currentConversation.id),
        orderBy("timestamp", "asc")
      ),
      (snapshot) => {
        const messagesData = snapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() };
          return new Message(data);
        });
        setMessages(messagesData);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error fetching messages",
          description: "Please try again later",
          variant: "destructive"
        });
      }
    );
    
    return () => unsubscribe();
  }, [currentConversation, toast]);

  const fetchConversations = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "conversations"),
        where("participants", "array-contains", currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const conversationsData = querySnapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        return new Conversation(data);
      });
      
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
      const q = query(
        collection(db, "messages"),
        where("conversation_id", "==", conversationId),
        orderBy("timestamp", "asc")
      );
      
      const querySnapshot = await getDocs(q);
      const messagesData = querySnapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        return new Message(data);
      });
      
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
    
    // If this is the first message or it's been more than 2 seconds since last message
    if (!lastMessageTime || (now.getTime() - lastMessageTime.getTime() > 2000)) { 
      setLastMessageTime(now);
      setIsRateLimited(false);
      return false;
    }
    
    // If we've sent a message less than 2 seconds ago, rate limit
    setIsRateLimited(true);
    
    // Reset rate limit after 2 seconds
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

    // Apply rate limiting
    if (checkRateLimit()) {
      toast({
        title: "Slow down",
        description: "Please wait 2 seconds between messages",
        variant: "destructive"
      });
      return;
    }

    try {
      await addDoc(collection(db, "messages"), {
        conversation_id: conversationId,
        sender_id: currentUser.uid,
        content: content.trim(),
        timestamp: serverTimestamp(),
        read: false,
        delivered: true,
        reported: false,
        flagged_for_moderation: false,
        deleted: false
      });
      
      // Update last message in conversation
      await updateDoc(doc(db, "conversations", conversationId), {
        last_message: {
          content: content.trim(),
          timestamp: serverTimestamp(),
          sender_id: currentUser.uid
        }
      });
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

      const conversationData = {
        participants,
        is_group_chat: isGroup,
        group_name: groupName,
        created_by: currentUser.uid,
        created_at: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "conversations"), conversationData);
      return docRef.id;
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
    return createConversation(participants, true, groupName);
  };

  const setCurrentConversationId = async (id: string | null) => {
    if (!id) {
      setCurrentConversation(null);
      return;
    }

    try {
      const conversationDoc = await getDoc(doc(db, "conversations", id));
      if (conversationDoc.exists()) {
        const conversationData = { id: conversationDoc.id, ...conversationDoc.data() };
        setCurrentConversation(new Conversation(conversationData));
      } else {
        throw new Error("Conversation not found");
      }
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
      await updateDoc(doc(db, "messages", messageId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const reportMessage = async (messageId: string, reason: string) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        reported: true,
        flagged_for_moderation: true
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
      await updateDoc(doc(db, "messages", messageId), {
        deleted: true,
        deleted_by: deletedBy
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
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        const newConv = new Conversation({...conv, isStored: true});
        return newConv;
      }
      return conv;
    });
    
    setConversations(updatedConversations);
    
    if (currentConversation && currentConversation.id === conversationId) {
      setCurrentConversation(new Conversation({...currentConversation, isStored: true}));
    }
    
    toast({
      title: "Chat stored",
      description: "This feature is not fully implemented with database storage",
    });
    
    return Promise.resolve();
  };

  const unstoreChat = async (conversationId: string) => {
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        const newConv = new Conversation({...conv, isStored: false});
        return newConv;
      }
      return conv;
    });
    
    setConversations(updatedConversations);
    
    if (currentConversation && currentConversation.id === conversationId) {
      setCurrentConversation(new Conversation({...currentConversation, isStored: false}));
    }
    
    toast({
      title: "Chat unstored",
      description: "This feature is not fully implemented with database storage",
    });
    
    return Promise.resolve();
  };

  const processConversations = async (convs: Conversation[]) => {
    if (!currentUser || convs.length === 0) return convs;
    
    // Fetch user information for participants
    const processedConvs = await Promise.all(convs.map(async (conv) => {
      // Exclude current user from participants to fetch
      const otherParticipants = conv.participants.filter(uid => uid !== currentUser.uid);
      
      // This would be where you'd fetch user data for each participant
      // For simplicity, we'll create placeholder data
      const participantsInfo = otherParticipants.map(uid => ({
        uid,
        displayName: "User",
        username: "user",
        photoURL: undefined,
        onlineStatus: 'offline' as const
      }));
      
      // Return a new Conversation with participantsInfo
      return new Conversation({
        ...conv,
        participantsInfo
      });
    }));
    
    return processedConvs;
  };

  const searchUsers = async (query: string): Promise<ExtendedUser[]> => {
    // Mock implementation
    toast({
      title: "Feature not implemented",
      description: "User search feature is not yet implemented",
    });
    return Promise.resolve([]);
  };

  const updateDmSettings = async (settings: any) => {
    toast({
      title: "Feature not implemented",
      description: "DM settings update is not yet implemented",
    });
    return Promise.resolve();
  };

  const deleteChat = async (conversationId: string) => {
    if (!currentUser) return;
    
    try {
      // First check if user is part of this conversation
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        throw new Error("Conversation not found");
      }
      
      const conversationData = conversationSnap.data();
      if (!conversationData.participants.includes(currentUser.uid)) {
        throw new Error("You are not a member of this conversation");
      }
      
      // If it's a group chat and user is not creator, use leaveChat instead
      if (conversationData.is_group_chat && conversationData.created_by !== currentUser.uid) {
        return leaveChat(conversationId);
      }
      
      // Delete all messages in the conversation
      const messagesQuery = query(
        collection(db, "messages"),
        where("conversation_id", "==", conversationId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const messageDeletionPromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(messageDeletionPromises);
      
      // Delete the conversation
      await deleteDoc(conversationRef);
      
      // Reset currentConversation if it was the deleted one
      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation(null);
      }
      
      // Update conversations list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      toast({
        title: "Chat deleted",
        description: "The conversation has been deleted"
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error deleting conversation",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const leaveChat = async (conversationId: string) => {
    if (!currentUser) return;
    
    try {
      // Get the conversation
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        throw new Error("Conversation not found");
      }
      
      const conversationData = conversationSnap.data();
      
      // You can only leave group chats
      if (!conversationData.is_group_chat) {
        throw new Error("You can only leave group chats");
      }
      
      // Remove user from participants
      const updatedParticipants = conversationData.participants.filter(
        (uid: string) => uid !== currentUser.uid
      );
      
      if (updatedParticipants.length === 0) {
        // If no participants left, delete the conversation
        await deleteChat(conversationId);
      } else {
        // Update the conversation with new participants list
        await updateDoc(conversationRef, {
          participants: updatedParticipants
        });
        
        // Add a system message that user left
        await addDoc(collection(db, "messages"), {
          conversation_id: conversationId,
          sender_id: "system",
          content: `${currentUser.displayName || currentUser.email || "User"} has left the chat`,
          timestamp: serverTimestamp(),
          read: false,
          delivered: true,
          is_system_message: true
        });
        
        // Reset currentConversation if it was the left one
        if (currentConversation && currentConversation.id === conversationId) {
          setCurrentConversation(null);
        }
        
        // Update conversations list
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      }
      
      toast({
        title: "Left chat",
        description: "You have left the conversation"
      });
    } catch (error) {
      console.error('Error leaving conversation:', error);
      toast({
        title: "Error leaving conversation",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const addMemberToChat = async (conversationId: string, userId: string) => {
    if (!currentUser) return;
    
    try {
      // Get the conversation
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        throw new Error("Conversation not found");
      }
      
      const conversationData = conversationSnap.data();
      
      // Only group chats can have members added
      if (!conversationData.is_group_chat) {
        throw new Error("You can only add members to group chats");
      }
      
      // Check if user is already a member
      if (conversationData.participants.includes(userId)) {
        throw new Error("User is already a member of this chat");
      }
      
      // Get the new member's display name
      const userSnap = await getDoc(doc(db, "users", userId));
      let memberName = "User";
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        memberName = userData.displayName || userData.username || userData.email || "User";
      }
      
      // Add user to participants
      const updatedParticipants = [...conversationData.participants, userId];
      
      await updateDoc(conversationRef, {
        participants: updatedParticipants
      });
      
      // Add a system message that user was added
      await addDoc(collection(db, "messages"), {
        conversation_id: conversationId,
        sender_id: "system",
        content: `${currentUser.displayName || currentUser.email || "User"} added ${memberName} to the chat`,
        timestamp: serverTimestamp(),
        read: false,
        delivered: true,
        is_system_message: true
      });
      
      toast({
        title: "Member added",
        description: `${memberName} has been added to the chat`
      });
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error adding member",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const removeMemberFromChat = async (conversationId: string, userId: string) => {
    if (!currentUser) return;
    
    try {
      // Get the conversation
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        throw new Error("Conversation not found");
      }
      
      const conversationData = conversationSnap.data();
      
      // Only group chats can have members removed
      if (!conversationData.is_group_chat) {
        throw new Error("You can only remove members from group chats");
      }
      
      // Only the creator can remove members
      if (conversationData.created_by !== currentUser.uid) {
        throw new Error("Only the creator can remove members");
      }
      
      // Can't remove yourself (use leaveChat instead)
      if (userId === currentUser.uid) {
        throw new Error("You can't remove yourself. Use 'Leave Chat' instead");
      }
      
      // Get the removed member's display name
      const userSnap = await getDoc(doc(db, "users", userId));
      let memberName = "User";
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        memberName = userData.displayName || userData.username || userData.email || "User";
      }
      
      // Remove user from participants
      const updatedParticipants = conversationData.participants.filter(
        (uid: string) => uid !== userId
      );
      
      await updateDoc(conversationRef, {
        participants: updatedParticipants
      });
      
      // Add a system message that user was removed
      await addDoc(collection(db, "messages"), {
        conversation_id: conversationId,
        sender_id: "system",
        content: `${currentUser.displayName || currentUser.email || "User"} removed ${memberName} from the chat`,
        timestamp: serverTimestamp(),
        read: false,
        delivered: true,
        is_system_message: true
      });
      
      toast({
        title: "Member removed",
        description: `${memberName} has been removed from the chat`
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error removing member",
        description: error instanceof Error ? error.message : "Please try again later",
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
    isRateLimited
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;
