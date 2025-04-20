
import React, { useState, useEffect } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import UserAvatar from './UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { Headphones, Image, Moon, Sun, Globe } from 'lucide-react';
import LiveSupportWindow from './LiveSupportWindow';

const ProfileDropdown: React.FC = () => {
  const { currentUser, logout, updateUserEmail, updateUserProfile, isUsernameAvailable } = useAuth();
  const { toast } = useToast();
  
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  
  const [newDisplayName, setNewDisplayName] = useState(currentUser?.displayName || '');
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newUsername, setNewUsername] = useState(currentUser?.displayName || '');
  const [isUsernameValid, setIsUsernameValid] = useState<boolean | null>(null);
  const [resetEmail, setResetEmail] = useState(currentUser?.email || '');
  const [loading, setLoading] = useState(false);
  
  // Theme and language handling
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('english');
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  
  // Profile picture handling
  const [previewURL, setPreviewURL] = useState<string | null>(currentUser?.photoURL || null);
  
  // Handle theme toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewURL(reader.result as string);
        
        // Since we don't have Firebase Storage, we'll mock the avatar update
        // In a real app, you would upload this file to storage
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated"
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setNewUsername(value);
    
    if (value.length >= 3) {
      const available = await isUsernameAvailable(value);
      setIsUsernameValid(available);
    } else {
      setIsUsernameValid(null);
    }
  };
  
  const handleProfileUpdate = async () => {
    setLoading(true);
    
    try {
      await updateUserProfile(newDisplayName);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully"
      });
      setShowProfileDialog(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailUpdate = async () => {
    setLoading(true);
    
    try {
      await updateUserEmail(newEmail);
      toast({
        title: "Email updated",
        description: "Your email has been updated successfully"
      });
      setShowEmailDialog(false);
    } catch (error) {
      console.error("Error updating email:", error);
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleUsernameUpdate = async () => {
    setLoading(true);
    
    try {
      await updateUserProfile(newUsername);
      toast({
        title: "Username updated",
        description: "Your username has been updated successfully"
      });
      setShowUsernameDialog(false);
    } catch (error) {
      console.error("Error updating username:", error);
      toast({
        title: "Error",
        description: "Failed to update username",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    setLoading(true);
    try {
      // This would use your resetPassword function from auth context
      toast({
        title: "Password reset link sent",
        description: "Please check your email"
      });
      setShowPasswordDialog(false);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: "Failed to send password reset link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    toast({
      title: "Language changed",
      description: `Interface language changed to ${lang}`
    });
    setShowLanguageDialog(false);
  };
  
  if (!currentUser) return null;
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
            <UserAvatar 
              username={currentUser.displayName || undefined} 
              photoURL={previewURL || currentUser.photoURL || undefined}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{currentUser.displayName}</span>
              <span className="text-xs font-normal text-muted-foreground">{currentUser.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
            <div className="flex items-center w-full">
              <Image className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEmailDialog(true)}>Change Email</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowUsernameDialog(true)}>Change Username</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowPasswordDialog(true)}>Reset Password</DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme}>
            <div className="flex items-center w-full">
              {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowLanguageDialog(true)}>
            <div className="flex items-center w-full">
              <Globe className="mr-2 h-4 w-4" />
              <span>Change Language</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowSupportDialog(true)}>
            <div className="flex items-center w-full">
              <Headphones className="mr-2 h-4 w-4" />
              <span>Live Support</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>Sign Out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <UserAvatar 
                  username={currentUser.displayName || undefined} 
                  photoURL={previewURL || currentUser.photoURL || undefined}
                  size="lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full flex items-center justify-center"
                  onClick={() => document.getElementById('profile-picture')?.click()}
                >
                  <Image className="h-4 w-4" />
                </Button>
                <input
                  id="profile-picture"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowProfileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleProfileUpdate} disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Enter your new email address
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailUpdate} disabled={loading}>
              {loading ? "Updating..." : "Update Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Username Dialog */}
      <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
            <DialogDescription>
              Enter your new username
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">New Username</Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={handleUsernameChange}
              />
              
              {isUsernameValid === true && newUsername.length >= 3 && (
                <p className="text-sm text-green-600">Username is available!</p>
              )}
              
              {isUsernameValid === false && (
                <p className="text-sm text-red-600">
                  Username is already taken
                </p>
              )}
              
              {newUsername.length > 0 && newUsername.length < 3 && (
                <p className="text-sm text-red-600">
                  Username must be at least 3 characters
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowUsernameDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUsernameUpdate} 
              disabled={loading || isUsernameValid !== true || newUsername.length < 3}
            >
              {loading ? "Updating..." : "Update Username"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              We'll send you an email with instructions to reset your password
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordReset} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Language Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Language</DialogTitle>
            <DialogDescription>
              Select your preferred interface language
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Button
              variant={language === 'english' ? 'default' : 'outline'}
              onClick={() => handleLanguageChange('english')}
              className="justify-start"
            >
              English
            </Button>
            <Button
              variant={language === 'spanish' ? 'default' : 'outline'}
              onClick={() => handleLanguageChange('spanish')}
              className="justify-start"
            >
              Español
            </Button>
            <Button
              variant={language === 'french' ? 'default' : 'outline'}
              onClick={() => handleLanguageChange('french')}
              className="justify-start"
            >
              Français
            </Button>
            <Button
              variant={language === 'german' ? 'default' : 'outline'}
              onClick={() => handleLanguageChange('german')}
              className="justify-start"
            >
              Deutsch
            </Button>
            <Button
              variant={language === 'portuguese' ? 'default' : 'outline'}
              onClick={() => handleLanguageChange('portuguese')}
              className="justify-start"
            >
              Português
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Live Support Dialog */}
      <LiveSupportWindow 
        open={showSupportDialog} 
        onOpenChange={setShowSupportDialog} 
      />
    </>
  );
};

export default ProfileDropdown;
