import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExtendedUser } from "@/types/supabase";
import { useToast } from "@/components/ui/use-toast";
import { User, Session } from "@supabase/supabase-js";
import NotificationPermissionDialog from "@/components/NotificationPermissionDialog";

interface AuthContextType {
  currentUser: ExtendedUser | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setUsernameOnSignUp: (username: string) => Promise<boolean>;
  isUsernameAvailable: (username: string) => Promise<boolean>;
  updateOnlineStatus: (status: "online" | "offline") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const { toast } = useToast();

  const updateOnlineStatus = async (status: "online" | "offline") => {
    if (!currentUser) return;

    await supabase
      .from("profiles")
      .update({
        online_status: status,
        last_seen: new Date().toISOString(),
      })
      .eq("user_id", currentUser.uid);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (session?.user) {
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("user_id", session.user.id)
              .single();

            let photoURL = profile?.photo_url;
            if (!photoURL && session.user.user_metadata?.avatar_url) {
              photoURL = session.user.user_metadata.avatar_url;
              await supabase.from("profiles").update({ photo_url: photoURL }).eq("user_id", session.user.id);
            }

            let displayName = profile?.display_name || profile?.username;
            if (!displayName && session.user.user_metadata?.full_name) {
              displayName = session.user.user_metadata.full_name;
              if (!profile?.display_name) {
                await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", session.user.id);
              }
            }

            const extendedUser: ExtendedUser = {
              id: session.user.id,
              uid: session.user.id,
              email: session.user.email || null,
              displayName: displayName || "User",
              username: profile?.username || undefined,
              photoURL: photoURL || null,
            };

            setCurrentUser(extendedUser);
          } catch (error) {
            const extendedUser: ExtendedUser = {
              id: session.user.id,
              uid: session.user.id,
              email: session.user.email || null,
              displayName: session.user.user_metadata?.full_name || "User",
              username: undefined,
              photoURL: session.user.user_metadata?.avatar_url || null,
            };
            setCurrentUser(extendedUser);
          }
        }, 0);

        if (!localStorage.getItem("notificationPermissionRequested") && Notification.permission === "default") {
          setTimeout(() => setShowNotificationDialog(true), 2000);
        }
      } else {
        setCurrentUser(null);
        updateOnlineStatus("offline");
      }

      setIsInitializing(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      } else {
        setIsInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // AUTO ONLINE/OFFLINE TRACKING
  useEffect(() => {
    if (!currentUser) return;

    updateOnlineStatus("online");

    const interval = setInterval(() => {
      updateOnlineStatus("online");
    }, 25000);

    const handleOffline = () => updateOnlineStatus("offline");

    window.addEventListener("beforeunload", handleOffline);
    window.addEventListener("visibilitychange", () => {
      if (document.hidden) handleOffline();
      else updateOnlineStatus("online");
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [currentUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      try {
        await supabase.functions.invoke("track-login", {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });
      } catch {}
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Failed to sign in. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await updateOnlineStatus("offline");
      await supabase.auth.signOut();
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message || "Failed to sign out.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = handleSignOut;

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          queryParams: { access_type: "offline", prompt: "consent" },
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message || "Failed to sign in.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      toast({
        title: "Password reset sent",
        description: "Check your email for the reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to send email.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const setUsernameOnSignUp = async (username: string): Promise<boolean> => {
    try {
      if (!currentUser) return false;

      const { error } = await supabase
        .from("profiles")
        .update({ username, display_name: username })
        .eq("user_id", currentUser.uid);

      if (error) throw error;

      setCurrentUser({
        ...currentUser,
        displayName: username,
        username: username,
      });

      toast({
        title: "Username Set",
        description: `Username set to ${username}`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Username Setup Failed",
        description: "Could not set username",
        variant: "destructive",
      });
      return false;
    }
  };

  const isUsernameAvailable = async (username: string) => {
    try {
      const { data } = await supabase.from("profiles").select("username").eq("username", username);

      return !data || data.length === 0 || data.every((row) => !row.username);
    } catch {
      return false;
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const value = {
    currentUser,
    session,
    signIn,
    signUp,
    signOut: handleSignOut,
    signInWithGoogle,
    resetPassword,
    logout,
    setUsernameOnSignUp,
    isUsernameAvailable,
    updateOnlineStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <NotificationPermissionDialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog} />
    </AuthContext.Provider>
  );
};
