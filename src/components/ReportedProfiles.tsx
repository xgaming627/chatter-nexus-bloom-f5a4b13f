import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import UserAvatar from './UserAvatar';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ReportedProfile {
  id: string;
  reported_user_id: string;
  reported_by: string;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  saved_username: string | null;
  saved_display_name: string | null;
  saved_photo_url: string | null;
  saved_description: string | null;
  saved_banner_color: string | null;
  saved_banner_image_url: string | null;
}

const ReportedProfiles: React.FC = () => {
  const [reports, setReports] = useState<ReportedProfile[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    let query = supabase
      .from('reported_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reported profiles:', error);
      return;
    }

    setReports(data || []);
  };

  const handleApprove = async (reportId: string, reportedUserId: string) => {
    const { error } = await supabase
      .from('reported_profiles')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', reportId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to approve report', variant: 'destructive' });
      return;
    }

    // Delete the saved profile information
    await supabase
      .from('reported_profiles')
      .update({
        saved_username: null,
        saved_display_name: null,
        saved_photo_url: null,
        saved_description: null,
        saved_banner_color: null,
        saved_banner_image_url: null
      })
      .eq('id', reportId);

    toast({ title: 'Profile approved', description: 'Report marked as resolved' });
    fetchReports();
  };

  const handleReject = async (reportId: string) => {
    const { error } = await supabase
      .from('reported_profiles')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', reportId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to reject report', variant: 'destructive' });
      return;
    }

    toast({ title: 'Report rejected', description: 'Profile deemed appropriate' });
    fetchReports();
  };

  const bannerStyle = (report: ReportedProfile) => {
    if (report.saved_banner_image_url) {
      return { backgroundImage: `url(${report.saved_banner_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundColor: report.saved_banner_color || '#1a1b26' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Reported Profiles
        </CardTitle>
        <div className="flex gap-2 mt-4">
          <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
            Pending
          </Button>
          <Button variant={filter === 'approved' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('approved')}>
            Approved
          </Button>
          <Button variant={filter === 'rejected' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('rejected')}>
            Rejected
          </Button>
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
            All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reports found</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="p-4">
                  <div className="flex gap-4">
                    {/* Saved Profile Display */}
                    <div className="w-48 border rounded-lg overflow-hidden flex-shrink-0">
                      <div className="h-16 w-full" style={bannerStyle(report)} />
                      <div className="p-3 -mt-6">
                        <UserAvatar
                          username={report.saved_username || 'User'}
                          photoURL={report.saved_photo_url || undefined}
                          size="md"
                        />
                        <h3 className="font-semibold mt-2">{report.saved_display_name || report.saved_username}</h3>
                        <p className="text-xs text-muted-foreground">@{report.saved_username}</p>
                        {report.saved_description && (
                          <p className="text-xs mt-2 text-muted-foreground">{report.saved_description}</p>
                        )}
                      </div>
                    </div>

                    {/* Report Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant={
                            report.status === 'pending' ? 'default' :
                            report.status === 'approved' ? 'secondary' : 'destructive'
                          }>
                            {report.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), 'PPp')}
                        </span>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-semibold mb-1">Reason:</p>
                        <p className="text-sm text-muted-foreground">{report.reason}</p>
                      </div>

                      {report.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(report.id, report.reported_user_id)}>
                            <Check className="h-4 w-4 mr-1" /> Approve (Profile OK)
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleReject(report.id)}>
                            <X className="h-4 w-4 mr-1" /> Reject Report
                          </Button>
                        </div>
                      )}

                      {report.status !== 'pending' && report.reviewed_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Reviewed on {format(new Date(report.reviewed_at), 'PPp')}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ReportedProfiles;