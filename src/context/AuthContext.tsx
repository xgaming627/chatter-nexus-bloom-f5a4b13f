
import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  signInWithPopup,
  sendPasswordResetEmail,
  User,
  updateProfile,
  updateEmail
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";
import { useToast } from "@/components/ui/use-toast";

// Extend the Firebase User type to include username
declare module "firebase/auth" {
  interface User {
    username?: string;
  }
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  setUsernameOnSignUp: (username: string) => Promise<boolean>;
  isUsernameAvailable: (username: string) => Promise<boolean>;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch additional user data from Firestore
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Add username to user object
            (user as any).username = userData.username;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create a basic user document
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        createdAt: new Date(),
        status: "active",
        role: "user"
      });
      
      toast({
        title: "Sign up successful",
        description: "Please set your username",
      });
      
      return userCredential.user;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to create account";
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sign in";
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if this is a new user (first time sign in with Google)
      const userDocRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create a new user document for Google sign-in
        await setDoc(userDocRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || "",
          photoURL: result.user.photoURL || "",
          createdAt: new Date(),
          status: "active",
          role: "user"
        });
      }
      
      return result.user;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sign in with Google";
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out successfully",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sign out";
      toast({
        title: "Sign out failed",
        description: errorMessage,
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
        description: "Check your email inbox for instructions",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send reset email";
      toast({
        title: "Password reset failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUserEmail = async (email: string) => {
    try {
      if (currentUser) {
        await updateEmail(currentUser, email);
        toast({
          title: "Email updated",
          description: "Your email has been successfully updated",
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to update email";
      toast({
        title: "Email update failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    try {
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName,
          ...(photoURL && { photoURL })
        });
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated",
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to update profile";
      toast({
        title: "Profile update failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const isUsernameAvailable = async (username: string): Promise<boolean> => {
    if (!username || username.trim().length < 3 || username.trim().length > 15) {
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return false;
    }
    
    try {
      // Check in the usernames collection
      const usernameRef = doc(db, "usernames", username.toLowerCase());
      const docSnap = await getDoc(usernameRef);
      
      // Also check if any user has this username field
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      return !docSnap.exists() && querySnapshot.empty;
    } catch (error) {
      console.error("Error checking username availability:", error);
      return false;
    }
  };

  const setUsernameOnSignUp = async (username: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      if (!username || username.trim().length < 3 || username.trim().length > 15) {
        toast({
          title: "Invalid username",
          description: "Username must be between 3 and 15 characters long",
          variant: "destructive",
        });
        return false;
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        toast({
          title: "Invalid username",
          description: "Username can only contain letters, numbers, and underscores",
          variant: "destructive",
        });
        return false;
      }
      
      const normalizedUsername = username.toLowerCase();
      const isAvailable = await isUsernameAvailable(normalizedUsername);
      
      if (!isAvailable) {
        toast({
          title: "Username unavailable",
          description: "Please choose a different username",
          variant: "destructive",
        });
        return false;
      }
      
      // First create/update the user document
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, {
        uid: currentUser.uid,
        email: currentUser.email,
        username: normalizedUsername,
        displayName: normalizedUsername,
        photoURL: currentUser.photoURL || "",
        createdAt: new Date(),
        status: "active",
        role: "user"
      }, { merge: true });
      
      // Then set username in usernames collection (for uniqueness check)
      await setDoc(doc(db, "usernames", normalizedUsername), {
        uid: currentUser.uid
      });
      
      // Update Firebase auth profile
      await updateProfile(currentUser, {
        displayName: normalizedUsername
      });
      
      // Update the local user object
      (currentUser as any).username = normalizedUsername;
      
      toast({
        title: "Username set successfully",
        description: "Your profile has been updated"
      });
      
      return true;
    } catch (error) {
      console.error("Error setting username:", error);
      toast({
        title: "Failed to set username",
        description: "Please try again later",
        variant: "destructive",
      });
      return false;
    }
  };

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
    updateUserEmail,
    updateUserProfile,
    setUsernameOnSignUp,
    isUsernameAvailable
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
