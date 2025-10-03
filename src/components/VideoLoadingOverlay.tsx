import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface VideoLoadingOverlayProps {
  isLoading: boolean;
}

const VideoLoadingOverlay: React.FC<VideoLoadingOverlayProps> = ({ isLoading }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isLoading) {
      // Only show loading overlay if video hasn't loaded for more than 2 seconds
      timeout = setTimeout(() => {
        setShow(true);
      }, 2000);
    } else {
      setShow(false);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fadeIn">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">Loading video...</p>
      <p className="text-xs text-muted-foreground mt-1">Poor connection detected</p>
    </div>
  );
};

export default VideoLoadingOverlay;
