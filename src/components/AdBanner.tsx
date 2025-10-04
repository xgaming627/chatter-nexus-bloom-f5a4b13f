import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const AdBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'side' | 'bottom'>('side');

  useEffect(() => {
    // Show ad after 5 minutes initially
    const initialTimer = setTimeout(() => {
      setIsVisible(true);
      setPosition(Math.random() > 0.5 ? 'side' : 'bottom');
    }, 5 * 60 * 1000);

    return () => clearTimeout(initialTimer);
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Auto-hide after 2 minutes
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 2 * 60 * 1000);

      return () => clearTimeout(hideTimer);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      // Show again after 5 minutes
      const showTimer = setTimeout(() => {
        setIsVisible(true);
        setPosition(Math.random() > 0.5 ? 'side' : 'bottom');
      }, 5 * 60 * 1000);

      return () => clearTimeout(showTimer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const sideStyles = "fixed right-4 top-24 w-[300px] h-[600px] z-40";
  const bottomStyles = "fixed bottom-4 left-1/2 -translate-x-1/2 w-[728px] h-[90px] z-40";

  return (
    <div className={`${position === 'side' ? sideStyles : bottomStyles} animate-fadeIn`}>
      <div className="relative w-full h-full bg-muted border border-border rounded-lg shadow-lg overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 h-6 w-6"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        
        {/* Ad content placeholder */}
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="text-center p-4">
            <p className="text-sm text-muted-foreground">Advertisement Space</p>
            <p className="text-xs text-muted-foreground mt-2">
              {position === 'side' ? '300x600' : '728x90'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};