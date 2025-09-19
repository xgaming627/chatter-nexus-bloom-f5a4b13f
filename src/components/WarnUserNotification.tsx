import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { AlertTriangle, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import TermsOfService from './TermsOfService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  user_id: string;
  type: 'ban' | 'warning' | 'system' | 'mention';
  content: string;
  read: boolean;
  timestamp: string;
  requires_action?: boolean;
}

const WarnUserNotification: React.FC = () => {
  const { currentUser } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [warningInfo, setWarningInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('warning');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  useEffect(() => {
    if (!currentUser) return;
    
    // Check for warnings in profile description (simplified approach)
    const checkWarnings = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('description')
          .eq('user_id', currentUser.uid)
          .single();

        if (error) throw error;
        
        if (profile?.description && profile.description.includes('Warning:')) {
          setWarningInfo({
            reason: profile.description,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            count: 1
          });
          setShowWarning(true);
        }
      } catch (error) {
        console.error("Error checking warnings:", error);
      }
    };
    
    checkWarnings();
  }, [currentUser]);
  
  const handleAccept = async () => {
    if (!currentUser) return;
    
    try {
      // Clear the warning from profile description
      const { error } = await supabase
        .from('profiles')
        .update({
          description: ''
        })
        .eq('user_id', currentUser.uid);

      if (error) throw error;
      
      setShowWarning(false);
      
      toast({
        title: "Warning acknowledged",
        description: "Thank you for accepting the terms of service"
      });
    } catch (error) {
      console.error("Error acknowledging warning:", error);
    }
  };

  if (!showWarning || !currentUser) return null;

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <AlertTriangle className="h-5 w-5 mr-2" /> 
            Account Warning
          </DialogTitle>
          <DialogDescription>
            Your account has been flagged for policy violations.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="warning" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="warning">Warning Details</TabsTrigger>
            <TabsTrigger value="terms">Terms of Service</TabsTrigger>
          </TabsList>
          
          <TabsContent value="warning" className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-start">
                <Shield className="h-10 w-10 text-destructive mr-4 mt-1" />
                <div>
                  <h3 className="text-lg font-medium">Account Warning</h3>
                  <p className="text-muted-foreground">
                    Your account has been issued a warning due to violations of our terms of service.
                  </p>
                </div>
              </div>
              
              {warningInfo && (
                <div className="bg-destructive/10 p-4 rounded-md mt-4">
                  <p className="font-medium">Reason for Warning:</p>
                  <p className="mt-1">{warningInfo.reason}</p>
                  
                  <div className="mt-4 flex items-center">
                    <p className="font-medium">Warning Status:</p>
                    <Badge variant="destructive" className="ml-2">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="mt-2">
                    <p className="font-medium">Warning Count:</p>
                    <p className="mt-1">{warningInfo.count} {warningInfo.count === 1 ? 'warning' : 'warnings'}</p>
                  </div>
                  
                  <div className="mt-2">
                    <p className="font-medium">Expires On:</p>
                    <p className="mt-1">{format(warningInfo.expires, 'PPpp')}</p>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <p className="text-sm">
                  To continue using ChatNexus, you must acknowledge this warning and agree to follow our community guidelines.
                  <span 
                    className="text-blue-600 dark:text-blue-400 cursor-pointer ml-1"
                    onClick={() => setActiveTab('terms')}
                  >
                    View Terms of Service
                  </span>
                </p>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md mt-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 inline-block mr-1" /> 
                  Multiple violations may result in a temporary or permanent ban from ChatNexus.
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="terms">
            <TermsOfService />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowWarning(false)}>
            Dismiss (Remain Paused)
          </Button>
          <Button onClick={handleAccept}>
            Accept & Reactivate Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WarnUserNotification;