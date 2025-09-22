
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtendedUser } from '@/types/supabase';
import { useToast } from "@/components/ui/use-toast";
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  currentUser: ExtendedUser | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>; // Alias for signOut
  setUsernameOnSignUp: (username: string) => Promise<boolean>;
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
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer profile fetching to avoid blocking auth state
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

              // Don't use email as fallback to prevent email leakage
              const extendedUser: ExtendedUser = {
                id: session.user.id,
                uid: session.user.id,
                email: session.user.email || null,
                displayName: profile?.display_name || profile?.username || 'User',
                username: profile?.username || undefined,
                photoURL: profile?.photo_url || null,
              };
              setCurrentUser(extendedUser);
            } catch (error) {
              console.error('Error fetching profile:', error);
              // Set minimal user data without profile info
              const extendedUser: ExtendedUser = {
                id: session.user.id,
                uid: session.user.id,
                email: session.user.email || null,
                displayName: 'User',
                username: undefined,
                photoURL: null,
              };
              setCurrentUser(extendedUser);
            }
          }, 0);
          
          // Set user immediately with minimal data to prevent loading screen
          const tempUser: ExtendedUser = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email || null,
            displayName: 'User',
            username: undefined,
            photoURL: null,
          };
          setCurrentUser(tempUser);
        } else {
          setCurrentUser(null);
        }
        setIsInitializing(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        // The auth state change listener will handle setting the user
      } else {
        setIsInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Track login session
      try {
        await supabase.functions.invoke('track-login', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        });
      } catch (trackError) {
        console.error('Failed to track login session:', trackError);
        // Don't fail the login if tracking fails
      }
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
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message || "Failed to sign out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = handleSignOut; // Alias for backward compatibility

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
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
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
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

  const setUsernameOnSignUp = async (username: string): Promise<boolean> => {
    try {
      if (!currentUser) return false;
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username,
          display_name: username 
        })
        .eq('user_id', currentUser.uid);
      
      if (error) throw error;
      
      // Update local state
      setCurrentUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          displayName: username,
          username: username
        };
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
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();
      
      // If no error and no data, username is available
      // If error and error.code is 'PGRST116' (no rows), username is available
      return !data || (error && error.code === 'PGRST116');
    } catch (error) {
      console.error("Error checking username availability:", error);
      return false;
    }
  };

  // Loading state to prevent flashing of login form
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
    isUsernameAvailable
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
