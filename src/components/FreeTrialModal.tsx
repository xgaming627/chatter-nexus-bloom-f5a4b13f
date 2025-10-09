import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles } from 'lucide-react';

interface FreeTrialModalProps {
  open: boolean;
  onClose: () => void;
}

export const FreeTrialModal: React.FC<FreeTrialModalProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            Welcome to Nexus Plus Free Trial!
          </DialogTitle>
          <DialogDescription className="text-base pt-4">
            <div className="space-y-4">
              <p className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-1" />
                <span>
                  You've been given a <strong>3-day free trial</strong> of Nexus Plus as a welcome gift!
                </span>
              </p>
              <p>
                Enjoy all premium features including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>1080p HD Screen Sharing</li>
                <li>Golden Username Badge</li>
                <li>50MB file uploads (vs 15MB)</li>
                <li>Special call effects & filters</li>
                <li>Priority support</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Your trial will expire in 3 days. We'll remind you before it ends!
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Start Using Nexus Plus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface TrialExpiringModalProps {
  open: boolean;
  onClose: () => void;
  onViewPricing: () => void;
}

export const TrialExpiringModal: React.FC<TrialExpiringModalProps> = ({ open, onClose, onViewPricing }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            Your Trial is Ending Soon!
          </DialogTitle>
          <DialogDescription className="text-base pt-4">
            <div className="space-y-4">
              <p>
                Your <strong>3-day Nexus Plus trial</strong> expires in less than 24 hours!
              </p>
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="font-bold text-lg mb-2">🎉 Special Trial End Offer!</p>
                <p className="text-2xl font-bold text-primary mb-1">$3.33 for 1 month</p>
                <p className="text-sm text-muted-foreground">Instead of $9.99 for 3 months</p>
                <p className="text-sm mt-2">Try Nexus Plus for just one more month at our special rate!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Continue enjoying premium features or let your trial expire.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={onViewPricing} className="w-full" size="lg">
            <Crown className="mr-2 h-5 w-5" />
            Get Special Offer - $3.33
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};