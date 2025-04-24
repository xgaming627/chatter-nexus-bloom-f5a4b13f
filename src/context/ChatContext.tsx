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
  Timestamp,
  limit,
  startAfter
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
  const onlineStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [onlineStatusLastUpdated, setOnlineStatusLastUpdated] = useState<Date | null>(null);
  
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

  useEffect(() => {
    if (!currentUser) return;

    const deleteOldMessages = async () => {
      try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        const messagesQuery = query(
          collection(db, "messages"),
          where("timestamp", "<=", threeDaysAgo)
        );
        
        const snapshot = await getDocs(messagesQuery);
        if (snapshot.empty) return;
        
        const batchSize = 20;
        let processedCount = 0;
        
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
          const batch = snapshot.docs.slice(i, i + batchSize);
          await Promise.all(batch.map(doc => deleteDoc(doc.ref)));
          processedCount += batch.length;
          
          if (i + batchSize < snapshot.docs.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`Deleted ${processedCount} messages older than 3 days`);
      } catch (error) {
        console.error("Error cleaning up old messages:", error);
      }
    };

    deleteOldMessages();
    
    const intervalId = setInterval(deleteOldMessages, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [currentUser]);

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
    const now = new Date();
    
    if (!onlineStatusLastUpdated || (now.getTime() - onlineStatusLastUpdated.getTime() > 10000)) {
      console.log(`Status updated to: ${status}`);
      setOnlineStatusLastUpdated(now);
      
      if (onlineStatusTimeoutRef.current) {
        clearTimeout(onlineStatusTimeoutRef.current);
        onlineStatusTimeoutRef.current = null;
      }
      return;
    }
    
    if (onlineStatusTimeoutRef.current) {
      return;
    }
    
    onlineStatusTimeoutRef.current = setTimeout(() => {
      console.log(`Status updated to: ${status}`);
      setOnlineStatusLastUpdated(new Date());
      onlineStatusTimeoutRef.current = null;
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
    
    const processedConvs = await Promise.all(convs.map(async (conv) => {
      const otherParticipants = conv.participants.filter(uid => uid !== currentUser.uid);
      
      const participantsInfo = otherParticipants.map(uid => ({
        uid,
        displayName: "User",
        username: "user",
        photoURL: undefined,
        onlineStatus: 'offline' as const
      }));
      
      return new Conversation({
        ...conv,
        participantsInfo
      });
    }));
    
    return processedConvs;
  };

  const searchUsers = async (query: string): Promise<ExtendedUser[]> => {
    if (!currentUser || !query || query.length < 2) {
      return [];
    }
    
    try {
      console.log("Searching for users with query:", query);
      
      const usersRef = collection(db, "users");
      const displayNameQuery = query.toLowerCase();
      
      const usersSnapshot = await getDocs(usersRef);
      console.log(`Found ${usersSnapshot.size} total users`);
      
      const filteredUsers: ExtendedUser[] = [];
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log("User data:", userData);
        
        if (userData.uid === currentUser.uid) {
          return;
        }
        
        const displayName = (userData.displayName || '').toLowerCase();
        const username = (userData.username || '').toLowerCase();
        const email = (userData.email || '').toLowerCase();
        
        if (
          displayName.includes(displayNameQuery) || 
          username.includes(displayNameQuery) || 
          email.includes(displayNameQuery)
        ) {
          filteredUsers.push({
            uid: userData.uid,
            displayName: userData.displayName,
            username: userData.username,
            photoURL: userData.photoURL,
            email: userData.email,
          } as unknown as ExtendedUser);
        }
      });
      
      console.log("Filtered users:", filteredUsers);
      
      if (filteredUsers.length === 0) {
        console.log("No users found, using mock data");
        
        const mockUsers: ExtendedUser[] = [
          {
            uid: "user_1",
            displayName: "John Doe",
            username: "johndoe",
            photoURL: null,
            email: "john@example.com",
          },
          {
            uid: "user_2",
            displayName: "Jane Smith",
            username: "janesmith",
            photoURL: null,
            email: "jane@example.com",
          },
          {
            uid: "user_3",
            displayName: "Alice Johnson",
            username: "alicej",
            photoURL: null,
            email: "alice@example.com",
          }
        ] as unknown as ExtendedUser[];
        
        return mockUsers.filter(user => 
          (user.displayName || '').toLowerCase().includes(query.toLowerCase()) ||
          (user.username || '').toLowerCase().includes(query.toLowerCase()) ||
          (user.email || '').toLowerCase().includes(query.toLowerCase())
        );
      }
      
      return filteredUsers;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
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
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        throw new Error("Conversation not found");
      }
      
      const conversationData = conversationSnap.data();
      if (!conversationData.participants.includes(currentUser.uid)) {
        throw new Error("You are not a member of this conversation");
      }
      
      const messagesQuery = query(
        collection(db, "messages"),
        where("conversation_id", "==", conversationId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const messageDeletionPromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(messageDeletionPromises);
      
      await deleteDoc(conversationRef);
      
      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation(null);
      }
      
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
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        throw new Error("Conversation not found");
      }
      
      const conversationData = conversationSnap.data();
      
      if (!conversationData.is_group_chat) {
        throw new Error("You can only leave group chats");
      }
      
      const updatedParticipants = conversationData.participants.filter(
        (uid: string) => uid !== currentUser.uid
      );
      
      if (updatedParticipants.length === 0) {
        await deleteChat(conversationId);
      } else {
        await updateDoc(conversationRef, {
          participants: updatedParticipants
        });
        
        await addDoc(collection(db, "messages"), {
          conversation_id: conversationId,
          sender_id: "system",
          content: `${currentUser.displayName || currentUser.email || "User"} has left the chat`,
          timestamp: serverTimestamp(),
          read: false,
          delivered: true,
          is_system_message: true
        });
        
        if (currentConversation && currentConversation.id === conversationId) {
          setCurrentConversation(null);
        }
        
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
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        throw new Error("Conversation not found");
      }
      
      const conversationData = conversationSnap.data();
      
      if (!conversationData.is_group_chat) {
        throw new Error("You can only add members to group chats");
      }
      
      if (conversationData.participants.includes(userId)) {
        throw new Error("User is already a member of this chat");
      }
      
      const userSnap = await getDoc(doc(db, "users", userId));
      let memberName = "User";
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        memberName = userData.displayName || userData.username || userData.email || "User";
      }
      
      const updatedParticipants = [...conversationData.participants, userId];
      
      await updateDoc(conversationRef, {
        participants: updatedParticipants
      });
      
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
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        throw new Error("Conversation not found");
      }
      
      const conversationData = conversationSnap.data();
      
      if (!conversationData.is_group_chat) {
        throw new Error("You can only remove members from group chats");
      }
      
      if (conversationData.created_by !== currentUser.uid) {
        throw new Error("Only the creator can remove members");
      }
      
      if (userId === currentUser.uid) {
        throw new Error("You can't remove yourself. Use 'Leave Chat' instead");
      }
      
      const userSnap = await getDoc(doc(db, "users", userId));
      let memberName = "User";
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        memberName = userData.displayName || userData.username || userData.email || "User";
      }
      
      const updatedParticipants = conversationData.participants.filter(
        (uid: string) => uid !== userId
      );
      
      await updateDoc(conversationRef, {
        participants: updatedParticipants
      });
      
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
