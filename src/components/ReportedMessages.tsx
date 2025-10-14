import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ReportedMessage {
  id: string;
  message_id: string;
  reported_by: string;
  reason: string;
  status: string;
  created_at: string;
  message?: {
    content: string;
    sender_id: string;
    deleted: boolean;
  };
  reporter?: {
    username: string;
    display_name: string;
  };
}

const ReportedMessages: React.FC = () => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<ReportedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reported_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch messages and reporter profiles manually
      const enrichedData = await Promise.all(
        (data || []).map(async (report) => {
          const { data: message } = await supabase
            .from('messages')
            .select('content, sender_id, deleted')
            .eq('id', report.message_id)
            .maybeSingle();

          const { data: reporter } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('user_id', report.reported_by)
            .maybeSingle();

          return {
            ...report,
            message: message || undefined,
            reporter: reporter || undefined,
          };
        })
      );

      setReports(enrichedData);
    } catch (error) {
      console.error('Error fetching reported messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('reported_messages')
        .update({ 
          status, 
          reviewed_by: currentUser?.uid,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Report updated',
        description: `Report marked as ${status}`,
      });

      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to update report',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMessage = async (messageId: string, reportId: string) => {
    try {
      // Delete the actual message
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) throw deleteError;

      // Update report status
      await handleUpdateStatus(reportId, 'resolved');

      toast({
        title: 'Message deleted',
        description: 'The reported message has been removed',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading reported messages...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Reported Messages</h3>
      {reports.length === 0 ? (
        <p className="text-muted-foreground">No reported messages</p>
      ) : (
        reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Report from {report.reporter?.display_name || report.reporter?.username || 'Unknown'}
                </CardTitle>
                <Badge variant={
                  report.status === 'resolved' ? 'default' :
                  report.status === 'dismissed' ? 'secondary' : 'destructive'
                }>
                  {report.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Message Content:</p>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-1">
                  {report.message?.deleted ? '[Message already deleted]' : (report.message?.content || '[Message not found]')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Reason:</p>
                <p className="text-sm text-muted-foreground">{report.reason}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                Reported on {format(new Date(report.created_at), 'PPp')}
              </div>
              {report.status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  {!report.message?.deleted && report.message && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteMessage(report.message_id, report.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Delete Message
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                  >
                    Dismiss Report
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(report.id, 'resolved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ReportedMessages;