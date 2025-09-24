import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Phone, PhoneOff } from 'lucide-react';

interface LiveSupportEndDialogProps {
  onEndSession: () => void;
  onCancelEnd: () => void;
  isVisible: boolean;
}

const LiveSupportEndDialog: React.FC<LiveSupportEndDialogProps> = ({
  onEndSession,
  onCancelEnd,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 animate-scale-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
          <CardTitle className="text-xl">End Support Session</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Support agent is requesting to end this session. 
              Are you ready to end the support conversation?
            </p>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                💡 <strong>Note:</strong> You won't be able to send new messages after ending the session.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancelEnd}
            >
              <Phone className="h-4 w-4 mr-2" />
              Continue Session
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onEndSession}
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              End Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveSupportEndDialog;