import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
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
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Extend Firebase user with our ExtendedUser properties
        const extendedUser: ExtendedUser = {
          ...user,
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || null,
          username: user.displayName || user.email?.split('@')[0] || undefined,
          photoURL: user.photoURL
        };
        setCurrentUser(extendedUser);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
      await createUserWithEmailAndPassword(auth, email, password);
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
      await signOut(auth);
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
      await signInWithPopup(auth, googleProvider);
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
      await sendPasswordResetEmail(auth, email);
      
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
      // Implement actual username setting logic here
      // For now, just a mock implementation that returns true
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
    // Mock implementation
    return Promise.resolve(true);
  };

  const value = {
    currentUser,
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
