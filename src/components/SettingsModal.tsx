
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
import { Settings, Globe, Shield, Lock } from 'lucide-react';
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
  
  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
    { value: 'chinese', label: 'Chinese' },
    { value: 'japanese', label: 'Japanese' }
  ];
  
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
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
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
                    onCheckedChange={setDarkMode}
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
            </TabsContent>
            
            <TabsContent value="security">
              <LoginHistory />
            </TabsContent>
            
            <TabsContent value="terms">
              <TermsOfService />
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
