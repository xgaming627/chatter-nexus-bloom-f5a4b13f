import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface Banner {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const BannerManagement: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [expiresIn, setExpiresIn] = useState('never');

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading banners:', error);
      return;
    }

    setBanners(data || []);
  };

  const createBanner = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    let expiresAt = null;
    if (expiresIn !== 'never') {
      const now = new Date();
      const hours = parseInt(expiresIn);
      expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
    }

    const { error } = await supabase
      .from('banners')
      .insert({
        title: title.trim(),
        message: message.trim(),
        type,
        is_active: true,
        expires_at: expiresAt
      });

    if (error) {
      console.error('Error creating banner:', error);
      toast.error('Failed to create banner');
      return;
    }

    toast.success('Banner created successfully');
    setTitle('');
    setMessage('');
    setType('info');
    setExpiresIn('never');
    loadBanners();
  };

  const deleteBanner = async (id: string) => {
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting banner:', error);
      toast.error('Failed to delete banner');
      return;
    }

    toast.success('Banner deleted successfully');
    loadBanners();
  };

  const toggleBanner = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('banners')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      console.error('Error updating banner:', error);
      toast.error('Failed to update banner');
      return;
    }

    toast.success(`Banner ${!isActive ? 'activated' : 'deactivated'}`);
    loadBanners();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Banner title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Banner message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expires In</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger id="expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="168">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={createBanner} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Banner
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Banners</CardTitle>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No banners created yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell className="font-medium">{banner.title}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        banner.type === 'info' ? 'bg-blue-100 text-blue-800' :
                        banner.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        banner.type === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {banner.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={banner.is_active ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleBanner(banner.id, banner.is_active)}
                      >
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {banner.expires_at ? format(new Date(banner.expires_at), 'PPp') : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBanner(banner.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BannerManagement;
