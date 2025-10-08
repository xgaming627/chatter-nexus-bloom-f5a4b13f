import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertTriangle, Ban, User, Search, Trash2 } from 'lucide-react';

interface ModerationLog {
  id: string;
  log_type: string;
  moderator_id: string;
  target_user_id: string | null;
  details: any;
  created_at: string;
}

const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('moderation_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('moderation_logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'moderation_logs'
      }, (payload) => {
        setLogs(prev => [payload.new as ModerationLog, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getLogIcon = (logType: string) => {
    switch (logType) {
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'ban':
        return <Ban className="h-4 w-4 text-red-500" />;
      case 'username_change':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'message_search':
        return <Search className="h-4 w-4 text-purple-500" />;
      case 'account_delete':
        return <Trash2 className="h-4 w-4 text-red-700" />;
      default:
        return null;
    }
  };

  const getLogBadgeColor = (logType: string) => {
    switch (logType) {
      case 'warn':
        return 'bg-yellow-100 text-yellow-800';
      case 'ban':
        return 'bg-red-100 text-red-800';
      case 'username_change':
        return 'bg-blue-100 text-blue-800';
      case 'message_search':
        return 'bg-purple-100 text-purple-800';
      case 'account_delete':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading logs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderation Activity Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No logs found</p>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getLogIcon(log.log_type)}
                      <Badge className={getLogBadgeColor(log.log_type)}>
                        {log.log_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'PPpp')}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Moderator:</span>{' '}
                      <span className="text-muted-foreground">{log.moderator_id}</span>
                    </p>
                    {log.target_user_id && (
                      <p>
                        <span className="font-medium">Target User:</span>{' '}
                        <span className="text-muted-foreground">{log.target_user_id}</span>
                      </p>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AdminLogs;
