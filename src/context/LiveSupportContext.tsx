
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
  getDocs,
  Timestamp
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
    ipAddress?: string;
    vpnDetected?: boolean;
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
  lastReadByModerator: boolean;
}

interface LiveSupportContextType {
  supportSessions: SupportSession[];
  currentSupportSession: SupportSession | null;
  supportMessages: SupportMessage[];
  createSupportSession: () => Promise<string>;
  sendSupportMessage: (content: string, senderRole?: 'user' | 'moderator' | 'system') => Promise<void>;
  setCurrentSupportSessionId: (id: string | null) => void;
  requestEndSupport: () => Promise<void>;
  forceEndSupport: () => Promise<void>;
  submitFeedback: (rating: number, feedback?: string) => Promise<void>;
  isActiveSupportSession: boolean;
  isModerator: boolean;
  getUserSupportStats: (userId: string) => Promise<any>;
  hasNewSupportMessages: boolean;
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
  const [hasNewSupportMessages, setHasNewSupportMessages] = useState(false);
  
  useEffect(() => {
    if (!currentUser) return;
    
    // Check if user is a moderator
    const checkModerator = async () => {
      if (currentUser.email === 'vitorrossato812@gmail.com') {
        setIsModerator(true);
      } else {
        setIsModerator(false);
      }
    };
    
    checkModerator();
    
    let q;
    
    if (isModerator) {
      q = query(
        collection(db, "supportSessions"),
        where("status", "in", ["active", "requested-end"]),
        orderBy("lastMessage.timestamp", "desc")
      );
    } else {
      q = query(
        collection(db, "supportSessions"),
        where("userId", "==", currentUser.uid),
        orderBy("lastMessage.timestamp", "desc")
      );
    }
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sessionsData: SupportSession[] = [];
      let hasNewMessages = false;
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Omit<SupportSession, 'id' | 'userInfo'>;
        
        // For non-moderators, if there's a new message and it wasn't sent by the current user
        if (!isModerator && data.lastMessage && data.lastMessage.senderId !== currentUser.uid) {
          hasNewMessages = true;
        }
        
        // For moderators, if there's a session that hasn't been read
        if (isModerator && data.lastReadByModerator === false) {
          hasNewMessages = true;
        }
        
        let userInfo;
        if (isModerator) {
          const userDocRef = doc(db, "users", data.userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            userInfo = userDocSnap.data();
            
            // Simulate IP and VPN for demo
            userInfo.ipAddress = `192.168.0.${Math.floor(Math.random() * 255)}`;
            userInfo.vpnDetected = Math.random() > 0.7; // 30% chance of VPN detected
            
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
          userInfo,
          lastReadByModerator: data.lastReadByModerator !== undefined ? data.lastReadByModerator : false
        });
      }
      
      setSupportSessions(sessionsData);
      setHasNewSupportMessages(hasNewMessages);
      
      if (!isModerator) {
        const hasActiveSession = sessionsData.some(session => 
          session.status === 'active' || session.status === 'requested-end'
        );
        setIsActiveSupportSession(hasActiveSession);
        
        if (hasActiveSession && !currentSupportSession) {
          const activeSession = sessionsData.find(session => 
            session.status === 'active' || session.status === 'requested-end'
          );
          if (activeSession) {
            setCurrentSupportSession(activeSession);
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [currentUser, isModerator]);
  
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
      
      // If messages are viewed, clear new messages flag
      if (currentSupportSession) {
        setHasNewSupportMessages(false);
      }
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
        
        if (isModerator) {
          const userDocRef = doc(db, "users", data.userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            data.userInfo = userDocSnap.data() as any;
            
            // Add IP address and VPN status for demo
            data.userInfo.ipAddress = `192.168.0.${Math.floor(Math.random() * 255)}`;
            data.userInfo.vpnDetected = Math.random() > 0.7; // 30% chance of VPN detected
            
            const messagesQuery = query(
              collection(db, "messages"),
              where("senderId", "==", data.userId)
            );
            const messagesSnap = await getDocs(messagesQuery);
            data.userInfo.messageCount = messagesSnap.size;
          }
          
          // Mark as read when a moderator opens the session
          if (!data.lastReadByModerator) {
            await updateDoc(doc(db, "supportSessions", id), {
              lastReadByModerator: true
            });
          }
        }
        
        setCurrentSupportSession({
          id: sessionDoc.id,
          ...data,
          lastReadByModerator: data.lastReadByModerator || false
        });
      }
    } catch (error) {
      console.error("Error fetching support session:", error);
    }
  };
  
  const createSupportSession = async () => {
    if (!currentUser) throw new Error("You must be logged in");
    
    try {
      if (isActiveSupportSession) {
        const existingSession = supportSessions.find(s => 
          s.status === 'active' || s.status === 'requested-end'
        );
        if (existingSession) {
          await setCurrentSupportSessionId(existingSession.id);
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
        },
        lastReadByModerator: false
      };
      
      const docRef = await addDoc(collection(db, "supportSessions"), sessionData);
      
      await addDoc(collection(db, "supportMessages"), {
        sessionId: docRef.id,
        senderId: "system",
        senderRole: "system",
        content: "Thanks for contacting support! One of our representatives will speak to you shortly!",
        timestamp: serverTimestamp(),
        read: false
      });
      
      setIsActiveSupportSession(true);
      await setCurrentSupportSessionId(docRef.id);
      
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
  
  const sendSupportMessage = async (content: string, senderRole?: 'user' | 'moderator' | 'system') => {
    if (!currentUser && senderRole !== 'system') throw new Error("You must be logged in");
    if (!currentSupportSession) throw new Error("No active support session");
    if (!content.trim()) return;
    
    try {
      const role = senderRole || (isModerator ? 'moderator' : 'user');
      
      const messageData = {
        sessionId: currentSupportSession.id,
        senderId: role === 'system' ? 'system' : currentUser!.uid,
        senderRole: role,
        content,
        timestamp: serverTimestamp(),
        read: false
      };
      
      await addDoc(collection(db, "supportMessages"), messageData);
      
      await updateDoc(doc(db, "supportSessions", currentSupportSession.id), {
        lastMessage: {
          content,
          timestamp: serverTimestamp(),
          senderId: role === 'system' ? 'system' : currentUser!.uid
        },
        lastReadByModerator: isModerator
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
      
      setCurrentSupportSession(prev => 
        prev ? { ...prev, status: 'requested-end' } : null
      );
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
      
      setCurrentSupportSession(prev => prev ? { ...prev, status: 'ended' } : null);
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
      
      // Update local state
      setCurrentSupportSession(prev => 
        prev ? { ...prev, rating, feedback: feedback || null } : null
      );
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
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        throw new Error("User not found");
      }
      
      const userData = userDocSnap.data();
      
      const sessionsQuery = query(
        collection(db, "supportSessions"),
        where("userId", "==", userId)
      );
      
      const sessionsSnap = await getDocs(sessionsQuery);
      const sessions = sessionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const messagesQuery = query(
        collection(db, "messages"),
        where("senderId", "==", userId)
      );
      
      const messagesSnap = await getDocs(messagesQuery);
      
      return {
        userInfo: userData,
        supportSessions: sessions,
        messageCount: messagesSnap.size,
        createdAt: userData.createdAt,
        // Add mock IP and VPN data for demo
        ipAddress: `192.168.0.${Math.floor(Math.random() * 255)}`,
        vpnDetected: Math.random() > 0.7 // 30% chance of VPN
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
    getUserSupportStats,
    hasNewSupportMessages
  };
  
  return (
    <LiveSupportContext.Provider value={value}>
      {children}
    </LiveSupportContext.Provider>
  );
};
