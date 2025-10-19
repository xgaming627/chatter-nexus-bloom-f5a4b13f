import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UserAvatar from './UserAvatar';
import { UserCheck, UserX, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  profile?: any;
  userRoles?: any[];
}

interface FriendsTabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FriendsTab: React.FC<FriendsTabProps> = ({ open, onOpenChange }) => {
  const { currentUser } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);

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

    // Get pending requests (where current user is the friend_id)
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
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', otherId);
          return { ...friend, profile, userRoles: roles, status: friend.status as 'pending' | 'accepted' | 'blocked' };
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
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', request.user_id);
          return { ...request, profile, userRoles: roles, status: request.status as 'pending' | 'accepted' | 'blocked' };
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
          return { ...blocked, profile, status: blocked.status as 'pending' | 'accepted' | 'blocked' };
        })
      );
      setBlockedUsers(blockedWithProfiles as any);
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendId);
    toast({ title: 'Friend request accepted' });
    fetchFriends();
  };

  const handleRejectRequest = async (friendId: string) => {
    await supabase.from('friends').delete().eq('id', friendId);
    toast({ title: 'Friend request rejected' });
    fetchFriends();
  };

  const handleRemoveFriend = async (friendId: string) => {
    await supabase.from('friends').delete().eq('id', friendId);
    toast({ title: 'Friend removed' });
    fetchFriends();
  };

  const handleUnblock = async (friendId: string) => {
    await supabase.from('friends').delete().eq('id', friendId);
    toast({ title: 'User unblocked' });
    fetchFriends();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" aria-describedby="friends-description">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
          <p id="friends-description" className="sr-only">Manage your friends, pending requests, and blocked users</p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All Friends {friends.length > 0 && <Badge className="ml-2">{friends.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending {pendingRequests.length > 0 && <Badge className="ml-2">{pendingRequests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Blocked {blockedUsers.length > 0 && <Badge className="ml-2">{blockedUsers.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-2">
          {friends.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No friends yet</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    username={friend.profile?.username}
                    photoURL={friend.profile?.photo_url}
                    isNexusPlus={friend.profile?.nexus_plus_active}
                    userRole={
                      friend.userRoles?.some(r => r.role === 'admin') ? 'admin' :
                      friend.userRoles?.some(r => r.role === 'moderator') ? 'moderator' : 'user'
                    }
                  />
                  <div>
                    <p className="font-medium">{friend.profile?.display_name || friend.profile?.username}</p>
                    <p className="text-sm text-muted-foreground">@{friend.profile?.username}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFriend(friend.id)}
                >
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-2">
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending requests</p>
          ) : (
            pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    username={request.profile?.username}
                    photoURL={request.profile?.photo_url}
                    isNexusPlus={request.profile?.nexus_plus_active}
                    userRole={
                      request.userRoles?.some(r => r.role === 'admin') ? 'admin' :
                      request.userRoles?.some(r => r.role === 'moderator') ? 'moderator' : 'user'
                    }
                  />
                  <div>
                    <p className="font-medium">{request.profile?.display_name || request.profile?.username}</p>
                    <p className="text-sm text-muted-foreground">@{request.profile?.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAcceptRequest(request.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRejectRequest(request.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="blocked" className="space-y-2">
          {blockedUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No blocked users</p>
          ) : (
            blockedUsers.map((blocked) => (
              <div key={blocked.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    username={blocked.profile?.username}
                    photoURL={blocked.profile?.photo_url}
                  />
                  <div>
                    <p className="font-medium">{blocked.profile?.display_name || blocked.profile?.username}</p>
                    <p className="text-sm text-muted-foreground">@{blocked.profile?.username}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(blocked.id)}
                >
                  <UserCheck className="h-4 w-4 mr-2" /> Unblock
                </Button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsTab;