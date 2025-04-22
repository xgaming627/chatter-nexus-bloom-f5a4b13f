
import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuotaWarningBannerProps {
  permanent?: boolean;
}

const QuotaWarningBanner: React.FC<QuotaWarningBannerProps> = ({ permanent = false }) => {
  const [isVisible, setIsVisible] = useState(true);
  const bannerKey = 'quotaWarningDismissed';
  
  useEffect(() => {
    if (!permanent) {
      const dismissed = localStorage.getItem(bannerKey);
      if (dismissed && Date.now() - parseInt(dismissed) < 86400000) { // 24 hours
        setIsVisible(false);
      }
    }
  }, [permanent]);
  
  const handleDismiss = () => {
    if (!permanent) {
      localStorage.setItem(bannerKey, Date.now().toString());
    }
    setIsVisible(false);
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white p-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <div>
            <strong>Resource Warning:</strong> Our app is experiencing high usage. 
            Some features like messaging and account creation may be limited. 
            We're working to address this issue.
          </div>
        </div>
        {!permanent && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="bg-transparent text-white hover:bg-amber-600"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuotaWarningBanner;
