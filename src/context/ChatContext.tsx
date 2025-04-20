import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
  setDoc,
  arrayUnion,
  getDocs
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: any;
  read: boolean;
  fileURL?: string;
  fileName?: string;
  fileType?: string;
  reported?: boolean;
  flaggedForModeration?: boolean;
}

export interface User {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  photoURL: string;
  status?: string;
  role?: string;
  description?: string;
  onlineStatus?: 'online' | 'away' | 'offline';
  blockedUsers?: string[];
  warnings?: number;
  banExpiry?: any;
  ipAddress?: string;
  vpnDetected?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantsInfo: User[];
  lastMessage?: {
    content: string;
    timestamp: any;
    senderId: string;
    fileURL?: string;
  };
  isGroupChat: boolean;
  groupName?: string;
  groupPhotoURL?: string;
  createdBy: string;
  createdAt: any;
}

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  searchUsers: (query: string) => Promise<User[]>;
  createConversation: (participants: string[], isGroup?: boolean, groupName?: string) => Promise<string>;
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  uploadFile: (file: File, conversationId: string) => Promise<void>;
  setCurrentConversationId: (id: string | null) => void;
  markAsRead: (messageId: string) => Promise<void>;
  reportMessage: (messageId: string, reason: string) => Promise<void>;
  createGroupChat: (name: string, participants: string[]) => Promise<string>;
  startVideoCall: (conversationId: string) => void;
  startVoiceCall: (conversationId: string) => void;
  isCallActive: boolean;
  activeCallType: 'video' | 'voice' | null;
  endCall: () => void;
  refreshConversations: () => void;
  updateUserDescription: (description: string) => Promise<void>;
  updateOnlineStatus: (status: 'online' | 'away' | 'offline') => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  getBlockedUsers: () => Promise<User[]>;
  hasNewMessages: boolean;
  clearNewMessagesFlag: () => void;
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
  const [activeCallType, setActiveCallType] = useState<'video' | 'voice' | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const bannedWords = [
    "badword", "profanity", "offensive", "slur", "inappropriate", "banned",
  ];

  useEffect(() => {
    if (!currentUser) return;

    const loadBlockedUsers = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists() && userDoc.data().blockedUsers) {
          setBlockedUsers(userDoc.data().blockedUsers);
        }
      } catch (error) {
        console.error("Error loading blocked users:", error);
      }
    };

    loadBlockedUsers();

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessage.timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const conversationsData: Conversation[] = [];
      let newMessages = false;
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Omit<Conversation, 'id' | 'participantsInfo'>;
        const participantsInfo: User[] = [];
        
        if (data.lastMessage && 
            data.lastMessage.senderId !== currentUser.uid && 
            !currentConversation?.id) {
          newMessages = true;
        }
        
        for (const pid of data.participants) {
          if (pid !== currentUser.uid && !blockedUsers.includes(pid)) {
            const userDocRef = doc(db, "users", pid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              participantsInfo.push(userDocSnap.data() as User);
            }
          }
        }
        
        conversationsData.push({
          id: docSnap.id,
          ...data,
          participantsInfo
        });
      }
      
      setConversations(conversationsData);
      if (newMessages) {
        setHasNewMessages(true);
      }
    });
    
    return () => unsubscribe();
  }, [currentUser, currentConversation, blockedUsers]);

  useEffect(() => {
    if (!currentConversation) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "messages"),
      where("conversationId", "==", currentConversation.id),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData: Message[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      
      setMessages(messagesData);
    });
    
    return () => unsubscribe();
  }, [currentConversation]);

  const setCurrentConversationId = async (id: string | null) => {
    if (!id) {
      setCurrentConversation(null);
      return;
    }
    
    try {
      const conversationDoc = await getDoc(doc(db, "conversations", id));
      
      if (conversationDoc.exists()) {
        const data = conversationDoc.data() as Omit<Conversation, 'id' | 'participantsInfo'>;
        const participantsInfo: User[] = [];
        
        for (const pid of data.participants) {
          if (pid !== currentUser?.uid && !blockedUsers.includes(pid)) {
            const userDoc = await getDoc(doc(db, "users", pid));
            if (userDoc.exists()) {
              participantsInfo.push(userDoc.data() as User);
            }
          }
        }
        
        setCurrentConversation({
          id: conversationDoc.id,
          ...data,
          participantsInfo
        });
        setHasNewMessages(false);
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };

  const searchUsers = async (query: string): Promise<User[]> => {
    if (!query || query.length < 2) return [];
    
    try {
      const q = query.toLowerCase();
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      
      const users = snapshot.docs
        .map(doc => doc.data() as User)
        .filter(user => 
          user.uid !== currentUser?.uid && 
          !blockedUsers.includes(user.uid) &&
          (user.username.toLowerCase().includes(q) || 
           user.displayName.toLowerCase().includes(q))
        );
      
      return users;
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    }
  };

  const createConversation = async (participantIds: string[], isGroup = false, groupName?: string) => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      if (!participantIds.includes(currentUser.uid)) {
        participantIds.push(currentUser.uid);
      }
      
      for (const pid of participantIds) {
        if (blockedUsers.includes(pid)) {
          throw new Error("Cannot create conversation with blocked users");
        }
      }
      
      if (!isGroup && participantIds.length === 2) {
        const existingConvs = conversations.filter(c => 
          !c.isGroupChat && 
          c.participants.includes(participantIds[0]) && 
          c.participants.includes(participantIds[1])
        );
        
        if (existingConvs.length > 0) {
          await setCurrentConversationId(existingConvs[0].id);
          return existingConvs[0].id;
        }
      }
      
      const conversationData: Omit<Conversation, 'id' | 'participantsInfo'> = {
        participants: participantIds,
        lastMessage: {
          content: isGroup ? "Group chat created" : "Conversation started",
          timestamp: serverTimestamp(),
          senderId: currentUser.uid
        },
        isGroupChat: isGroup,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      };
      
      if (isGroup && groupName) {
        conversationData.groupName = groupName;
      }
      
      const docRef = await addDoc(collection(db, "conversations"), conversationData);
      await setCurrentConversationId(docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Failed to create conversation",
        description: "Please try again later",
        variant: "destructive"
      });
      throw error;
    }
  };

  const sendMessage = async (content: string, conversationId: string) => {
    if (!currentUser) throw new Error("You must be logged in");
    if (!content.trim()) return;
    
    try {
      const shouldFlag = bannedWords.some(word => 
        content.toLowerCase().includes(word.toLowerCase())
      );
      
      const messageData = {
        conversationId,
        senderId: currentUser.uid,
        content,
        timestamp: serverTimestamp(),
        read: false,
        flaggedForModeration: shouldFlag
      };
      
      const docRef = await addDoc(collection(db, "messages"), messageData);
      
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: {
          content,
          timestamp: serverTimestamp(),
          senderId: currentUser.uid
        }
      });
      
      if (shouldFlag) {
        await addDoc(collection(db, "moderation"), {
          messageId: docRef.id,
          conversationId,
          content,
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
          reason: "Automatic flagging - banned words",
          status: "pending"
        });
        
        toast({
          title: "Message flagged",
          description: "Your message was flagged for review due to potentially inappropriate content",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const uploadFile = async (file: File, conversationId: string) => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Unsupported file type",
          description: "Only image files are supported",
          variant: "destructive"
        });
        return;
      }
      
      const maxSizeInBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "File upload not available",
        description: "File storage is not configured in this app",
        variant: "destructive"
      });
      
      await sendMessage(`[File upload attempted: ${file.name}]`, conversationId);
    } catch (error) {
      console.error("Error handling file:", error);
      toast({
        title: "Failed to handle file",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        read: true
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const reportMessage = async (messageId: string, reason: string) => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      const messageRef = doc(db, "messages", messageId);
      const messageSnap = await getDoc(messageRef);
      
      if (!messageSnap.exists()) {
        throw new Error("Message not found");
      }
      
      const messageData = messageSnap.data() as Message;
      
      await updateDoc(messageRef, {
        reported: true
      });
      
      await addDoc(collection(db, "moderation"), {
        messageId,
        conversationId: messageData.conversationId,
        content: messageData.content,
        senderId: messageData.senderId,
        reportedBy: currentUser.uid,
        timestamp: serverTimestamp(),
        reason,
        status: "pending"
      });
      
      toast({
        title: "Message reported",
        description: "A moderator will review this message"
      });
    } catch (error) {
      console.error("Error reporting message:", error);
      toast({
        title: "Failed to report message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const createGroupChat = async (name: string, participantIds: string[]) => {
    return createConversation(participantIds, true, name);
  };

  const startVideoCall = (conversationId: string) => {
    setIsCallActive(true);
    setActiveCallType('video');
    toast({
      title: "Video call started",
      description: "This is a mock implementation"
    });
  };

  const startVoiceCall = (conversationId: string) => {
    setIsCallActive(true);
    setActiveCallType('voice');
    toast({
      title: "Voice call started",
      description: "This is a mock implementation"
    });
  };

  const endCall = () => {
    setIsCallActive(false);
    setActiveCallType(null);
  };

  const refreshConversations = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, "conversations"),
        where("participants", "array-contains", currentUser.uid),
        orderBy("lastMessage.timestamp", "desc")
      );
      
      const snapshot = await getDocs(q);
      const conversationsData: Conversation[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Omit<Conversation, 'id' | 'participantsInfo'>;
        const participantsInfo: User[] = [];
        
        for (const pid of data.participants) {
          if (pid !== currentUser.uid && !blockedUsers.includes(pid)) {
            const userDocRef = doc(db, "users", pid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              participantsInfo.push(userDocSnap.data() as User);
            }
          }
        }
        
        conversationsData.push({
          id: docSnap.id,
          ...data,
          participantsInfo
        });
      }
      
      setConversations(conversationsData);
    } catch (error) {
      console.error("Error refreshing conversations:", error);
      toast({
        title: "Failed to refresh conversations",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const updateUserDescription = async (description: string) => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        description
      });
      
      toast({
        title: "Profile updated",
        description: "Your description has been updated"
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Failed to update profile",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const updateOnlineStatus = async (status: 'online' | 'away' | 'offline') => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        onlineStatus: status
      });
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  };

  const blockUser = async (userId: string) => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(userId)
      });
      
      setBlockedUsers([...blockedUsers, userId]);
      
      toast({
        title: "User blocked",
        description: "You will no longer receive messages from this user"
      });
    } catch (error) {
      console.error("Error blocking user:", error);
      toast({
        title: "Failed to block user",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const unblockUser = async (userId: string) => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      const userRef = doc(db, "users", currentUser.uid);
      
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updatedBlockedList = (userData.blockedUsers || []).filter(
          (id: string) => id !== userId
        );
        
        await updateDoc(userRef, {
          blockedUsers: updatedBlockedList
        });
        
        setBlockedUsers(updatedBlockedList);
        
        toast({
          title: "User unblocked",
          description: "You can now receive messages from this user"
        });
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast({
        title: "Failed to unblock user",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const getBlockedUsers = async (): Promise<User[]> => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const blockedIds = userData.blockedUsers || [];
        
        const blockedUsersList: User[] = [];
        for (const userId of blockedIds) {
          const blockedUserDoc = await getDoc(doc(db, "users", userId));
          if (blockedUserDoc.exists()) {
            blockedUsersList.push(blockedUserDoc.data() as User);
          }
        }
        
        return blockedUsersList;
      }
      return [];
    } catch (error) {
      console.error("Error getting blocked users:", error);
      return [];
    }
  };

  const clearNewMessagesFlag = () => {
    setHasNewMessages(false);
  };

  const value = {
    conversations,
    currentConversation,
    messages,
    searchUsers,
    createConversation,
    sendMessage,
    uploadFile,
    setCurrentConversationId,
    markAsRead,
    reportMessage,
    createGroupChat,
    startVideoCall,
    startVoiceCall,
    isCallActive,
    activeCallType,
    endCall,
    refreshConversations,
    updateUserDescription,
    updateOnlineStatus,
    blockUser,
    unblockUser,
    getBlockedUsers,
    hasNewMessages,
    clearNewMessagesFlag
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
