import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLiveSupport } from '@/context/LiveSupportContext';

interface LiveSupportEndDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LiveSupportEndDialog: React.FC<LiveSupportEndDialogProps> = ({ open, onOpenChange }) => {
  const { confirmEndSupport } = useLiveSupport();

  const handleEndSession = async () => {
    try {
      await confirmEndSupport();
      onOpenChange(false);
      
      // Also close the main support window by dispatching a custom event
      window.dispatchEvent(new CustomEvent('closeSupportWindow'));
    } catch (error) {
      console.error('Error ending support session:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End Support Session</DialogTitle>
          <DialogDescription>
            Support staff has requested to end this session. Do you want to end this support session now?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Continue Session
          </Button>
          <Button variant="destructive" onClick={handleEndSession}>
            End Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LiveSupportEndDialog;