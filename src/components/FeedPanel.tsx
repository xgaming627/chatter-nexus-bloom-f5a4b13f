import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Image as ImageIcon, Film, Send, Clock } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import UserAvatar from "./UserAvatar";

interface FeedPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedPanel: React.FC<FeedPanelProps> = ({ open, onOpenChange }) => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState({ content: "", mediaUrl: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchPosts();
    }
  }, [open]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profiles!feed_posts_user_id_fkey (display_name, username, photo_url)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50);
    
    setPosts(data || []);
    setLoading(false);
  };

  const handleCreatePost = async () => {
    if (!currentUser || (!newPost.content && !newPost.mediaUrl)) {
      toast({
        title: "Missing Content",
        description: "Please add some text or media to your post.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('feed_posts')
        .insert({
          user_id: currentUser.uid,
          content: newPost.content,
          media_url: newPost.mediaUrl,
          media_type: newPost.mediaUrl ? (newPost.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'video') : 'text',
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Post Submitted!",
        description: "Your post is pending moderator approval."
      });

      setNewPost({ content: "", mediaUrl: "" });
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post.",
        variant: "destructive"
      });
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('feed_interactions')
        .insert({
          post_id: postId,
          user_id: currentUser.uid,
          interaction_type: 'like'
        });

      if (error) {
        // If already liked, unlike
        await supabase
          .from('feed_interactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.uid)
          .eq('interaction_type', 'like');
      }

      fetchPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleMediaSelect = async (url: string) => {
    setNewPost({ ...newPost, mediaUrl: url });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]" aria-describedby="feed-description">
        <DialogHeader>
          <DialogTitle>Feed</DialogTitle>
          <p id="feed-description" className="sr-only">Share and view posts from the community</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create Post */}
          <div className="border rounded-lg p-4">
            <Textarea
              placeholder="What's on your mind?"
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              rows={3}
              className="mb-2"
            />
            
            {newPost.mediaUrl && (
              <div className="relative mb-2">
                <img src={newPost.mediaUrl} alt="Upload preview" className="max-h-48 rounded" />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => setNewPost({ ...newPost, mediaUrl: "" })}
                >
                  Remove
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <ImageUpload onImageSelect={handleMediaSelect} />
              <Button onClick={handleCreatePost}>
                <Send className="h-4 w-4 mr-2" />
                Post
              </Button>
              <Badge variant="secondary" className="ml-auto">
                <Clock className="h-3 w-3 mr-1" />
                Pending Approval
              </Badge>
            </div>
          </div>

          {/* Posts Feed */}
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="text-center py-8">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No posts yet. Be the first to post!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <UserAvatar
                        username={post.profiles?.username || 'User'}
                        photoURL={post.profiles?.photo_url}
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{post.profiles?.display_name || post.profiles?.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {post.content && <p className="mb-3">{post.content}</p>}

                    {post.media_url && post.media_type === 'image' && (
                      <img src={post.media_url} alt="Post" className="rounded-lg max-h-96 w-full object-cover mb-3" />
                    )}

                    {post.media_url && post.media_type === 'video' && (
                      <video src={post.media_url} controls className="rounded-lg max-h-96 w-full mb-3" />
                    )}

                    <div className="flex items-center gap-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        Like
                      </Button>
                      <Button size="sm" variant="ghost">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Comment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};