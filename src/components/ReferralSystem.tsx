import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Copy, Users, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReferralSystemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReferralSystem = ({ open, onOpenChange }: ReferralSystemProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState('');
  const [uses, setUses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && open) {
      fetchOrCreateReferralCode();
    }
  }, [currentUser, open]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const fetchOrCreateReferralCode = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      let { data, error } = await supabase
        .from('referral_codes')
        .select('code, uses')
        .eq('user_id', currentUser.uid)
        .single();

      if (error || !data) {
        const newCode = generateCode();
        const { data: newData, error: insertError } = await supabase
          .from('referral_codes')
          .insert({
            user_id: currentUser.uid,
            code: newCode,
            uses: 0
          })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newData;
      }

      setReferralCode(data.code);
      setUses(data.uses);
    } catch (error) {
      console.error('Error fetching referral code:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard'
    });
  };

  const pointsEarned = uses * 400;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Friends
          </DialogTitle>
          <DialogDescription>
            Earn 400 points for each friend who signs up with your referral link!
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Your Referral Code</span>
                <span className="text-2xl font-bold">{referralCode}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}?ref=${referralCode}`}
                className="flex-1"
              />
              <Button onClick={copyReferralLink} size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{uses}</div>
                <div className="text-xs text-muted-foreground">Friends Invited</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">{pointsEarned}</div>
                <div className="text-xs text-muted-foreground">Points Earned</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Each friend earns you 400 points</p>
              <p>• Friends must sign up with a unique IP address</p>
              <p>• Points are awarded immediately upon signup</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
