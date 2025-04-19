
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
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

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your application experience
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
