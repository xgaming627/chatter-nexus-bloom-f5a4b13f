import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';

interface Warning {
  id: string;
  reason: string;
  duration: string;
  issued_at: string;
  expires_at: string;
  issued_by_name: string;
}

const WarnUserNotification: React.FC = () => {
  const { currentUser } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    // Load dismissed warnings from localStorage
    const stored = localStorage.getItem('dismissedWarnings');
    if (stored) {
      setDismissed(JSON.parse(stored));
    }

    const fetchWarnings = async () => {
      try {
        const { data, error } = await supabase.rpc('get_active_warnings', {
          target_user_id: currentUser.uid
        });

        if (error) throw error;
        setWarnings(data || []);
      } catch (error) {
        console.error('Error fetching warnings:', error);
      }
    };

    fetchWarnings();

    // Set up real-time listener for new warnings
    const channel = supabase
      .channel(`warnings:${currentUser.uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_warnings',
          filter: `user_id=eq.${currentUser.uid}`
        },
        () => {
          fetchWarnings(); // Refresh warnings when new one is added
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const handleDismiss = (warningId: string) => {
    const newDismissed = [...dismissed, warningId];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedWarnings', JSON.stringify(newDismissed));
  };

  // Filter out dismissed warnings
  const activeWarnings = warnings.filter(warning => 
    !dismissed.includes(warning.id)
  );

  // Show browser notification for new warnings
  useEffect(() => {
    if (activeWarnings.length > 0 && 'Notification' in window) {
      // Request permission if not already granted
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      // Show notification if permission is granted
      if (Notification.permission === 'granted') {
        const latestWarning = activeWarnings[0];
        new Notification('Account Warning Issued', {
          body: `Reason: ${latestWarning.reason}`,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
    }
  }, [activeWarnings.length]);

  if (activeWarnings.length === 0) return null;

  return (
    <>
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
      
      {/* Warning notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {activeWarnings.map((warning) => (
          <Alert key={warning.id} variant="destructive" className="relative shadow-lg border-2">
            <AlertTriangle className="h-4 w-4" />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={() => handleDismiss(warning.id)}
            >
              <X className="h-3 w-3" />
            </Button>
            <AlertTitle>Warning Issued</AlertTitle>
            <AlertDescription className="space-y-1">
              <p><strong>Reason:</strong> {warning.reason}</p>
              <p><strong>Duration:</strong> {warning.duration}</p>
              <p><strong>Issued by:</strong> {warning.issued_by_name}</p>
              <p><strong>Expires:</strong> {format(new Date(warning.expires_at), 'PPpp')}</p>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </>
  );
};

export default WarnUserNotification;