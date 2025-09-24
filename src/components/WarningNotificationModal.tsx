import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

interface Warning {
  id: string;
  reason: string;
  duration: string;
  issued_at: string;
  expires_at: string;
  issued_by_name: string;
}

const WarningNotificationModal: React.FC = () => {
  const { currentUser } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      checkForActiveWarnings();
    }
  }, [currentUser]);

  const checkForActiveWarnings = async () => {
    if (!currentUser) return;

    try {
      // Check for unread warnings
      const { data, error } = await supabase.rpc('get_active_warnings', {
        target_user_id: currentUser.uid
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setWarnings(data);
        
        // Check if user has seen these warnings
        const seenWarnings = localStorage.getItem(`seenWarnings_${currentUser.uid}`);
        const seenIds = seenWarnings ? JSON.parse(seenWarnings) : [];
        
        const unseenWarnings = data.filter((warning: Warning) => 
          !seenIds.includes(warning.id)
        );
        
        if (unseenWarnings.length > 0) {
          setShowModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking for warnings:', error);
    }
  };

  const handleAcknowledge = () => {
    if (currentUser) {
      // Mark warnings as seen
      const warningIds = warnings.map(w => w.id);
      localStorage.setItem(`seenWarnings_${currentUser.uid}`, JSON.stringify(warningIds));
    }
    setShowModal(false);
  };

  if (!showModal || warnings.length === 0) return null;

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-amber-600">
            <AlertTriangle className="h-6 w-6 mr-2" />
            Account Warning{warnings.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            You have received {warnings.length} active warning{warnings.length > 1 ? 's' : ''} on your account.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {warnings.map((warning, index) => (
            <div key={warning.id} className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive">Warning #{index + 1}</Badge>
                  <Badge variant="outline" className="text-xs">
                    ID: {warning.id.slice(0, 8)}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  Expires: {format(new Date(warning.expires_at), 'PPp')}
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-sm">Reason:</span>
                  <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{warning.reason}</p>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    Issued by: {warning.issued_by_name}
                  </div>
                  <div>
                    Duration: {warning.duration}
                  </div>
                  <div>
                    Issued: {format(new Date(warning.issued_at), 'PPp')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Important:</strong> If you believe this warning was issued in error, you can dispute it by contacting our moderation team. 
            Please reference the warning ID(s) shown above when making your appeal.
          </p>
        </div>
        
        <DialogFooter>
          <Button onClick={handleAcknowledge} className="w-full">
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WarningNotificationModal;