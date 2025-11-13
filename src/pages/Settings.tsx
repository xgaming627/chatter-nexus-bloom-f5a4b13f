import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X, Save, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

const Settings = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [activeTab, setActiveTab] = useState('account');
  
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [description, setDescription] = useState(profile.description || '');
  const [doNotDisturb, setDoNotDisturb] = useState(profile.doNotDisturb);

  const handleSave = async () => {
    const success = await updateProfile({
      displayName,
      photoURL,
      description,
      doNotDisturb,
    });

    if (success) {
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-60 min-h-screen bg-muted/30 border-r p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">Settings</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="space-y-1">
          <Button 
            variant="ghost" 
            className={`w-full justify-start ${activeTab === 'account' ? 'bg-muted' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            My Account
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full justify-start ${activeTab === 'privacy' ? 'bg-muted' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            Privacy & Safety
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full justify-start ${activeTab === 'appearance' ? 'bg-muted' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </Button>
          
          <div className="pt-4 mt-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          {activeTab === 'account' && (
            <>
              <h1 className="text-2xl font-bold mb-6">My Account</h1>
              
              <Card className="p-6 mb-6">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profile.username || ''}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Username cannot be changed
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="photoURL">Profile Picture URL</Label>
                    <Input
                      id="photoURL"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="Enter profile picture URL"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">About Me</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell others about yourself"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input
                      value={currentUser?.email || ''}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </Card>

              <Button onClick={handleSave} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          )}

          {activeTab === 'privacy' && (
            <>
              <h1 className="text-2xl font-bold mb-6">Privacy & Safety</h1>
              
              <Card className="p-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Do Not Disturb</Label>
                      <p className="text-xs text-muted-foreground">
                        Mute all notifications
                      </p>
                    </div>
                    <Switch
                      checked={doNotDisturb}
                      onCheckedChange={setDoNotDisturb}
                    />
                  </div>
                </div>
              </Card>

              <Button onClick={handleSave} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <h1 className="text-2xl font-bold mb-6">Appearance</h1>
              
              <Card className="p-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      The app automatically uses dark mode. This matches Discord's style.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4 bg-background">
                        <div className="w-full h-20 rounded bg-muted mb-2"></div>
                        <p className="text-sm text-center">Dark Mode (Active)</p>
                      </div>
                      <div className="border rounded-lg p-4 bg-gray-100 opacity-50">
                        <div className="w-full h-20 rounded bg-white mb-2"></div>
                        <p className="text-sm text-center text-gray-500">Light Mode (Unavailable)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
