import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
  };
}

export const FeedModeration = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  const fetchPendingPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*, profiles(username, display_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load pending posts.",
        variant: "destructive"
      });
    } else {
      setPosts((data as any) || []);
    }
    setLoading(false);
  };

  const handleApprove = async (postId: string) => {
    const { error } = await supabase
      .from('feed_posts')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', postId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve post.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Post Approved",
        description: "The post has been approved and is now visible to users."
      });
      setPosts(posts.filter(p => p.id !== postId));
    }
  };

  const handleReject = async (postId: string) => {
    const { error } = await supabase
      .from('feed_posts')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', postId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject post.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Post Rejected",
        description: "The post has been rejected."
      });
      setPosts(posts.filter(p => p.id !== postId));
    }
  };

  const getMediaIcon = (type: string | null) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending posts...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feed Post Moderation</CardTitle>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending posts to review
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">
                          {post.profiles?.display_name || post.profiles?.username || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(post.created_at), 'PPp')}
                        </p>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getMediaIcon(post.media_type)}
                        {post.media_type || 'text'}
                      </Badge>
                    </div>

                    {post.content && (
                      <p className="mb-3 text-sm">{post.content}</p>
                    )}

                    {post.media_url && (
                      <div className="mb-3">
                        {post.media_type === 'image' && (
                          <img 
                            src={post.media_url} 
                            alt="Post media" 
                            className="max-h-64 rounded-lg object-cover"
                          />
                        )}
                        {post.media_type === 'video' && (
                          <video 
                            src={post.media_url} 
                            controls 
                            className="max-h-64 rounded-lg"
                          />
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(post.id)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(post.id)}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
