
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { User } from '@/context/ChatContext';
import { useToast } from "@/hooks/use-toast";

interface WarnUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWarn: (reason: string, duration: string) => void;
  user: User | null;
}

const WarnUserDialog: React.FC<WarnUserDialogProps> = ({
  open,
  onOpenChange,
  onWarn,
  user
}) => {
  const [warnReason, setWarnReason] = useState('');
  const [duration, setDuration] = useState('24h');
  const [customDuration, setCustomDuration] = useState('');
  const { toast } = useToast();
  
  const handleSubmit = () => {
    try {
      const finalDuration = duration === 'custom' ? customDuration : duration;
      onWarn(warnReason, finalDuration);
      
      toast({
        title: "Warning issued",
        description: `Warning sent to ${user?.username || 'user'} for ${finalDuration}`,
      });
      
      setWarnReason('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Warning failed",
        description: "There was an error issuing the warning. Please try again.",
        variant: "destructive",
      });
      console.error("Error issuing warning:", error);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            Warn User
          </DialogTitle>
          <DialogDescription>
            Issue a warning to {user?.username || 'this user'}. Their account will be temporarily restricted.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="warn-reason">Warning Reason</Label>
            <Textarea
              id="warn-reason"
              placeholder="Explain the reason for the warning..."
              value={warnReason}
              onChange={(e) => setWarnReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="warn-duration">Duration</Label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                id="warn-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="24h">24 hours</option>
                <option value="48h">48 hours</option>
                <option value="72h">72 hours</option>
                <option value="7d">7 days</option>
                <option value="14d">14 days</option>
                <option value="30d">30 days</option>
                <option value="custom">Custom</option>
              </select>
              
              {duration === 'custom' && (
                <Input
                  type="text"
                  placeholder="e.g. 5h, 3d"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Format: 24h = 24 hours, 7d = 7 days
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!warnReason.trim() || (duration === 'custom' && !customDuration.trim())}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Issue Warning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WarnUserDialog;
