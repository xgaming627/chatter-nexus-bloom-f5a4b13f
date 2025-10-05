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

const PAYHIP_EMBED_SCRIPT = 'https://payhip.com/embed-page.js?v=24u68984';

const NexusPlus: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [nexusPlusActive, setNexusPlusActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [showPurchase, setShowPurchase] = useState(false);

  // ✅ Check user and Nexus Plus subscription
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

  // ✅ Confetti effect
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

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

  // ✅ License verification
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
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        triggerConfetti();
        toast.success('🎉 Nexus Plus activated successfully!');
        setLicenseKey('');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
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

  // ✅ Load Payhip embed page inside modal
  const loadPayhipEmbed = () => {
    const container = document.getElementById('payhip-container');
    if (!container) return;

    container.innerHTML = ''; // remove previous embed if exists

    const div = document.createElement('div');
    div.className = 'payhip-embed-page';
    div.setAttribute('data-key', 'ck6Id');
    container.appendChild(div);

    // Load or reinitialize Payhip embed script
    if ((window as any).PayhipPageEmbed) {
      (window as any).PayhipPageEmbed();
    } else if (!document.querySelector(`script[src="${PAYHIP_EMBED_SCRIPT}"]`)) {
      const script = document.createElement('script');
      script.src = PAYHIP_EMBED_SCRIPT;
      script.async = true;
      script.onload = () => (window as any).PayhipPageEmbed();
      document.body.appendChild(script);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">Nexus Plus</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Chat
          </Button>
        </div>

        {/* Active subscription */}
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
                Your premium subscription expires in{' '}
                <span className="font-bold">
                  {formatDistanceToNow(expiresAt, { addSuffix: true })}
                </span>
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                You can claim another license to extend your subscription!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Premium Features */}
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
                <Video className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <span>1080p HD Screen Sharing</span>
              </li>
              <li className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <span>Golden Username Badge</span>
              </li>
              <li className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <span>Special Call Effects & Filters</span>
              </li>
              <li className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <span>Exclusive Profile Customization</span>
              </li>
              <li className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <span>Priority in Live Support Queue</span>
              </li>
              <li className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <span>Early Access to New Features</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Price */}
        <Card className="text-center">
          <CardContent className="py-6">
            <div className="text-4xl font-bold text-primary mb-2">$9.99</div>
            <div className="text-muted-foreground">for 3 months</div>
          </CardContent>
        </Card>

        {/* License Activation */}
        <Card>
          <CardHeader>
            <CardTitle>Activate License</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Have a license key?</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter your license key"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyLicense()}
                  disabled={isVerifying}
                />
                <Button
                  onClick={handleVerifyLicense}
                  disabled={isVerifying || !licenseKey.trim()}
                >
                  {isVerifying ? 'Verifying...' : 'Activate'}
                </Button>
              </div>
            </div>

            <Button
              variant="default"
              className="w-full"
              size="lg"
              onClick={() => {
                setShowPurchase(true);
                setTimeout(loadPayhipEmbed, 100); // Slight delay for DOM render
              }}
            >
              <Crown className="h-5 w-5 mr-2" />
              Purchase Nexus Plus
            </Button>
          </CardContent>
        </Card>

        {/* ✅ Payhip Modal */}
        {showPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg max-w-md w-full">
              <button
                className="mb-2 text-sm text-gray-700 dark:text-gray-300"
                onClick={() => setShowPurchase(false)}
              >
                ← Close
              </button>
              <div id="payhip-container" style={{ minHeight: 500 }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NexusPlus;
