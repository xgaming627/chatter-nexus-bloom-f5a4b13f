import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserAvatar from './UserAvatar';
import { UserCheck, UserX, Check, X, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  profile?: any;
  userRoles?: any[];
}

export const FriendsList: React.FC = () => {
  const { currentUser } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);
  const [searchUsername, setSearchUsername] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchFriends();
    }
  }, [currentUser]);

  const fetchFriends = async () => {
    if (!currentUser) return;

    // Get accepted friends
    const { data: acceptedData } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id.eq.${currentUser.uid},friend_id.eq.${currentUser.uid}`)
      .eq('status', 'accepted');

    // Get pending requests
    const { data: pendingData } = await supabase
      .from('friends')
      .select('*')
      .eq('friend_id', currentUser.uid)
      .eq('status', 'pending');

    // Get blocked users
    const { data: blockedData } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', currentUser.uid)
      .eq('status', 'blocked');

    // Fetch profiles for all
    if (acceptedData) {
      const friendsWithProfiles = await Promise.all(
        acceptedData.map(async (friend) => {
          const otherId = friend.user_id === currentUser.uid ? friend.friend_id : friend.user_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', otherId)
            .single();
          return { ...friend, profile };
        })
      );
      setFriends(friendsWithProfiles as any);
    }

    if (pendingData) {
      const pendingWithProfiles = await Promise.all(
        pendingData.map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', request.user_id)
            .single();
          return { ...request, profile };
        })
      );
      setPendingRequests(pendingWithProfiles as any);
    }

    if (blockedData) {
      const blockedWithProfiles = await Promise.all(
        blockedData.map(async (blocked) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', blocked.friend_id)
            .single();
          return { ...blocked, profile };
        })
      );
      setBlockedUsers(blockedWithProfiles as any);
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendId);

    if (!error) {
      toast({ title: "Friend request accepted" });
      fetchFriends();
    }
  };

  const handleDeclineRequest = async (friendId: string) => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendId);

    if (!error) {
      toast({ title: "Friend request declined" });
      fetchFriends();
    }
  };

  const handleAddFriend = async () => {
    if (!searchUsername.trim()) {
      toast({ title: "Please enter a username", variant: "destructive" });
      return;
    }

    // Search for user by username
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', searchUsername.trim())
      .single();

    if (!profile) {
      toast({ title: "User not found", variant: "destructive" });
      return;
    }

    // Send friend request
    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: currentUser!.uid,
        friend_id: profile.user_id,
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: "Friend request already sent", variant: "destructive" });
      } else {
        toast({ title: "Failed to send friend request", variant: "destructive" });
      }
    } else {
      toast({ title: "Friend request sent!" });
      setSearchUsername('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg mb-2">Friends</h2>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="online">Online</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="add">Add Friend</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[calc(100vh-240px)]">
              {friends.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No friends yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => {
                    const profile = friend.profile;
                    return (
                      <div key={friend.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                        <UserAvatar
                          username={profile?.username || profile?.display_name}
                          photoURL={profile?.photo_url}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{profile?.display_name || profile?.username}</p>
                          <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="online" className="m-0">
            <ScrollArea className="h-[calc(100vh-240px)]">
              {friends.filter(f => f.profile?.online_status === 'online').length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No friends online</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.filter(f => f.profile?.online_status === 'online').map((friend) => {
                    const profile = friend.profile;
                    return (
                      <div key={friend.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                        <UserAvatar
                          username={profile?.username || profile?.display_name}
                          photoURL={profile?.photo_url}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{profile?.display_name || profile?.username}</p>
                          <p className="text-sm text-green-500">● Online</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pending" className="m-0">
            <ScrollArea className="h-[calc(100vh-240px)]">
              {pendingRequests.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No pending requests</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.map((request) => {
                    const profile = request.profile;
                    return (
                      <div key={request.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <UserAvatar
                          username={profile?.username || profile?.display_name}
                          photoURL={profile?.photo_url}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{profile?.display_name || profile?.username}</p>
                          <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="default"
                            onClick={() => handleAcceptRequest(request.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDeclineRequest(request.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="add" className="m-0">
            <div className="p-4 bg-primary/5 rounded-lg">
              <h3 className="font-semibold mb-2">Add Friend</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You can add friends by their username
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter username"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                />
                <Button onClick={handleAddFriend}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
