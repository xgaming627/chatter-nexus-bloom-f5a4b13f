
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import TermsOfService from './TermsOfService';

const UsernameSetupModal: React.FC = () => {
  const { currentUser, setUsernameOnSignUp, isUsernameAvailable } = useAuth();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasUsername, setHasUsername] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const checkForUsername = async () => {
      if (!currentUser) return;
      
      // Check if user has a username
      if (currentUser.displayName || (currentUser as any).username) {
        setHasUsername(true);
        setOpen(false);
      } else {
        console.log("No username found, showing modal");
        setHasUsername(false);
        setOpen(true);
      }
    };
    
    checkForUsername();
  }, [currentUser]);
  
  const checkUsernameAvailability = async () => {
    if (!username || username.trim().length === 0) {
      setError('Please enter a username');
      setIsUsernameValid(false);
      return;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      setIsUsernameValid(false);
      return;
    }
    
    if (username.length > 15) {
      setError('Username must be at most 15 characters long');
      setIsUsernameValid(false);
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      setIsUsernameValid(false);
      return;
    }
    
    setIsChecking(true);
    setError('');
    
    try {
      const available = await isUsernameAvailable(username);
      
      if (!available) {
        setError('Username is already taken');
        setIsUsernameValid(false);
      } else {
        setIsUsernameValid(true);
      }
    } catch (error) {
      console.error('Error checking username availability:', error);
      setError('Error checking username availability');
      setIsUsernameValid(false);
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setIsUsernameValid(false);
    setError('');
  };
  
  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!isUsernameValid) {
      await checkUsernameAvailability();
      if (!isUsernameValid) return;
    }
    
    if (!agreedToTerms) {
      toast({
        title: 'Terms Agreement Required',
        description: 'You must agree to the Terms of Service to continue.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await setUsernameOnSignUp(username);
      
      if (success === true) {
        setHasUsername(true);
        setShowTutorial(true);
        setOpen(false);
      } else if (success === false) {
        toast({
          title: 'Username Setup Failed',
          description: 'Unable to set username. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error setting username:', error);
      toast({
        title: 'Error setting username',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const completeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasCompletedTutorial', 'true');
  };
  
  // Force user to set a username before using the app
  const preventClose = () => {
    if (!hasUsername) {
      toast({
        title: 'Username required',
        description: 'Please set a username to continue',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };
  
  return (
    <>
      <Dialog 
        open={open && !hasUsername} 
        onOpenChange={(newOpen) => {
          if (preventClose()) {
            setOpen(newOpen);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
          if (!hasUsername) {
            e.preventDefault();
          }
        }}>
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
                    isUsernameValid ? 'border-green-500' : ''
                  }
                />
                <div className="text-xs mt-1">
                  {error && <p className="text-red-500">{error}</p>}
                  {isUsernameValid && <p className="text-green-500">Username is available</p>}
                  <p className="text-muted-foreground">
                    Username must be 3-15 characters long and can only contain letters, numbers, and underscores.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-2 mt-2">
              <input 
                type="checkbox" 
                id="agree-terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="agree-terms" className="text-sm">
                I agree to the{" "}
                <button 
                  type="button" 
                  className="text-blue-600 hover:underline"
                  onClick={() => setShowTerms(true)}
                >
                  Terms of Service
                </button>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !username || Boolean(error) || isChecking || !isUsernameValid || !agreedToTerms}
            >
              {isSubmitting ? "Setting Username..." : "Set Username"}
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
      
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
            <DialogDescription>
              Please read and agree to our Terms of Service to continue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto pr-2">
            <TermsOfService />
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setShowTerms(false)}>Close</Button>
            <Button 
              onClick={() => {
                setAgreedToTerms(true);
                setShowTerms(false);
              }}
            >
              I Agree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsernameSetupModal;
