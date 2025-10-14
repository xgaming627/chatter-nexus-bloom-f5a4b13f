
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, LogOut, Sun, Moon, Languages, User, MessageSquare } from "lucide-react";
import { useTheme } from "next-themes";
import LiveSupportWindow from "./LiveSupportWindow";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";

const ProfileDropdown = () => {
  const { currentUser, logout } = useAuth();
  const { isModerator } = useRole();
  const { theme, setTheme } = useTheme();
  const { profile, updateProfile } = useProfile();
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openSupportDialog, setOpenSupportDialog] = useState(false);
  const [openModeratorPanel, setOpenModeratorPanel] = useState(false);
  const [language, setLanguage] = useState("en");
  
  useEffect(() => {
    setUsername(profile.displayName);
    setPhotoURL(profile.photoURL);
  }, [profile]);
  
  const handleSave = async () => {
    const success = await updateProfile({
      displayName: username,
      photoURL: photoURL
    });
    
    if (success) {
      setOpenDialog(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };
  
  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    // This would normally change the app language
    // For now we'll just simulate it
    toast({
      title: "Language changed",
      description: `Language set to ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : 'French'}`
    });
  };
  
  const handleOpenModeratorPanel = () => {
    // Check if user is a moderator using role-based system
    if (isModerator()) {
      setOpenModeratorPanel(true);
      // Redirect to mod panel
      window.location.href = '/?mod=true';
    } else {
      toast({
        title: "Access denied",
        description: "You don't have permission to access moderator panel",
        variant: "destructive"
      });
    }
  };
  
  if (!currentUser) return null;
  
  // Get the first letter for avatar fallback
  const firstLetter = profile.displayName?.[0] || profile.username?.[0] || "U";
    
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.photoURL} alt="Profile" />
              <AvatarFallback>{firstLetter.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 dropdown-menu" align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{profile.displayName}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setOpenDialog(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpenSupportDialog(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Live Support</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleDarkMode}>
              {theme === "dark" ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Languages className="mr-2 h-4 w-4" />
              <span>Language</span>
              <div className="ml-auto flex">
                <button 
                  className={`px-1 ${language === 'en' ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                  onClick={() => changeLanguage('en')}
                >
                  EN
                </button>
                <span className="text-muted-foreground">|</span>
                <button 
                  className={`px-1 ${language === 'es' ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                  onClick={() => changeLanguage('es')}
                >
                  ES
                </button>
                <span className="text-muted-foreground">|</span>
                <button 
                  className={`px-1 ${language === 'fr' ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                  onClick={() => changeLanguage('fr')}
                >
                  FR
                </button>
              </div>
            </DropdownMenuItem>
            {isModerator() && (
              <DropdownMenuItem onClick={handleOpenModeratorPanel}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Moderator Panel</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center mb-4">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={photoURL || profile.photoURL} />
                <AvatarFallback>{firstLetter.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-url">Profile Picture URL</Label>
              <Input 
                id="profile-url" 
                placeholder="https://example.com/image.jpg" 
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="search-input"
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to an image to use as your profile picture
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input 
                id="name" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <LiveSupportWindow 
        open={openSupportDialog} 
        onOpenChange={setOpenSupportDialog}
      />
    </>
  );
};

export default ProfileDropdown;
