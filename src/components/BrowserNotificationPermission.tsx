import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

export const BrowserNotificationPermission: React.FC = () => {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return;
    }

    // Check if permission hasn't been asked yet
    if (Notification.permission === 'default') {
      // Show dialog after a short delay
      setTimeout(() => {
        setShowDialog(true);
      }, 2000);
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Test notification
        new Notification('Notifications Enabled', {
          body: 'You will now receive notifications for messages and calls',
          icon: '/favicon.ico'
        });
      }
      setShowDialog(false);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setShowDialog(false);
    }
  };

  const handleDismiss = () => {
    setShowDialog(false);
  };

  if (!showDialog) return null;

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enable Notifications
          </DialogTitle>
          <DialogDescription>
            Get notified about new messages and incoming calls even when you're not looking at this tab.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleEnableNotifications} className="flex-1">
            Enable Notifications
          </Button>
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
