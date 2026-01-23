import React, { useState, useEffect } from 'react';
import { Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SHUTDOWN_DATE = new Date('2026-02-01T00:00:00');
const DISMISSED_KEY = 'nexus_shutdown_notice_dismissed';

const ShutdownNoticeOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPermanent, setIsPermanent] = useState(false);

  useEffect(() => {
    const now = new Date();
    const isAfterShutdown = now >= SHUTDOWN_DATE;
    
    if (isAfterShutdown) {
      // After shutdown date - always show permanent overlay
      setIsPermanent(true);
      setIsVisible(true);
    } else {
      // Before shutdown - show once if not dismissed
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    if (!isPermanent) {
      localStorage.setItem(DISMISSED_KEY, 'true');
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header gradient */}
        <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
        
        <div className="p-8 text-center space-y-6">
          {isPermanent ? (
            // Permanent shutdown message
            <>
              <div className="flex justify-center">
                <Heart className="h-16 w-16 text-pink-500 animate-pulse" />
              </div>
              
              <h1 className="text-3xl font-bold text-foreground">
                Thank You for Everything
              </h1>
              
              <div className="space-y-4 text-muted-foreground">
                <p className="text-lg">
                  Nexus Chat has officially closed its doors.
                </p>
                
                <p>
                  To everyone who was part of this journey — the late-night conversations, 
                  the friendships formed, the memories made — thank you from the bottom of our hearts.
                </p>
                
                <p>
                  You made Nexus Chat more than just a platform. You made it a home.
                </p>
                
                <p className="text-sm italic">
                  "Every ending is a new beginning. Until we meet again."
                </p>
              </div>
              
              <div className="pt-4">
                <p className="text-sm text-muted-foreground/60">
                  With love, The Nexus Team 💜
                </p>
              </div>
            </>
          ) : (
            // Pre-shutdown notice
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-3xl">📢</span>
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-foreground">
                Thank You for Using Nexus Chat
              </h1>
              
              <div className="space-y-4 text-muted-foreground">
                <p>
                  This website has been sold and will no longer be in service.
                </p>
                
                <p className="text-lg font-semibold text-amber-400">
                  Starting February 1, 2026, this website will be shut down.
                </p>
                
                <p className="text-sm">
                  We appreciate every moment you've spent with us. Please save any important 
                  conversations or connections before the shutdown date.
                </p>
              </div>
              
              <Button 
                onClick={handleDismiss}
                className="w-full mt-4"
                size="lg"
              >
                <X className="h-4 w-4 mr-2" />
                I Understand
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShutdownNoticeOverlay;
