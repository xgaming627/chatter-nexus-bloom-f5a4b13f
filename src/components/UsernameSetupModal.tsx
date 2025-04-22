
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const UsernameSetupModal: React.FC = () => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [hasUsername, setHasUsername] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  
  useEffect(() => {
    const checkUsername = async () => {
      if (!currentUser) return;
      
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().username) {
          setHasUsername(true);
          setOpen(false);
        } else {
          setHasUsername(false);
          setOpen(true);
        }
      } catch (error) {
        console.error('Error checking username:', error);
      }
    };
    
    checkUsername();
  }, [currentUser]);
  
  const checkUsernameAvailability = async () => {
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      setIsAvailable(false);
      return;
    }
    
    if (username.length > 15) {
      setError('Username must be at most 15 characters long');
      setIsAvailable(false);
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      setIsAvailable(false);
      return;
    }
    
    setIsChecking(true);
    setError('');
    
    try {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError('Username is already taken');
        setIsAvailable(false);
      } else {
        setIsAvailable(true);
      }
    } catch (error) {
      console.error('Error checking username availability:', error);
      setError('Error checking username availability');
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setIsAvailable(false);
    setError('');
  };
  
  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!isAvailable) {
      await checkUsernameAvailability();
      if (!isAvailable) return;
    }
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        username
      });
      
      toast({
        title: 'Username set successfully!',
        description: `Your username is now @${username}`,
      });
      
      setHasUsername(true);
      setShowTutorial(true);
    } catch (error) {
      console.error('Error setting username:', error);
      toast({
        title: 'Error setting username',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };
  
  const completeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasCompletedTutorial', 'true');
  };
  
  return (
    <>
      <Dialog open={open && !hasUsername} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Your Username</DialogTitle>
            <DialogDescription>
              Choose a unique username for your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <div className="col-span-3">
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={handleUsernameChange}
                  onBlur={checkUsernameAvailability}
                  className={
                    error ? 'border-red-500' : 
                    isAvailable ? 'border-green-500' : ''
                  }
                />
                <div className="text-xs mt-1">
                  {error && <p className="text-red-500">{error}</p>}
                  {isAvailable && <p className="text-green-500">Username is available</p>}
                  <p className="text-muted-foreground">
                    Username must be 3-15 characters long and can only contain letters, numbers, and underscores.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSubmit} 
              disabled={!username || Boolean(error) || isChecking || !isAvailable}
            >
              Set Username
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Welcome to ChatNexus!</DialogTitle>
            <DialogDescription>
              Here's a quick tutorial to help you get started.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">1. Messaging</h3>
                <p>
                  Start a conversation by clicking the "New Chat" button. You can search for users and send messages, files, and more.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">2. Group Chats</h3>
                <p>
                  Create group chats with multiple users. Customize group names and manage members.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">3. Voice & Video Calls</h3>
                <p>
                  Make voice and video calls directly from chat conversations.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">4. Profile Settings</h3>
                <p>
                  Update your profile description and status in the settings menu.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">5. DM Settings & Notifications</h3>
                <p>
                  Control who can message you and how you receive notifications.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">6. Live Support</h3>
                <p>
                  Need help? Contact our support team through the profile menu.
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <h4 className="font-medium text-blue-800 dark:text-blue-300">Try it out!</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Message the user "xgaming" to try out all features and complete the tutorial.
                </p>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button onClick={completeTutorial}>
              I'm Ready to Start!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsernameSetupModal;
