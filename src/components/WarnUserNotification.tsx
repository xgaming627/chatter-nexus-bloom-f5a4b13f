
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, getDocs, query, where, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  userId: string;
  type: 'ban' | 'warning' | 'system' | 'mention';
  content: string;
  read: boolean;
  timestamp: any;
  requiresAction?: boolean;
}

const WarnUserNotification: React.FC = () => {
  const { currentUser } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [warningInfo, setWarningInfo] = useState<any>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<string>('warning');
  
  useEffect(() => {
    if (!currentUser) return;
    
    // Check for warnings
    const checkWarnings = async () => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().warnings && userDoc.data().warnings > 0) {
          // Check if warning is still active
          const warningExpiry = userDoc.data().warningExpiry?.toDate();
          if (warningExpiry && warningExpiry > new Date()) {
            setWarningInfo({
              reason: userDoc.data().lastWarningReason || "Terms of Service violation",
              expires: warningExpiry,
              count: userDoc.data().warnings
            });
            setShowWarning(true);
          }
        }
      } catch (error) {
        console.error("Error checking warnings:", error);
      }
    };
    
    checkWarnings();
    
    // Listen for notifications
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", currentUser.uid),
      where("requiresAction", "==", true)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationData: Notification[] = [];
      snapshot.forEach((doc) => {
        notificationData.push({
          id: doc.id,
          ...doc.data()
        } as Notification);
      });
      
      if (notificationData.length > 0) {
        setNotifications(notificationData);
        // If we have warning notifications, show the warning dialog
        if (notificationData.some(n => n.type === 'warning')) {
          setShowWarning(true);
        }
      }
    });
    
    return () => unsubscribe();
  }, [currentUser]);
  
  const handleAccept = async () => {
    if (!currentUser) return;
    
    try {
      // Mark warning notifications as read
      const warningNotifications = notifications.filter(n => n.type === 'warning');
      
      for (const notification of warningNotifications) {
        await updateDoc(doc(db, "notifications", notification.id), {
          read: true,
          requiresAction: false
        });
      }
      
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
            <div className="h-[300px] overflow-y-auto p-4 border rounded-md">
              <TermsOfService />
            </div>
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
