// LiveSupportContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useRole } from "@/hooks/useRole";
import { useToast } from "@/hooks/use-toast";

export interface SupportMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_role: "user" | "moderator" | "system";
  content: string;
  timestamp: string;
  read?: boolean;
}

export interface SupportSession {
  id: string;
  user_id: string;
  userInfo?: {
    display_name?: string;
    email?: string;
    username?: string;
    user_id?: string;
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
  last_message?: { content: string; timestamp: string; sender_id?: string };
  status: "active" | "ended" | "requested-end";
  rating?: number | null;
  feedback?: string | null;
  last_read_by_moderator: boolean;
}

interface LiveSupportContextType {
  supportSessions: SupportSession[];
  currentSupportSession: SupportSession | null;
  supportMessages: SupportMessage[];
  createSupportSession: () => Promise<string>;
  sendSupportMessage: (content: string, senderRole?: "user" | "moderator" | "system") => Promise<void>;
  setCurrentSupportSessionId: (id: string | null) => void;
  requestEndSupport: () => Promise<void>;
  forceEndSupport: () => Promise<void>;
  confirmEndSupport: () => Promise<void>;
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
  // Always call hooks unconditionally
  const { currentUser } = useAuth(); // AuthProvider must wrap this provider (see App.tsx)
  const { isModerator: checkIsModerator } = useRole();
  const { toast } = useToast();

  const [supportSessions, setSupportSessions] = useState<SupportSession[]>([]);
  const [currentSupportSession, setCurrentSupportSession] = useState<SupportSession | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [isModerator, setIsModerator] = useState<boolean>(false);
  const [isActiveSupportSession, setIsActiveSupportSession] = useState<boolean>(false);
  const [hasNewSupportMessages, setHasNewSupportMessages] = useState<boolean>(false);

  // Keep refs to active channels to ensure cleanup
  const sessionsChannelRef = useRef<any | null>(null);
  const messagesChannelRef = useRef<any | null>(null);

  // Keep moderator flag in sync
  useEffect(() => {
    setIsModerator(Boolean(checkIsModerator));
  }, [checkIsModerator]);

  // FETCH SESSIONS & realtime subscription (safe when currentUser is null)
  useEffect(() => {
    // Clean up any previous channel
    const cleanup = async () => {
      if (sessionsChannelRef.current) {
        try {
          // supabase.removeChannel expects the exact channel object
          await supabase.removeChannel(sessionsChannelRef.current);
        } catch (err) {
          // fallback: try unsubscribe if available
          try {
            await sessionsChannelRef.current.unsubscribe?.();
          } catch (_) {}
        } finally {
          sessionsChannelRef.current = null;
        }
      }
    };

    let mounted = true;

    const setup = async () => {
      // If there's no currentUser and we are not a moderator, we still want to show nothing
      // but do not early-return before creating hooks (we're inside useEffect, so safe)
      if (!currentUser && !isModerator) {
        // Clear any existing sessions/state for safety
        if (mounted) {
          setSupportSessions([]);
          setIsActiveSupportSession(false);
          setCurrentSupportSession(null);
        }
        return;
      }

      try {
        // Create a unique channel name to avoid collisions across users
        const chanName = `support-sessions-changes-${currentUser?.uid || "global"}`;
        const channel = supabase
          .channel(chanName)
          .on("postgres_changes", { event: "*", schema: "public", table: "support_sessions" }, (payload) => {
            console.log("Support session change:", payload);
            fetchSupportSessions(); // safe to call
          });

        // subscribe
        sessionsChannelRef.current = channel;
        await channel.subscribe();

        // initial fetch
        await fetchSupportSessions();
      } catch (error) {
        console.error("Failed to setup sessions channel:", error);
      }
    };

    // start
    setup();

    return () => {
      mounted = false;
      cleanup();
    };
    // Note: dependencies include currentUser and isModerator
  }, [currentUser, isModerator]);

  // WATCH MESSAGES for currentSupportSession
  useEffect(() => {
    const cleanupMessages = async () => {
      if (messagesChannelRef.current) {
        try {
          await supabase.removeChannel(messagesChannelRef.current);
        } catch (err) {
          try {
            await messagesChannelRef.current.unsubscribe?.();
          } catch (_) {}
        } finally {
          messagesChannelRef.current = null;
        }
      }
    };

    let mounted = true;

    const setupMessagesChannel = async () => {
      await cleanupMessages();

      if (!currentSupportSession) {
        // clear messages when there's no current session
        if (mounted) setSupportMessages([]);
        return;
      }

      try {
        const chanName = `support-messages-changes-${currentSupportSession.id}`;
        const channel = supabase.channel(chanName).on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "support_messages",
            filter: `session_id=eq.${currentSupportSession.id}`,
          },
          (payload) => {
            console.log("Support message change:", payload);
            fetchSupportMessages(currentSupportSession.id);
          },
        );

        messagesChannelRef.current = channel;
        await channel.subscribe();

        // initial fetch for this session
        await fetchSupportMessages(currentSupportSession.id);
      } catch (error) {
        console.error("Failed to setup messages channel:", error);
      }
    };

    setupMessagesChannel();

    return () => {
      mounted = false;
      cleanupMessages();
    };
  }, [currentSupportSession?.id]);

  // Functions to fetch data
  const fetchSupportSessions = async () => {
    try {
      let query = supabase
        .from("support_sessions")
        .select("*, profiles!support_sessions_user_id_fkey(user_id, username, display_name, photo_url, created_at)");

      if (isModerator) {
        query = query.in("status", ["active", "requested-end"]);
      } else if (currentUser) {
        query = query.eq("user_id", currentUser.uid).in("status", ["active", "requested-end"]);
      } else {
        // no user and not moderator -> clear and return
        setSupportSessions([]);
        return;
      }

      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;

      const sessionsData: SupportSession[] = (data || []).map((session: any) => ({
        id: session.id,
        user_id: session.user_id,
        created_at: session.created_at,
        status: session.status as "active" | "ended" | "requested-end",
        rating: session.rating ?? null,
        feedback: session.feedback ?? null,
        last_read_by_moderator: session.last_read_by_moderator,
        userInfo: session.profiles
          ? {
              display_name: session.profiles.display_name || "Unknown User",
              email: session.user_email || "Unknown",
              username: session.profiles.username || "unknown",
              user_id: session.profiles.user_id,
              photo_url: session.profiles.photo_url,
              created_at: session.profiles.created_at,
              messageCount: session.message_count ?? 0,
              ipAddress: session.ipv4_address || "Unknown",
              ipv6Address: session.ipv6_address,
              vpnDetected: session.vpn_detected || false,
              country: session.country,
              city: session.city,
              warnings: session.warnings_count ?? 0,
              lastWarning: session.last_warning_at ?? undefined,
            }
          : undefined,
      }));

      setSupportSessions(sessionsData);

      // For non-moderator users: ensure the active session is set in context
      if (!isModerator && currentUser) {
        const hasActive = sessionsData.some((s) => s.status === "active" || s.status === "requested-end");
        setIsActiveSupportSession(hasActive);
        if (hasActive && !currentSupportSession) {
          const active = sessionsData.find((s) => s.status === "active" || s.status === "requested-end");
          if (active) setCurrentSupportSession(active);
        }
      }
    } catch (error) {
      console.error("Error fetching support sessions:", error);
    }
  };

  const fetchSupportMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: true });

      if (error) throw error;

      const messagesWithTypes = (data || []).map((msg: any) => ({
        ...msg,
        sender_role: msg.sender_role as "user" | "moderator" | "system",
      }));
      setSupportMessages(messagesWithTypes);

      // Clear new messages flag when viewing
      setHasNewSupportMessages(false);
    } catch (error) {
      console.error("Error fetching support messages:", error);
    }
  };

  const setCurrentSupportSessionId = async (id: string | null) => {
    if (!id) {
      setCurrentSupportSession(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("support_sessions")
        .select("*, profiles!support_sessions_user_id_fkey(user_id, username, display_name, photo_url, created_at)")
        .eq("id", id)
        .single();
      if (error) throw error;

      const session: SupportSession = {
        id: data.id,
        user_id: data.user_id,
        created_at: data.created_at,
        status: data.status as "active" | "ended" | "requested-end",
        rating: data.rating ?? null,
        feedback: data.feedback ?? null,
        last_read_by_moderator: data.last_read_by_moderator,
        userInfo: data.profiles
          ? {
              display_name: data.profiles.display_name || "Unknown User",
              email: data.user_email || "Unknown",
              username: data.profiles.username || "unknown",
              user_id: data.profiles.user_id,
              photo_url: data.profiles.photo_url,
              created_at: data.profiles.created_at,
              messageCount: data.message_count ?? 0,
              ipAddress: data.ipv4_address || "Unknown",
              ipv6Address: data.ipv6_address,
              vpnDetected: data.vpn_detected || false,
              country: data.country,
              city: data.city,
              warnings: data.warnings_count ?? 0,
              lastWarning: data.last_warning_at ?? undefined,
            }
          : undefined,
      };

      // mark read for moderator
      if (isModerator && !data.last_read_by_moderator) {
        await supabase.from("support_sessions").update({ last_read_by_moderator: true }).eq("id", id);
      }

      setCurrentSupportSession(session);
    } catch (error) {
      console.error("Error fetching support session:", error);
    }
  };

  // Create support session
  const createSupportSession = async () => {
    if (!currentUser) throw new Error("You must be logged in");
    try {
      const { data: existing } = await supabase
        .from("support_sessions")
        .select("*")
        .eq("user_id", currentUser.uid)
        .eq("status", "active");

      if (existing && existing.length > 0) {
        const active = existing[0];
        await setCurrentSupportSessionId(active.id);
        return active.id;
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from("support_sessions")
        .insert({ user_id: currentUser.uid, status: "active", last_read_by_moderator: false })
        .select()
        .single();
      if (sessionError) throw sessionError;

      // Create initial system message
      const { error: messageError } = await supabase.from("support_messages").insert({
        session_id: sessionData.id,
        sender_id: null,
        sender_role: "system",
        content: "Thanks for contacting support! One of our representatives will speak to you shortly!",
      });
      if (messageError) throw messageError;

      setIsActiveSupportSession(true);
      await setCurrentSupportSessionId(sessionData.id);

      toast?.({ title: "Support session created", description: "A support representative will be with you shortly." });
      return sessionData.id;
    } catch (error) {
      console.error("Error creating support session:", error);
      toast?.({
        title: "Failed to create support session",
        description: "Please try again later",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Send message
  const sendSupportMessage = async (content: string, senderRole?: "user" | "moderator" | "system") => {
    if (!currentSupportSession && senderRole !== "system") throw new Error("No active support session");
    if (!content?.trim()) return;
    try {
      const role = senderRole || (isModerator ? "moderator" : "user");
      const { error } = await supabase.from("support_messages").insert({
        session_id: currentSupportSession!.id,
        sender_id: role === "system" ? null : currentUser!.uid,
        sender_role: role,
        content,
      });
      if (error) throw error;

      // Update session's last_read_by_moderator
      if (currentSupportSession) {
        await supabase
          .from("support_sessions")
          .update({ last_read_by_moderator: isModerator, updated_at: new Date().toISOString() })
          .eq("id", currentSupportSession.id);
      }
    } catch (error) {
      console.error("Error sending support message:", error);
      toast?.({ title: "Failed to send message", description: "Please try again later", variant: "destructive" });
    }
  };

  // Request moderator to end session
  const requestEndSupport = async () => {
    if (!currentSupportSession || !isModerator) return;
    try {
      const { error } = await supabase
        .from("support_sessions")
        .update({ status: "requested-end" })
        .eq("id", currentSupportSession.id);
      if (error) throw error;

      await supabase.from("support_messages").insert({
        session_id: currentSupportSession.id,
        sender_id: null,
        sender_role: "system",
        content: "Support representative has requested to end this support session. Do you want to end this session?",
      });

      await supabase.from("notifications").insert({
        user_id: currentSupportSession.user_id,
        type: "support",
        title: "Support Session End Requested",
        message: "The support representative wants to end this session. Please confirm if you want to close it.",
        is_sound_enabled: true,
        metadata: { session_id: currentSupportSession.id, action: "end_requested" },
      });

      toast?.({ title: "End request sent", description: "Waiting for user to confirm end of support session" });

      setCurrentSupportSession((prev) => (prev ? { ...prev, status: "requested-end" } : null));
    } catch (error) {
      console.error("Error requesting end of support session:", error);
      toast?.({ title: "Failed to request end", description: "Please try again later", variant: "destructive" });
    }
  };

  // Force end (moderator)
  const forceEndSupport = async () => {
    if (!currentSupportSession || !isModerator) return;
    try {
      const { error } = await supabase
        .from("support_sessions")
        .update({ status: "ended", updated_at: new Date().toISOString() })
        .eq("id", currentSupportSession.id);
      if (error) throw error;

      await supabase.from("support_messages").insert({
        session_id: currentSupportSession.id,
        sender_id: null,
        sender_role: "system",
        content: "This support session has been ended by a moderator.",
      });

      await supabase.from("notifications").insert({
        user_id: currentSupportSession.user_id,
        type: "support",
        title: "Support Session Ended",
        message: "Your support session has been closed by a moderator. Please rate your experience.",
        is_sound_enabled: true,
        metadata: { session_id: currentSupportSession.id, action: "session_ended" },
      });

      toast?.({ title: "Support session ended", description: "This session has been closed" });

      // Clear local state immediately for moderator UI
      setSupportMessages([]);
      setCurrentSupportSession(null);
      setIsActiveSupportSession(false);

      // Refresh sessions list shortly after
      setTimeout(fetchSupportSessions, 500);
    } catch (error) {
      console.error("Error ending support session:", error);
      toast?.({ title: "Failed to end session", description: "Please try again later", variant: "destructive" });
    }
  };

  // Confirm end (user confirms)
  const confirmEndSupport = async () => {
    if (!currentSupportSession || isModerator) return;
    try {
      const { error } = await supabase
        .from("support_sessions")
        .update({ status: "ended", updated_at: new Date().toISOString() })
        .eq("id", currentSupportSession.id);
      if (error) throw error;

      await supabase.from("support_messages").insert({
        session_id: currentSupportSession.id,
        sender_id: null,
        sender_role: "system",
        content: "Support session has been ended by the user.",
      });

      toast?.({ title: "Support session ended", description: "Thank you for using our support service" });

      // Delay clearing so UI can show feedback modal before state clears
      setTimeout(() => {
        setSupportMessages([]);
        setCurrentSupportSession(null);
        setIsActiveSupportSession(false);
        setTimeout(fetchSupportSessions, 300);
      }, 600);
    } catch (error) {
      console.error("Error confirming end of support session:", error);
      toast?.({ title: "Failed to end session", description: "Please try again later", variant: "destructive" });
    }
  };

  const submitFeedback = async (rating: number, feedback?: string) => {
    if (!currentSupportSession) return;
    try {
      const { error } = await supabase
        .from("support_sessions")
        .update({ rating, feedback: feedback || null })
        .eq("id", currentSupportSession.id);
      if (error) throw error;
      toast?.({ title: "Feedback submitted", description: "Thank you for your feedback" });

      // Clear local session
      setCurrentSupportSession(null);
      setSupportMessages([]);
      setIsActiveSupportSession(false);

      setTimeout(fetchSupportSessions, 500);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast?.({ title: "Failed to submit feedback", description: "Please try again later", variant: "destructive" });
    }
  };

  const getUserSupportStats = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (profileError) throw profileError;

      const { data: sessions, error: sessionsError } = await supabase
        .from("support_sessions")
        .select("*")
        .eq("user_id", userId);
      if (sessionsError) throw sessionsError;

      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", userId);
      if (messagesError) throw messagesError;

      return {
        userInfo: profile,
        supportSessions: sessions,
        messageCount: (messages || []).length,
        createdAt: profile.created_at,
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

  const value: LiveSupportContextType = {
    supportSessions,
    currentSupportSession,
    supportMessages,
    createSupportSession,
    sendSupportMessage,
    setCurrentSupportSessionId,
    requestEndSupport,
    forceEndSupport,
    confirmEndSupport,
    submitFeedback,
    isActiveSupportSession,
    isModerator,
    getUserSupportStats,
    hasNewSupportMessages,
  };

  return <LiveSupportContext.Provider value={value}>{children}</LiveSupportContext.Provider>;
};
