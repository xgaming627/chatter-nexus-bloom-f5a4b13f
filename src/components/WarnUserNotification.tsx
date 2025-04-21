
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WarnUserNotificationProps {
  reason: string;
  duration: string;
  onAccept: () => void;
}

const WarnUserNotification: React.FC<WarnUserNotificationProps> = ({ 
  reason, 
  duration, 
  onAccept 
}) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setAccepted(true);
    onAccept();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="bg-white dark:bg-gray-900 max-w-md w-full rounded-lg shadow-lg p-6 m-4">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-center mb-4">Account Warning</h3>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Your account has been temporarily restricted due to a violation of our Terms of Service.
            </p>
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          <div>
            <h4 className="text-sm font-medium">Reason:</h4>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium">Restriction Duration:</h4>
            <p className="text-sm text-muted-foreground">{duration}</p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          By clicking "I Understand" below, you acknowledge this warning and agree to comply with our{" "}
          <Link to="/terms" className="text-blue-500 hover:underline">
            Terms of Service
          </Link>{" "}
          moving forward.
        </p>
        
        <Button 
          className="w-full"
          onClick={handleAccept}
        >
          I Understand and Agree
        </Button>
      </div>
    </div>
  );
};

export default WarnUserNotification;
