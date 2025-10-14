import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const ReferralDialog: React.FC<ReferralDialogProps> = ({ open, onOpenChange, userId }) => {
  const [referralCode, setReferralCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!referralCode.trim() && referralCode !== 'NONE') {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a referral code or select "No Code"',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (referralCode.trim() && referralCode !== 'NONE') {
        // Look up the referral code
        const { data: referralData, error: referralError } = await supabase
          .from('referral_codes')
          .select('id, user_id, uses')
          .eq('code', referralCode.trim().toUpperCase())
          .single();

        if (referralError || !referralData) {
          toast({
            title: 'Invalid Referral Code',
            description: 'The referral code you entered does not exist',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }

        if (referralData.user_id === userId) {
          toast({
            title: 'Invalid Referral',
            description: 'You cannot use your own referral code',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }

        // Get user IP for duplicate checking
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();

        // Check for duplicate IP usage
        const { data: existingUse } = await supabase
          .from('referral_uses')
          .select('id')
          .eq('ip_address', ip)
          .limit(1);

        if (existingUse && existingUse.length > 0) {
          toast({
            title: 'Already Used',
            description: 'This referral system has already been used from this network',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }

        // Record the referral use
        const { error: useError } = await supabase
          .from('referral_uses')
          .insert({
            referral_code_id: referralData.id,
            referrer_user_id: referralData.user_id,
            referred_user_id: userId,
            ip_address: ip,
            points_awarded: 400,
          });

        if (useError) throw useError;

        // Update referral code uses
        const { error: updateError } = await supabase
          .from('referral_codes')
          .update({ uses: referralData.uses + 1 })
          .eq('id', referralData.id);

        if (updateError) throw updateError;

        // Add points to both users
        // Add to referrer
        const { data: referrerPoints } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_id', referralData.user_id)
          .single();

        if (referrerPoints) {
          await supabase
            .from('user_points')
            .update({ points: referrerPoints.points + 400 })
            .eq('user_id', referralData.user_id);
        } else {
          await supabase
            .from('user_points')
            .insert({ user_id: referralData.user_id, points: 400 });
        }

        // Add to new user
        const { data: newUserPoints } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_id', userId)
          .single();

        if (newUserPoints) {
          await supabase
            .from('user_points')
            .update({ points: newUserPoints.points + 400 })
            .eq('user_id', userId);
        } else {
          await supabase
            .from('user_points')
            .insert({ user_id: userId, points: 400 });
        }

        toast({
          title: 'Referral Applied!',
          description: 'You and your friend both earned 400 points!',
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error processing referral:', error);
      toast({
        title: 'Error',
        description: 'Failed to process referral code',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNoCode = () => {
    setReferralCode('NONE');
    handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to Nexus Chat!</DialogTitle>
          <DialogDescription>
            Do you have a referral code? Both you and your friend will get 400 points!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="referral-code">Referral Code (Optional)</Label>
            <Input
              id="referral-code"
              placeholder="Enter referral code..."
              value={referralCode === 'NONE' ? '' : referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              disabled={isProcessing}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleNoCode} disabled={isProcessing}>
            No Code
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing || !referralCode.trim()}>
            {isProcessing ? 'Processing...' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDialog;