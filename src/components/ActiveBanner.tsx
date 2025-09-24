import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_active: boolean;
  expires_at?: string;
}

const ActiveBanner: React.FC = () => {
  const [activeBanners, setActiveBanners] = useState<Banner[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);

  useEffect(() => {
    fetchActiveBanners();
    
    // Get dismissed banners from localStorage
    const dismissed = localStorage.getItem('dismissedBanners');
    if (dismissed) {
      setDismissedBanners(JSON.parse(dismissed));
    }
  }, []);

  const fetchActiveBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out expired banners
      const validBanners = (data || []).filter(banner => {
        if (!banner.expires_at) return true;
        return new Date(banner.expires_at) > new Date();
      });
      
      setActiveBanners(validBanners);
    } catch (error) {
      console.error('Error fetching active banners:', error);
    }
  };

  const dismissBanner = (bannerId: string) => {
    const newDismissed = [...dismissedBanners, bannerId];
    setDismissedBanners(newDismissed);
    localStorage.setItem('dismissedBanners', JSON.stringify(newDismissed));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'success': return <CheckCircle className="h-5 w-5" />;
      case 'error': return <XCircle className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getBannerColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-500 text-white';
      case 'success': return 'bg-green-500 text-white';
      case 'error': return 'bg-red-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  // Filter out dismissed banners
  const visibleBanners = activeBanners.filter(banner => 
    !dismissedBanners.includes(banner.id)
  );

  if (visibleBanners.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-1">
      {visibleBanners.map((banner, index) => (
        <div 
          key={banner.id} 
          className={`${getBannerColor(banner.type)} p-3 shadow-lg`}
          style={{ top: `${index * 60}px` }}
        >
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center">
              {getIcon(banner.type)}
              <div className="ml-3">
                <strong>{banner.title}:</strong> {banner.message}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="bg-transparent text-white hover:bg-white/20"
              onClick={() => dismissBanner(banner.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActiveBanner;