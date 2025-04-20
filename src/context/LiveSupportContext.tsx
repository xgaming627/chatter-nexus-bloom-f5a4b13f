
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
  getDocs
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface SupportMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderRole: 'user' | 'moderator' | 'system';
  content: string;
  timestamp: any;
  read: boolean;
}

export interface SupportSession {
  id: string;
  userId: string;
  userInfo?: {
    displayName: string;
    email: string;
    username: string;
    uid: string;
    photoURL?: string;
    createdAt?: any;
    messageCount?: number;
  };
  createdAt: any;
  lastMessage?: {
    content: string;
    timestamp: any;
    senderId: string;
  };
  status: 'active' | 'ended' | 'requested-end';
  rating?: number;
  feedback?: string;
}

interface LiveSupportContextType {
  supportSessions: SupportSession[];
  currentSupportSession: SupportSession | null;
  supportMessages: SupportMessage[];
  createSupportSession: () => Promise<string>;
  sendSupportMessage: (content: string) => Promise<void>;
  setCurrentSupportSessionId: (id: string | null) => void;
  requestEndSupport: () => Promise<void>;
  forceEndSupport: () => Promise<void>;
  submitFeedback: (rating: number, feedback?: string) => Promise<void>;
  isActiveSupportSession: boolean;
  isModerator: boolean;
  getUserSupportStats: (userId: string) => Promise<any>;
}

const LiveSupportContext = createContext<LiveSupportContextType | null>(null);

export const useLiveSupport = () => {
  const context = useContext(LiveSupportContext);
  if (!context) {
    throw new Error("useLiveSupport must be used within a LiveSupportProvider");
  }
  return context;
};

export const LiveSupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [supportSessions, setSupportSessions] = useState<SupportSession[]>([]);
  const [currentSupportSession, setCurrentSupportSession] = useState<SupportSession | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [isActiveSupportSession, setIsActiveSupportSession] = useState(false);
  
  // Check if current user is a moderator
  useEffect(() => {
    if (!currentUser) return;
    
    // For demo purposes, we'll check if the email is the specified mod email
    if (currentUser.email === 'vitorrossato812@gmail.com') {
      setIsModerator(true);
    } else {
      setIsModerator(false);
    }
  }, [currentUser]);
  
  // Load support sessions based on user role
  useEffect(() => {
    if (!currentUser) return;
    
    let q;
    
    if (isModerator) {
      // Moderators see all active support sessions
      q = query(
        collection(db, "supportSessions"),
        where("status", "==", "active"),
        orderBy("lastMessage.timestamp", "desc")
      );
    } else {
      // Regular users only see their own sessions
      q = query(
        collection(db, "supportSessions"),
        where("userId", "==", currentUser.uid),
        orderBy("lastMessage.timestamp", "desc")
      );
    }
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sessionsData: SupportSession[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Omit<SupportSession, 'id' | 'userInfo'>;
        
        // Get user info for each session
        let userInfo;
        if (isModerator) {
          const userDocRef = doc(db, "users", data.userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            userInfo = userDocSnap.data();
            
            // Count user's messages
            const messagesQuery = query(
              collection(db, "messages"),
              where("senderId", "==", data.userId)
            );
            const messagesSnap = await getDocs(messagesQuery);
            userInfo.messageCount = messagesSnap.size;
          }
        }
        
        sessionsData.push({
          id: docSnap.id,
          ...data,
          userInfo
        });
      }
      
      setSupportSessions(sessionsData);
      
      // Set active session flag
      if (!isModerator) {
        const hasActiveSession = sessionsData.some(session => session.status === 'active');
        setIsActiveSupportSession(hasActiveSession);
      }
    });
    
    return () => unsubscribe();
  }, [currentUser, isModerator]);
  
  // Load messages for current support session
  useEffect(() => {
    if (!currentSupportSession) {
      setSupportMessages([]);
      return;
    }
    
    const q = query(
      collection(db, "supportMessages"),
      where("sessionId", "==", currentSupportSession.id),
      orderBy("timestamp", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData: SupportMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SupportMessage));
      
      setSupportMessages(messagesData);
    });
    
    return () => unsubscribe();
  }, [currentSupportSession]);
  
  const setCurrentSupportSessionId = async (id: string | null) => {
    if (!id) {
      setCurrentSupportSession(null);
      return;
    }
    
    try {
      const sessionDoc = await getDoc(doc(db, "supportSessions", id));
      
      if (sessionDoc.exists()) {
        const data = sessionDoc.data() as SupportSession;
        
        // Get user info if moderator
        if (isModerator) {
          const userDocRef = doc(db, "users", data.userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            data.userInfo = userDocSnap.data() as any;
            
            // Count user's messages
            const messagesQuery = query(
              collection(db, "messages"),
              where("senderId", "==", data.userId)
            );
            const messagesSnap = await getDocs(messagesQuery);
            data.userInfo.messageCount = messagesSnap.size;
          }
        }
        
        setCurrentSupportSession({
          id: sessionDoc.id,
          ...data
        });
      }
    } catch (error) {
      console.error("Error fetching support session:", error);
    }
  };
  
  const createSupportSession = async () => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      // Check if user already has an active support session
      if (isActiveSupportSession) {
        const existingSession = supportSessions.find(s => s.status === 'active');
        if (existingSession) {
          setCurrentSupportSessionId(existingSession.id);
          return existingSession.id;
        }
      }
      
      const sessionData = {
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        status: 'active',
        lastMessage: {
          content: "Support session started",
          timestamp: serverTimestamp(),
          senderId: "system"
        }
      };
      
      const docRef = await addDoc(collection(db, "supportSessions"), sessionData);
      
      // Send automatic welcome message
      await addDoc(collection(db, "supportMessages"), {
        sessionId: docRef.id,
        senderId: "system",
        senderRole: "system",
        content: "Thanks for contacting support! One of our representatives will speak to you shortly!",
        timestamp: serverTimestamp(),
        read: false
      });
      
      setIsActiveSupportSession(true);
      
      toast({
        title: "Support session created",
        description: "A support representative will be with you shortly."
      });
      
      return docRef.id;
    } catch (error) {
      console.error("Error creating support session:", error);
      toast({
        title: "Failed to create support session",
        description: "Please try again later",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  const sendSupportMessage = async (content: string) => {
    if (!currentUser) throw new Error("You must be logged in");
    if (!currentSupportSession) throw new Error("No active support session");
    if (!content.trim()) return;
    
    try {
      const messageData = {
        sessionId: currentSupportSession.id,
        senderId: currentUser.uid,
        senderRole: isModerator ? 'moderator' : 'user',
        content,
        timestamp: serverTimestamp(),
        read: false
      };
      
      await addDoc(collection(db, "supportMessages"), messageData);
      
      await updateDoc(doc(db, "supportSessions", currentSupportSession.id), {
        lastMessage: {
          content,
          timestamp: serverTimestamp(),
          senderId: currentUser.uid
        }
      });
      
    } catch (error) {
      console.error("Error sending support message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const requestEndSupport = async () => {
    if (!currentSupportSession) return;
    
    try {
      await updateDoc(doc(db, "supportSessions", currentSupportSession.id), {
        status: 'requested-end'
      });
      
      await addDoc(collection(db, "supportMessages"), {
        sessionId: currentSupportSession.id,
        senderId: "system",
        senderRole: "system",
        content: `${isModerator ? "Support representative" : "User"} has requested to end this support session.`,
        timestamp: serverTimestamp(),
        read: false
      });
      
      toast({
        title: "End request sent",
        description: "Waiting for confirmation to end support session"
      });
    } catch (error) {
      console.error("Error requesting end of support session:", error);
      toast({
        title: "Failed to request end",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const forceEndSupport = async () => {
    if (!currentSupportSession) return;
    
    try {
      await updateDoc(doc(db, "supportSessions", currentSupportSession.id), {
        status: 'ended'
      });
      
      await addDoc(collection(db, "supportMessages"), {
        sessionId: currentSupportSession.id,
        senderId: "system",
        senderRole: "system",
        content: "This support session has ended.",
        timestamp: serverTimestamp(),
        read: false
      });
      
      if (!isModerator) {
        setIsActiveSupportSession(false);
      }
      
      toast({
        title: "Support session ended",
        description: "Thank you for using our support service"
      });
      
      setCurrentSupportSession(null);
    } catch (error) {
      console.error("Error ending support session:", error);
      toast({
        title: "Failed to end session",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const submitFeedback = async (rating: number, feedback?: string) => {
    if (!currentSupportSession) return;
    
    try {
      await updateDoc(doc(db, "supportSessions", currentSupportSession.id), {
        rating,
        feedback: feedback || null
      });
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback"
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Failed to submit feedback",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const getUserSupportStats = async (userId: string) => {
    try {
      // Get user info
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        throw new Error("User not found");
      }
      
      const userData = userDocSnap.data();
      
      // Get support sessions for this user
      const sessionsQuery = query(
        collection(db, "supportSessions"),
        where("userId", "==", userId)
      );
      
      const sessionsSnap = await getDocs(sessionsQuery);
      const sessions = sessionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get message count
      const messagesQuery = query(
        collection(db, "messages"),
        where("senderId", "==", userId)
      );
      
      const messagesSnap = await getDocs(messagesQuery);
      
      return {
        userInfo: userData,
        supportSessions: sessions,
        messageCount: messagesSnap.size,
        createdAt: userData.createdAt
      };
    } catch (error) {
      console.error("Error getting user support stats:", error);
      throw error;
    }
  };
  
  const value = {
    supportSessions,
    currentSupportSession,
    supportMessages,
    createSupportSession,
    sendSupportMessage,
    setCurrentSupportSessionId,
    requestEndSupport,
    forceEndSupport,
    submitFeedback,
    isActiveSupportSession,
    isModerator,
    getUserSupportStats
  };
  
  return (
    <LiveSupportContext.Provider value={value}>
      {children}
    </LiveSupportContext.Provider>
  );
};
