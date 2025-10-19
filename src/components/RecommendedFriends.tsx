import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import UserAvatar from './UserAvatar';
import { UserPlus, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RecommendedUser {
  user_id: string;
  username: string;
  display_name: string;
  photo_url: string;
  message_count: number;
  mutual_friends: number;
}

export const RecommendedFriends = () => {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchRecommendations();
    }
  }, [currentUser]);

  const fetchRecommendations = async () => {
    if (!currentUser) return;

    setLoading(true);

    try {
      // Get conversations where user participated
      const { data: conversations } = await supabase
        .from('conversations')
        .select('participants')
        .contains('participants', [currentUser.uid]);

      if (!conversations) {
        setLoading(false);
        return;
      }

      // Extract unique user IDs from conversations (excluding current user)
      const userIds = new Set<string>();
      conversations.forEach(conv => {
        conv.participants.forEach((userId: string) => {
          if (userId !== currentUser.uid) {
            userIds.add(userId);
          }
        });
      });

      // Get profiles for these users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, photo_url')
        .in('user_id', Array.from(userIds));

      if (profiles) {
        // Check if already friends and add message count placeholder
        const recommendations = [];
        for (const profile of profiles.slice(0, 5)) {
          const { data: friendCheck } = await supabase
            .from('friends')
            .select('id')
            .or(`user_id.eq.${currentUser.uid},friend_id.eq.${currentUser.uid}`)
            .or(`user_id.eq.${profile.user_id},friend_id.eq.${profile.user_id}`)
            .maybeSingle();

          if (!friendCheck) {
            recommendations.push({
              ...profile,
              message_count: 15, // Placeholder
              mutual_friends: 0 // Placeholder
            });
          }
        }
        setRecommendations(recommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }

    setLoading(false);
  };

  const handleSendRequest = async (userId: string) => {
    if (!currentUser) return;

    try {
      await supabase
        .from('friends')
        .insert({
          user_id: currentUser.uid,
          friend_id: userId,
          status: 'pending'
        });

      toast({
        title: 'Friend Request Sent',
        description: 'Your friend request has been sent!'
      });

      setRecommendations(recommendations.filter(r => r.user_id !== userId));
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send friend request',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return null;
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Recommended Friends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {recommendations.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    username={user.username}
                    photoURL={user.photo_url}
                  />
                  <div>
                    <p className="font-medium text-sm">{user.display_name || user.username}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                    {user.mutual_friends > 0 && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {user.mutual_friends} mutual {user.mutual_friends === 1 ? 'friend' : 'friends'}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSendRequest(user.user_id)}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
