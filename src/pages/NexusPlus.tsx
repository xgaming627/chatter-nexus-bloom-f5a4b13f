import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Crown, Sparkles, Zap, TrendingUp, Video, Palette } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatDistanceToNow } from 'date-fns';

const PAYHIP_SCRIPT_URL = 'https://payhip.com/embed-page.js?v=24u68984';
const PAYHIP_KEY = 'ck6Id'; // Replace with your actual Payhip embed key

const NexusPlus: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [nexusPlusActive, setNexusPlusActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    const checkNexusPlus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('nexus_plus_active, nexus_plus_expires_at')
        .eq('user_id', currentUser.uid)
        .single();

      if (data) {
        setNexusPlusActive(data.nexus_plus_active || false);
        if (data.nexus_plus_expires_at) {
          setExpiresAt(new Date(data.nexus_plus_expires_at));
        }
      }
    };

    checkNexusPlus();
  }, [currentUser, navigate]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  const handleVerifyLicense = async () => {
    if (!licenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }

    setIsVerifying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('You must be logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-license', {
        body: { licenseKey: licenseKey.trim() },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });

      if (error) throw error;

      if (data.success) {
        triggerConfetti();
        toast.success('🎉 Nexus Plus activated successfully!');
        setLicenseKey('');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(data.error || 'Invalid license key');
      }
    } catch (error: any) {
      console.error('License verification error:', error);
      toast.error(error.message || 'Failed to verify license key');
    } finally {
      setIsVerifying(false);
    }
  };

  const injectPayhip = () => {
    if (document.querySelector(`script[src="${PAYHIP_SCRIPT_URL}"]`)) {
      // Already loaded — reinit
      if ((window as any).PayhipPageEmbed) {
        console.log('✅ Payhip already loaded, initializing...');
        (window as any).PayhipPageEmbed();
      } else {
        console.warn('⚠️ Payhip script not ready yet, retrying...');
        setTimeout(injectPayhip, 1000);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = PAYHIP_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      console.log('✅ Payhip script loaded and initialized');
      if ((window as any).PayhipPageEmbed) {
        (window as any).PayhipPageEmbed();
      } else {
        console.warn('⚠️ PayhipPageEmbed not found after load, retrying...');
        setTimeout(() => {
          if ((window as any).PayhipPageEmbed) (window as any).PayhipPageEmbed();
        }, 1500);
      }
    };
    document.body.appendChild(script);
  };

  const handlePurchase = () => {
    setShowPurchase(true);
    setTimeout(() => injectPayhip(), 500);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">Nexus Plus</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Chat
          </Button>
        </div>

        {nexusPlusActive && expiresAt && (
          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <Crown className="h-5 w-5" />
                Nexus Plus Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 dark:text-yellow-300">
                Your premium subscription expires{' '}
                <span className="font-bold">
                  {formatDistanceToNow(expiresAt, { addSuffix: true })}
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-600" />
              Premium Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Video className="h-5 w-5 text-yellow-600" />
                1080p HD Screen Sharing
              </li>
              <li className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-yellow-600" />
                Golden Username Badge
              </li>
              <li className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-yellow-600" />
                Special Call Effects & Filters
              </li>
              <li className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-yellow-600" />
                Exclusive Profile Customization
              </li>
              <li className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                Priority in Live Support Queue
              </li>
              <li className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-yellow-600" />
                Early Access to New Features
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="py-6">
            <div className="text-4xl font-bold text-primary mb-2">$9.99</div>
            <div className="text-muted-foreground">for 3 months</div>
          </CardContent>
        </Card>

        {!showPurchase ? (
          <Card>
            <CardHeader>
              <CardTitle>Activate License</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your license key"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyLicense()}
                  disabled={isVerifying}
                />
                <Button onClick={handleVerifyLicense} disabled={isVerifying}>
                  {isVerifying ? 'Verifying...' : 'Activate'}
                </Button>
              </div>

              <Button className="w-full" size="lg" onClick={handlePurchase}>
                <Crown className="h-5 w-5 mr-2" />
                Purchase Nexus Plus
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <Button variant="ghost" onClick={() => setShowPurchase(false)}>
                ← Back
              </Button>
            </CardHeader>
            <CardContent>
              <div
                className="payhip-embed-page"
                data-key={PAYHIP_KEY}
                style={{ minHeight: '400px' }}
              ></div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NexusPlus;
