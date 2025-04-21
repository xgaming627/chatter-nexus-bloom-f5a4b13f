
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoginHistory from './LoginHistory';
import { Globe, Lock, Shield, Settings, Clock, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import TermsOfService from './TermsOfService';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowModeratorPanel?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange, onShowModeratorPanel }) => {
  const [language, setLanguage] = useState('english');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [storeChats, setStoreChats] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
    { value: 'chinese', label: 'Chinese' },
    { value: 'japanese', label: 'Japanese' }
  ];

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    // Apply dark mode to document
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const startTutorial = () => {
    setShowTutorial(true);
    onOpenChange(false);
    // Show tutorial on close
    setTimeout(() => {
      // This would trigger the tutorial sequence
      localStorage.removeItem('hasSeenWelcome');
      window.location.reload();
    }, 500);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] md:h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <Tabs defaultValue="preferences" className="w-full">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
              <TabsTrigger value="credits">Credits</TabsTrigger>
              {onShowModeratorPanel && (
                <TabsTrigger value="moderator">Moderator</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="preferences" className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose your preferred language</p>
                </div>
              </div>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
                  </div>
                  <Switch 
                    checked={darkMode} 
                    onCheckedChange={handleDarkModeToggle}
                  />
                </div>
              </div>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications</Label>
                    <p className="text-xs text-muted-foreground">Enable or disable notifications</p>
                  </div>
                  <Switch 
                    checked={notifications} 
                    onCheckedChange={setNotifications}
                  />
                </div>
              </div>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound Effects</Label>
                    <p className="text-xs text-muted-foreground">Enable or disable sound effects</p>
                  </div>
                  <Switch 
                    checked={soundEffects} 
                    onCheckedChange={setSoundEffects}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Store Chats</Label>
                    <p className="text-xs text-muted-foreground">Save important chats to access later</p>
                  </div>
                  <Switch 
                    checked={storeChats} 
                    onCheckedChange={setStoreChats}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Tutorial</Label>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={startTutorial}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Start Tutorial
                  </Button>
                  <p className="text-xs text-muted-foreground">Restart the welcome tutorial that shows features and functionality</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="security">
              <LoginHistory />
            </TabsContent>
            
            <TabsContent value="terms">
              <TermsOfService />
            </TabsContent>

            <TabsContent value="credits" className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg border">
                <h3 className="text-2xl font-bold mb-6 text-center">ChatNexus Credits</h3>
                
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm">
                    <h4 className="text-xl font-medium text-teams-purple">Lead Scripter and Developer</h4>
                    <p className="text-lg mt-2">Vitor Rossato</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm">
                    <h4 className="text-xl font-medium text-teams-purple">Version</h4>
                    <p className="text-lg mt-2">v1.13</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm">
                    <h4 className="text-xl font-medium text-teams-purple">Last Updated</h4>
                    <p className="text-lg mt-2">April 2025</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {onShowModeratorPanel && (
              <TabsContent value="moderator" className="space-y-4 py-4">
                <div className="flex items-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Shield className="h-12 w-12 text-blue-500 mr-4" />
                  <div>
                    <h4 className="text-lg font-medium">Moderator Controls</h4>
                    <p className="text-sm text-muted-foreground">Access advanced moderation tools and settings</p>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    onShowModeratorPanel();
                    onOpenChange(false);
                  }} 
                  className="w-full"
                  variant="outline"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Open Moderator Panel
                </Button>
              </TabsContent>
            )}
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
