import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import LoginHistory from "./LoginHistory";
import TermsOfService from "./TermsOfService";
import StatusSelector from "./StatusSelector";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import Credits from "./Credits";
import { useRole } from "@/hooks/useRole";
import { useNavigate } from 'react-router-dom';
import { Crown } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowModeratorPanel?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
  onShowModeratorPanel,
}) => {
  const { currentUser, logout } = useAuth();
  const { updateDmSettings } = useChat();
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const { isModerator } = useRole();
  const navigate = useNavigate();
  const [useDarkMode, setUseDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const [dmSetting, setDmSetting] = useState<"open" | "closed">("open");
  const [showTutorial, setShowTutorial] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState<'online' | 'away' | 'offline'>('offline');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setStatus((profile.onlineStatus as 'online' | 'away' | 'offline') || 'offline');
    }
  }, [profile]);
  
  const handleLogout = async () => {
    try {
      await logout();
      onOpenChange(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleDarkMode = () => {
    setUseDarkMode(!useDarkMode);
    if (typeof window !== "undefined") {
      const html = document.documentElement;
      html.classList.toggle("dark");
      localStorage.setItem('theme', html.classList.contains("dark") ? 'dark' : 'light');
    }
  };

  const isOwnerUser = (user: any) => {
    return user?.email === 'quiblyservices@gmail.com';
  };

  if (!currentUser) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your account settings and preferences.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="account" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter display name"
                    />
                    <Button 
                      onClick={async () => {
                        const success = await updateProfile({ displayName: displayName });
                        if (success) {
                          toast({
                            title: 'Success',
                            description: 'Display name updated successfully',
                          });
                        }
                      }}
                      disabled={!displayName.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <StatusSelector 
                    currentStatus={status} 
                    onStatusChange={(newStatus: 'online' | 'away' | 'offline') => {
                      setStatus(newStatus);
                      updateProfile({ onlineStatus: newStatus });
                    }} 
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="dark-mode"
                    checked={useDarkMode}
                    onCheckedChange={toggleDarkMode}
                  />
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                </div>
                
                <div className="space-y-2">
                  <Label>DM Settings</Label>
                  <RadioGroup
                    value={dmSetting}
                    onValueChange={(value: "open" | "closed") => {
                      setDmSetting(value);
                      updateDmSettings(value);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="open" id="dm-open" />
                      <Label htmlFor="dm-open">Open DMs (Anyone can message you)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="closed" id="dm-closed" />
                      <Label htmlFor="dm-closed">Closed DMs (Only you can start conversations)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {isModerator && onShowModeratorPanel && (
                  <Button 
                    onClick={() => {
                      onOpenChange(false);
                      onShowModeratorPanel();
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Moderator Panel
                  </Button>
                )}

                <Button onClick={handleLogout} variant="destructive">
                  Log Out
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Privacy Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Control your privacy and notification preferences.
                </p>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="do-not-disturb"
                    checked={profile?.doNotDisturb || false}
                    onCheckedChange={(checked) => {
                      updateProfile({ doNotDisturb: checked });
                      toast({
                        title: checked ? 'Do Not Disturb Enabled' : 'Do Not Disturb Disabled',
                        description: checked ? 'You will not receive sound notifications' : 'Sound notifications re-enabled'
                      });
                    }}
                  />
                  <Label htmlFor="do-not-disturb">Do Not Disturb (Disable sound notifications)</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <LoginHistory />
            </TabsContent>

            <TabsContent value="terms">
              <TermsOfService />
            </TabsContent>
          </Tabs>

          <Credits />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SettingsModal;