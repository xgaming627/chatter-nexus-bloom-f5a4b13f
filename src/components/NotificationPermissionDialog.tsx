import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';

interface NotificationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationPermissionDialog: React.FC<NotificationPermissionDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      setCanClose(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanClose(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  const handleEnableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('notificationPermissionRequested', 'true');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationPermissionRequested', 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={canClose ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-[400px]" onPointerDownOutside={(e) => !canClose && e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Bell className="w-12 h-12 text-primary" />
          </div>
          <DialogTitle>Enable Notifications</DialogTitle>
          <DialogDescription className="text-center">
            Get notified when you receive messages, support updates, warnings, or username changes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          <Button onClick={handleEnableNotifications} className="w-full">
            <Bell className="w-4 h-4 mr-2" />
            Enable Notifications
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleDismiss}
            disabled={!canClose}
            className="w-full"
          >
            <BellOff className="w-4 h-4 mr-2" />
            {canClose ? 'Not Now' : `Wait ${countdown}s`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPermissionDialog;