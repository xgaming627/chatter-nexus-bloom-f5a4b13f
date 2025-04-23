
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtendedUser } from '@/types/supabase';
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  currentUser: ExtendedUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>; // Alias for signOut
  setUsernameOnSignUp: (username: string) => Promise<void>;
  isUsernameAvailable: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const extendedUser: ExtendedUser = {
          ...session.user,
          uid: session.user.id,
          displayName: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
          photoURL: session.user.user_metadata?.avatar_url
        };
        setCurrentUser(extendedUser);
      } else {
        setCurrentUser(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const extendedUser: ExtendedUser = {
          ...session.user,
          uid: session.user.id,
          displayName: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
          photoURL: session.user.user_metadata?.avatar_url
        };
        setCurrentUser(extendedUser);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
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
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message || "Failed to sign out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = signOut; // Alias for backward compatibility

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Please check your email for the password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message || "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const setUsernameOnSignUp = async (username: string) => {
    // Mock implementation
    toast({
      title: "Feature not implemented",
      description: "Setting username is not yet implemented with Supabase",
    });
    return Promise.resolve();
  };

  const isUsernameAvailable = async (username: string) => {
    // Mock implementation
    return Promise.resolve(true);
  };

  const value = {
    currentUser,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    logout,
    setUsernameOnSignUp,
    isUsernameAvailable
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
