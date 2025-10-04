import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Crown, Zap, TrendingUp } from "lucide-react";
import confetti from "canvas-confetti";

interface NexusPlusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEmbedded?: boolean;
}

const NexusPlusModal: React.FC<NexusPlusModalProps> = ({ open, onOpenChange, isEmbedded = false }) => {
  const [licenseKey, setLicenseKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

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
      toast.error("Please enter a license key");
      return;
    }

    setIsVerifying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("You must be logged in");
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
        toast.success("🎉 Nexus Plus activated successfully!");
        setLicenseKey("");
        setTimeout(() => {
          onOpenChange(false);
          window.location.reload();
        }, 2000);
      } else {
        toast.error(data.error || "Invalid license key");
      }
    } catch (error: any) {
      console.error('License verification error:', error);
      toast.error(error.message || "Failed to verify license key");
    } finally {
      setIsVerifying(false);
    }
  };

  const content = (
    <>
      {!isEmbedded && (
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            Nexus Plus
          </DialogTitle>
        </DialogHeader>
      )}

      <div className="space-y-6">
          {/* Features Section */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-600" />
              Premium Features
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span>1080p Screen Sharing</span>
              </li>
              <li className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span>Golden Nametag in Conversations</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-600" />
                <span>Special Badge Next to Your Name</span>
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
                <span>Priority in Live Support Queue</span>
              </li>
            </ul>
          </div>

          {/* Pricing */}
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold text-primary">$9.99</div>
            <div className="text-sm text-muted-foreground">for 3 months</div>
          </div>

          {/* License Key Input */}
          {!showPurchase && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Have a license key?
                </label>
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
                    {isVerifying ? "Verifying..." : "Activate"}
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowPurchase(true)}
                  className="w-full"
                >
                  Purchase Nexus Plus
                </Button>
              </div>
            </div>
          )}

          {/* Payhip Embed */}
          {showPurchase && (
            <div>
              <Button
                variant="ghost"
                onClick={() => setShowPurchase(false)}
                className="mb-4"
              >
                ← Back
              </Button>
              <div 
                className="payhip-embed-page" 
                data-key="ck6Id"
                dangerouslySetInnerHTML={{
                  __html: '<script type="text/javascript" src="https://payhip.com/embed-page.js?v=24u68984"></script>'
                }}
              />
            </div>
          )}
      </div>
    </>
  );
  
  if (isEmbedded) {
    return content;
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default NexusPlusModal;