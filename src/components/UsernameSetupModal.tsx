
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

const UsernameSetupModal: React.FC = () => {
  const { currentUser, setUsernameOnSignUp, isUsernameAvailable } = useAuth();
  const [username, setUsername] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Show modal if user is signed in but doesn't have a username set
    if (currentUser && !currentUser.displayName) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [currentUser]);

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setUsername(value);
    
    if (value.length >= 3) {
      const available = await isUsernameAvailable(value);
      setIsAvailable(available);
    } else {
      setIsAvailable(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (username.length < 3) {
      setIsAvailable(false);
      setIsSubmitting(false);
      return;
    }
    
    const success = await setUsernameOnSignUp(username);
    
    if (success) {
      setShowModal(false);
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Your Username</DialogTitle>
          <DialogDescription>
            Please choose a username to complete your profile. This will be visible to other users.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              id="username"
              placeholder="Username"
              value={username}
              onChange={handleUsernameChange}
              className="w-full"
            />
            
            {isAvailable === true && username.length >= 3 && (
              <p className="text-sm text-green-600">Username is available!</p>
            )}
            
            {isAvailable === false && (
              <p className="text-sm text-red-600">
                {username.length < 3 
                  ? "Username must be at least 3 characters" 
                  : "Username is already taken"}
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={!isAvailable || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Setting Up..." : "Confirm Username"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameSetupModal;
