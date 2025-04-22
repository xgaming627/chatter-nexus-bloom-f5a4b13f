
import React, { useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import LoginHistory from "./LoginHistory";
import TermsOfService from "./TermsOfService";

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
  const [useDarkMode, setUseDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const [dmSetting, setDmSetting] = useState<"open" | "closed">("open");
  const [showTutorial, setShowTutorial] = useState(false);
  
  const handleLogout = async () => {
    try {
      await logout();
      onOpenChange(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const toggleDarkMode = () => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark");
      setUseDarkMode(document.documentElement.classList.contains("dark"));
      localStorage.setItem("theme", useDarkMode ? "light" : "dark");
    }
  };

  const handleDmSettingChange = async (value: "open" | "closed") => {
    setDmSetting(value);
    if (currentUser) {
      await updateDmSettings(value);
    }
  };

  const handleShowTutorial = () => {
    setShowTutorial(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account settings and preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-5">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage your account settings
                  </p>
                </div>
                <Button variant="outline" onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Tutorial</h4>
                  <p className="text-sm text-muted-foreground">
                    Show the welcome tutorial again
                  </p>
                </div>
                <Button variant="outline" onClick={handleShowTutorial}>
                  Show Tutorial
                </Button>
              </div>

              {onShowModeratorPanel && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-medium">Moderator Panel</h4>
                      <p className="text-sm text-muted-foreground">
                        Access the moderator control panel
                      </p>
                    </div>
                  </div>
                  <Button onClick={onShowModeratorPanel}>Open Panel</Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Direct Message Settings</h4>
                <RadioGroup 
                  defaultValue={dmSetting} 
                  onValueChange={(value) => handleDmSettingChange(value as "open" | "closed")}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="open" id="dm-open" />
                    <Label htmlFor="dm-open">Open - Anyone can message you</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="closed" id="dm-closed" />
                    <Label htmlFor="dm-closed">Closed - Only people you've messaged can contact you</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-sm font-medium">Read Receipts</h4>
                  <p className="text-sm text-muted-foreground">
                    Show when you've read messages
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-sm font-medium">Online Status</h4>
                  <p className="text-sm text-muted-foreground">
                    Show when you're online
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Dark Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Turn dark mode {useDarkMode ? "off" : "on"}
                  </p>
                </div>
                <Switch checked={useDarkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-4">
            <LoginHistory />
          </TabsContent>
          
          <TabsContent value="about" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">About ChatNexus</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Version 1.13.5
                </p>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Terms of Service</h4>
                <div className="border rounded-md p-4 h-40 overflow-y-auto">
                  <TermsOfService />
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Credits</h4>
                <div className="border rounded-md p-4">
                  <p className="font-medium">Lead Scripter and Developer</p>
                  <p className="text-muted-foreground">Vitor Rossato</p>
                  
                  <p className="font-medium mt-2">Moderators</p>
                  <p className="text-muted-foreground">Vitor Rossato</p>
                  <p className="text-muted-foreground">Lukas Braga</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
