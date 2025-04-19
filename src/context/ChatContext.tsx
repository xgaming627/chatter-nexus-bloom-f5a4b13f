
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
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "@/components/ui/use-toast";

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

  // Fetch user's conversations
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessage.timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const conversationsData: Conversation[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Omit<Conversation, 'id' | 'participantsInfo'>;
        const participantsInfo: User[] = [];
        
        // Fetch participant info for each conversation
        for (const pid of data.participants) {
          if (pid !== currentUser.uid) {
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
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch messages for current conversation
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
        
        // Fetch participant info for each conversation
        for (const pid of data.participants) {
          if (pid !== currentUser?.uid) {
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
      // Include the current user in participants
      if (!participantIds.includes(currentUser.uid)) {
        participantIds.push(currentUser.uid);
      }
      
      // For one-on-one chats, check if conversation already exists
      if (!isGroup && participantIds.length === 2) {
        const existingConvs = conversations.filter(c => 
          !c.isGroupChat && 
          c.participants.includes(participantIds[0]) && 
          c.participants.includes(participantIds[1])
        );
        
        if (existingConvs.length > 0) {
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
      // Check if content contains any words that should be flagged
      const bannedWords = ["badword1", "badword2", "badword3"]; // Simplified example
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
      
      // Add message to messages collection
      const docRef = await addDoc(collection(db, "messages"), messageData);
      
      // Update conversation with last message
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: {
          content,
          timestamp: serverTimestamp(),
          senderId: currentUser.uid
        }
      });
      
      // If message is flagged, add to moderation queue
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
      // Start upload indication
      toast({
        title: "Uploading file...",
        description: "Please wait",
      });
      
      // Create a reference for the file in storage
      const fileRef = ref(storage, `chat-files/${conversationId}/${Date.now()}-${file.name}`);
      
      // Upload the file
      const uploadResult = await uploadBytes(fileRef, file);
      
      // Get the download URL
      const fileURL = await getDownloadURL(uploadResult.ref);
      
      // Create the message with file information
      const messageData = {
        conversationId,
        senderId: currentUser.uid,
        content: `File: ${file.name}`,
        timestamp: serverTimestamp(),
        read: false,
        fileURL,
        fileName: file.name,
        fileType: file.type
      };
      
      // Add message to messages collection
      await addDoc(collection(db, "messages"), messageData);
      
      // Update conversation with last message
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: {
          content: `File: ${file.name}`,
          timestamp: serverTimestamp(),
          senderId: currentUser.uid,
          fileURL
        }
      });
      
      toast({
        title: "File uploaded successfully",
      });
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Failed to upload file",
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
      
      // Mark message as reported
      await updateDoc(messageRef, {
        reported: true
      });
      
      // Add to moderation queue
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

  // Mock functions for video/voice calls (would require more complex implementation with WebRTC)
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
    endCall
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
