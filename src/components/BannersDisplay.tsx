import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import QuotaWarningBanner from './QuotaWarningBanner';
import { ActiveCallBanner } from './ActiveCallBanner';
import { AdBanner } from './AdBanner';

interface BannersDisplayProps {
  conversationId?: string;
  onJoinCall?: (roomName: string, isVideoCall: boolean) => void;
}

const BannersDisplay: React.FC<BannersDisplayProps> = ({ conversationId, onJoinCall }) => {
  const [activeBanners, setActiveBanners] = useState<any[]>([]);

  useEffect(() => {
    fetchActiveBanners();

    // Subscribe to banner changes
    const channel = supabase
      .channel('banners-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'banners',
      }, () => {
        fetchActiveBanners();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveBanners = async () => {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (!error && data) {
      setActiveBanners(data);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <QuotaWarningBanner />
      {conversationId && onJoinCall && (
        <ActiveCallBanner conversationId={conversationId} onJoinCall={onJoinCall} />
      )}
      <AdBanner />
      {activeBanners.map((banner) => (
        <div key={banner.id} className={`p-3 rounded-md relative ${
          banner.type === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-900 dark:text-red-100' :
          banner.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100' :
          banner.type === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-900 dark:text-green-100' :
          'bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
        }`}>
          <button
            onClick={async () => {
              await supabase.from('banners').update({ is_active: false }).eq('id', banner.id);
              fetchActiveBanners();
            }}
            className="absolute top-2 right-2 hover:opacity-70"
          >
            ✕
          </button>
          <h4 className="font-semibold pr-6">{banner.title}</h4>
          <p className="text-sm">{banner.message}</p>
        </div>
      ))}
    </div>
  );
};

export default BannersDisplay;
