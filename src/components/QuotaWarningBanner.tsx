
import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuotaWarningBannerProps {
  permanent?: boolean;
}

const QuotaWarningBanner: React.FC<QuotaWarningBannerProps> = ({ permanent = false }) => {
  const [isVisible, setIsVisible] = useState(false); // Default to not visible
  const bannerKey = 'quotaWarningDismissed';
  const warningThreshold = 170000; // Show warning when approaching 180k limit
  
  useEffect(() => {
    // Check if there's a real resource issue before showing the banner
    const checkResourceStatus = async () => {
      try {
        // This would ideally be an API call to check actual resource usage
        // For now we'll simulate with localStorage to avoid showing on every reload
        const lastCheck = localStorage.getItem('lastResourceCheck');
        const currentUsage = localStorage.getItem('currentResourceUsage');
        
        // Only check once per day or if no previous check
        if (!lastCheck || Date.now() - parseInt(lastCheck) > 86400000) {
          // In a real app, this would be an API call to check actual usage
          // For demo purposes, randomly show warning ~10% of the time if no previous dismissal
          const shouldShowWarning = !localStorage.getItem(bannerKey) && 
            (currentUsage ? parseInt(currentUsage) > warningThreshold : Math.random() < 0.1);
          
          if (shouldShowWarning || permanent) {
            setIsVisible(true);
          }
          
          localStorage.setItem('lastResourceCheck', Date.now().toString());
          // In a real app, you would store the actual usage here
          localStorage.setItem('currentResourceUsage', (Math.random() * 180000).toString());
        } else if (permanent) {
          setIsVisible(true);
        } else if (currentUsage && parseInt(currentUsage) > warningThreshold) {
          // Only show if usage is high and hasn't been dismissed recently
          const dismissed = localStorage.getItem(bannerKey);
          if (!dismissed || Date.now() - parseInt(dismissed) > 86400000) { // 24 hours
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error("Error checking resource status:", error);
        // If we can't check, don't show the banner
      }
    };
    
    checkResourceStatus();
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
