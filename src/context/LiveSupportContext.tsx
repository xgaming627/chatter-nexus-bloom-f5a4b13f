import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useRole } from "@/hooks/useRole";
import { useToast } from "@/hooks/use-toast";

export interface SupportMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_role: 'user' | 'moderator' | 'system';
  content: string;
  timestamp: string;
  read: boolean;
}

export interface SupportSession {
  id: string;
  user_id: string;
  userInfo?: {
    display_name: string;
    email: string;
    username: string;
    user_id: string;
    photo_url?: string;
    created_at?: string;
    messageCount?: number;
    ipAddress?: string;
    ipv6Address?: string;
    vpnDetected?: boolean;
    country?: string;
    city?: string;
    warnings?: number;
    lastWarning?: string;
  };
  created_at: string;
  last_message?: {
    content: string;
    timestamp: string;
    sender_id: string;
  };
  status: 'active' | 'ended' | 'requested-end';
  rating?: number;
  feedback?: string;
  last_read_by_moderator: boolean;
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
  const { isModerator: checkIsModerator } = useRole();
  const { toast } = useToast();
  const [supportSessions, setSupportSessions] = useState<SupportSession[]>([]);
  const [currentSupportSession, setCurrentSupportSession] = useState<SupportSession | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [isActiveSupportSession, setIsActiveSupportSession] = useState(false);
  const [hasNewSupportMessages, setHasNewSupportMessages] = useState(false);
  
  useEffect(() => {
    if (!currentUser) return;
    
    // Set moderator status from useRole hook
    setIsModerator(checkIsModerator);
    
    // Set up real-time subscriptions
    const sessionsChannel = supabase
      .channel('support-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_sessions',
        },
        (payload) => {
          console.log('Support session change:', payload);
          fetchSupportSessions();
        }
      )
      .subscribe();

    fetchSupportSessions();
    
    return () => {
      supabase.removeChannel(sessionsChannel);
    };
  }, [currentUser, isModerator]);
  
  useEffect(() => {
    if (!currentSupportSession) {
      setSupportMessages([]);
      return;
    }
    
    const messagesChannel = supabase
      .channel('support-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `session_id=eq.${currentSupportSession.id}`
        },
        (payload) => {
          console.log('Support message change:', payload);
          fetchSupportMessages(currentSupportSession.id);
        }
      )
      .subscribe();

    fetchSupportMessages(currentSupportSession.id);
    
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [currentSupportSession]);

  const fetchSupportSessions = async () => {
    if (!currentUser) return;

    try {
      let query = supabase
        .from('support_sessions')
        .select(`
          *,
          profiles!support_sessions_user_id_fkey(user_id, username, display_name, photo_url, created_at)
        `);

      if (isModerator) {
        query = query.in('status', ['active', 'requested-end']);
      } else {
        query = query.eq('user_id', currentUser.uid);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;

      const sessionsData: SupportSession[] = data.map(session => ({
        id: session.id,
        user_id: session.user_id,
        created_at: session.created_at,
        status: session.status as 'active' | 'ended' | 'requested-end',
        rating: session.rating,
        feedback: session.feedback,
        last_read_by_moderator: session.last_read_by_moderator,
        userInfo: session.profiles ? {
          display_name: session.profiles.display_name || 'Unknown User',
          email: session.user_email || 'Unknown',
          username: session.profiles.username || 'unknown',
          user_id: session.profiles.user_id,
          photo_url: session.profiles.photo_url,
          created_at: session.profiles.created_at,
          // Real data from database
          messageCount: Math.floor(Math.random() * 100), // TODO: Get from database
          ipAddress: session.ipv4_address || 'Unknown',
          ipv6Address: session.ipv6_address,
          vpnDetected: session.vpn_detected || false,
          country: session.country,
          city: session.city,
          warnings: Math.floor(Math.random() * 3), // TODO: Get from warnings table
          lastWarning: new Date().toISOString(),
        } : undefined
      }));

      setSupportSessions(sessionsData);

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
    } catch (error) {
      console.error('Error fetching support sessions:', error);
    }
  };

  const fetchSupportMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const messagesWithTypes = (data || []).map(msg => ({
        ...msg,
        sender_role: msg.sender_role as 'user' | 'moderator' | 'system'
      }));
      setSupportMessages(messagesWithTypes);
      
      // Clear new messages flag when viewing messages
      if (currentSupportSession) {
        setHasNewSupportMessages(false);
      }
    } catch (error) {
      console.error('Error fetching support messages:', error);
    }
  };
  
  const setCurrentSupportSessionId = async (id: string | null) => {
    if (!id) {
      setCurrentSupportSession(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('support_sessions')
        .select(`
          *,
          profiles!support_sessions_user_id_fkey(user_id, username, display_name, photo_url, created_at)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const session: SupportSession = {
        id: data.id,
        user_id: data.user_id,
        created_at: data.created_at,
        status: data.status as 'active' | 'ended' | 'requested-end',
        rating: data.rating,
        feedback: data.feedback,
        last_read_by_moderator: data.last_read_by_moderator,
        userInfo: data.profiles ? {
          display_name: data.profiles.display_name || 'Unknown User',
          email: data.user_email || 'Unknown',
          username: data.profiles.username || 'unknown',
          user_id: data.profiles.user_id,
          photo_url: data.profiles.photo_url,
          created_at: data.profiles.created_at,
          // Real data from database
          messageCount: Math.floor(Math.random() * 100), // TODO: Get from database
          ipAddress: data.ipv4_address || 'Unknown',
          ipv6Address: data.ipv6_address,
          vpnDetected: data.vpn_detected || false,
          country: data.country,
          city: data.city,
          warnings: Math.floor(Math.random() * 3), // TODO: Get from warnings table
          lastWarning: new Date().toISOString(),
        } : undefined
      };
      
      // Mark as read when a moderator opens the session
      if (isModerator && !data.last_read_by_moderator) {
        await supabase
          .from('support_sessions')
          .update({ last_read_by_moderator: true })
          .eq('id', id);
      }
      
      setCurrentSupportSession(session);
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
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('support_sessions')
        .insert({
          user_id: currentUser.uid,
          status: 'active',
          last_read_by_moderator: false
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Get user's IP and user agent for tracking
      const getClientInfo = async () => {
        try {
          // Try to get real IP from various sources
          const response = await fetch('https://api.ipify.org?format=json');
          const ipData = await response.json();
          
          const userAgent = navigator.userAgent;
          
          // Update session with client info
          await supabase
            .from('support_sessions')
            .update({
              ipv4_address: ipData.ip,
              user_agent: userAgent
            })
            .eq('id', sessionData.id);

          // Call VPN detection function
          try {
            await supabase.functions.invoke('detect-vpn', {
              body: {
                sessionId: sessionData.id,
                ipAddress: ipData.ip
              }
            });
          } catch (vpnError) {
            console.log('VPN detection failed:', vpnError);
          }
        } catch (error) {
          console.log('Failed to get client info:', error);
        }
      };

      // Run client info collection in background
      getClientInfo();
      
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          session_id: sessionData.id,
          sender_id: null,
          sender_role: 'system',
          content: 'Thanks for contacting support! One of our representatives will speak to you shortly!',
        });

      if (messageError) throw messageError;
      
      setIsActiveSupportSession(true);
      await setCurrentSupportSessionId(sessionData.id);
      
      toast({
        title: "Support session created",
        description: "A support representative will be with you shortly."
      });
      
      return sessionData.id;
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
      
      const { error } = await supabase
        .from('support_messages')
        .insert({
          session_id: currentSupportSession.id,
          sender_id: role === 'system' ? null : currentUser!.uid,
          sender_role: role,
          content,
        });

      if (error) throw error;

      // Update session's last_read_by_moderator status
      await supabase
        .from('support_sessions')
        .update({ 
          last_read_by_moderator: isModerator,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSupportSession.id);
      
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
    if (!currentSupportSession || !isModerator) return;
    
    try {
      const { error } = await supabase
        .from('support_sessions')
        .update({ status: 'requested-end' })
        .eq('id', currentSupportSession.id);

      if (error) throw error;
      
      await supabase
        .from('support_messages')
        .insert({
          session_id: currentSupportSession.id,
          sender_id: null,
          sender_role: 'system',
          content: "Support representative has requested to end this support session. Do you want to end this session?",
        });
      
      toast({
        title: "End request sent",
        description: "Waiting for user to confirm end of support session"
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
    if (!currentSupportSession || !isModerator) return;
    
    try {
      const { error } = await supabase
        .from('support_sessions')
        .update({ status: 'ended' })
        .eq('id', currentSupportSession.id);

      if (error) throw error;
      
      await supabase
        .from('support_messages')
        .insert({
          session_id: currentSupportSession.id,
          sender_id: null,
          sender_role: 'system',
          content: 'This support session has been ended by support staff.',
        });
      
      toast({
        title: "Support session ended",
        description: "This session has been closed"
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
      const { error } = await supabase
        .from('support_sessions')
        .update({ 
          rating,
          feedback: feedback || null 
        })
        .eq('id', currentSupportSession.id);

      if (error) throw error;
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback"
      });
      
      // Update local state
      setCurrentSupportSession(prev => 
        prev ? { ...prev, rating, feedback: feedback || undefined } : null
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const { data: sessions, error: sessionsError } = await supabase
        .from('support_sessions')
        .select('*')
        .eq('user_id', userId);

      if (sessionsError) throw sessionsError;

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId);

      if (messagesError) throw messagesError;

      return {
        userInfo: profile,
        supportSessions: sessions,
        messageCount: messages.length,
        createdAt: profile.created_at,
        // Add mock IP and VPN data for demo
        ipAddress: `192.168.0.${Math.floor(Math.random() * 255)}`,
        vpnDetected: Math.random() > 0.7,
        warnings: Math.floor(Math.random() * 3),
        lastWarning: new Date().toISOString(),
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
    hasNewSupportMessages,
  };

  return (
    <LiveSupportContext.Provider value={value}>
      {children}
    </LiveSupportContext.Provider>
  );
};