import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

const BannerManager: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newBanner, setNewBanner] = useState({
    title: '',
    message: '',
    type: 'info' as const,
    is_active: true,
    expires_at: ''
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data as unknown as Banner[] || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast({
        title: "Error",
        description: "Failed to fetch banners",
        variant: "destructive"
      });
    }
  };

  const createBanner = async () => {
    try {
      const bannerData = {
        ...newBanner,
        expires_at: newBanner.expires_at || null
      };

      const { error } = await supabase
        .from('banners' as any)
        .insert([bannerData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Banner created successfully"
      });

      setNewBanner({
        title: '',
        message: '',
        type: 'info',
        is_active: true,
        expires_at: ''
      });
      setIsCreating(false);
      fetchBanners();
    } catch (error) {
      console.error('Error creating banner:', error);
      toast({
        title: "Error",
        description: "Failed to create banner",
        variant: "destructive"
      });
    }
  };

  const toggleBanner = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('banners' as any)
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Banner ${!isActive ? 'activated' : 'deactivated'}`
      });

      fetchBanners();
    } catch (error) {
      console.error('Error updating banner:', error);
      toast({
        title: "Error",
        description: "Failed to update banner",
        variant: "destructive"
      });
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      const { error } = await supabase
        .from('banners' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Banner deleted successfully"
      });

      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast({
        title: "Error",
        description: "Failed to delete banner",
        variant: "destructive"
      });
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'warning': return 'destructive';
      case 'success': return 'default';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Banner Management</h2>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Create Banner
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="banner-title">Title</Label>
              <Input
                id="banner-title"
                placeholder="Banner title..."
                value={newBanner.title}
                onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="banner-message">Message</Label>
              <Textarea
                id="banner-message"
                placeholder="Banner message..."
                value={newBanner.message}
                onChange={(e) => setNewBanner({ ...newBanner, message: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="banner-type">Type</Label>
              <Select value={newBanner.type} onValueChange={(value: any) => setNewBanner({ ...newBanner, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="banner-expires">Expires At (Optional)</Label>
              <Input
                id="banner-expires"
                type="datetime-local"
                value={newBanner.expires_at}
                onChange={(e) => setNewBanner({ ...newBanner, expires_at: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="banner-active"
                checked={newBanner.is_active}
                onCheckedChange={(checked) => setNewBanner({ ...newBanner, is_active: checked })}
              />
              <Label htmlFor="banner-active">Active immediately</Label>
            </div>

            <div className="flex space-x-2">
              <Button onClick={createBanner} disabled={!newBanner.title.trim() || !newBanner.message.trim()}>
                Create Banner
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {banners.map((banner) => (
          <Card key={banner.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold">{banner.title}</h3>
                    <Badge variant={getBadgeVariant(banner.type)}>
                      {banner.type}
                    </Badge>
                    {banner.is_active ? (
                      <Badge variant="default">
                        <Eye className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{banner.message}</p>
                  <div className="text-xs text-muted-foreground">
                    Created: {format(new Date(banner.created_at), 'PPpp')}
                    {banner.expires_at && (
                      <span className="ml-4">
                        Expires: {format(new Date(banner.expires_at), 'PPpp')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleBanner(banner.id, banner.is_active)}
                  >
                    {banner.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteBanner(banner.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {banners.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No banners created yet. Create your first banner to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BannerManager;