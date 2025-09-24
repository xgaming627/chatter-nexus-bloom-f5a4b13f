import React, { useState, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReportedMessage {
  id: string;
  message_id: string;
  reported_by: string;
  reason: string;
  status: string;
  created_at: string;
  messages: {
    id: string;
    content: string;
    timestamp: string;
    sender_id: string;
    profiles: {
      username: string;
      display_name: string;
    };
  };
}

const ReportedMessages: React.FC = () => {
  const { getReportedMessages, markReportAsReviewed } = useChat();
  const [reports, setReports] = useState<ReportedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await getReportedMessages();
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error loading reports",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReviewed = async (reportId: string) => {
    try {
      await markReportAsReviewed(reportId);
      await loadReports(); // Refresh the list
    } catch (error) {
      console.error('Error marking as reviewed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reported Messages</h2>
        <Badge variant="secondary">
          {reports.filter(r => r.status === 'pending').length} Pending
        </Badge>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Reports</h3>
              <p className="text-muted-foreground">
                There are currently no reported messages to review.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Message Report
                  </CardTitle>
                  <Badge 
                    variant={report.status === 'pending' ? 'destructive' : 'secondary'}
                  >
                    {report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Reported Message:</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{report.messages.content}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>
                        By: {report.messages.profiles?.display_name || report.messages.profiles?.username || 'Unknown User'}
                      </span>
                      <span>
                        {format(new Date(report.messages.timestamp), 'PPp')}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Report Details:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">
                        <strong>Reason:</strong> {report.reason}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reported on {format(new Date(report.created_at), 'PPp')}
                    </p>
                  </div>
                </div>

                {report.status === 'pending' && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleMarkAsReviewed(report.id)}
                    >
                      Mark as Reviewed
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportedMessages;