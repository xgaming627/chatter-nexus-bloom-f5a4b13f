import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from '@/hooks/use-toast';
import { Award, Plus, Sparkles, Users } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface UserProfile {
  user_id: string;
  username: string;
  display_name: string;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const BadgeManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string>('');
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [showAwardBadgeDialog, setShowAwardBadgeDialog] = useState(false);
  const [showAddPointsDialog, setShowAddPointsDialog] = useState(false);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    const { data, error } = await supabase
      .from('badge_definitions')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching badges:', error);
      return;
    }

    setBadges(data || []);
  };

  const handleSearchUser = async () => {
    if (!searchUser.trim()) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, username, display_name')
      .or(`username.ilike.%${searchUser}%,display_name.ilike.%${searchUser}%`)
      .limit(10);

    if (error) {
      console.error('Error searching users:', error);
      return;
    }

    setSearchResults(data || []);
  };

  const handleAwardBadge = async () => {
    if (!selectedUser || !selectedBadge) {
      toast({
        title: 'Missing Information',
        description: 'Please select both a user and a badge',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('user_badges')
      .insert({
        user_id: selectedUser.user_id,
        badge_id: selectedBadge,
        awarded_by: currentUser?.uid,
      });

    if (error) {
      console.error('Error awarding badge:', error);
      toast({
        title: 'Error',
        description: 'Failed to award badge',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Badge Awarded',
      description: `Successfully awarded badge to ${selectedUser.display_name || selectedUser.username}`,
    });

    setShowAwardBadgeDialog(false);
    setSelectedUser(null);
    setSelectedBadge('');
    setSearchUser('');
    setSearchResults([]);
  };

  const handleAddPoints = async () => {
    if (!selectedUser || !pointsToAdd || parseInt(pointsToAdd) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid amount of points',
        variant: 'destructive',
      });
      return;
    }

    // First check if user has a points record
    const { data: existingPoints } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', selectedUser.user_id)
      .single();

    if (existingPoints) {
      // Update existing points
      const { error } = await supabase
        .from('user_points')
        .update({ points: existingPoints.points + parseInt(pointsToAdd) })
        .eq('user_id', selectedUser.user_id);

      if (error) {
        console.error('Error adding points:', error);
        toast({
          title: 'Error',
          description: 'Failed to add points',
          variant: 'destructive',
        });
        return;
      }
    } else {
      // Create new points record
      const { error } = await supabase
        .from('user_points')
        .insert({
          user_id: selectedUser.user_id,
          points: parseInt(pointsToAdd),
        });

      if (error) {
        console.error('Error creating points record:', error);
        toast({
          title: 'Error',
          description: 'Failed to add points',
          variant: 'destructive',
        });
        return;
      }
    }

    toast({
      title: 'Points Added',
      description: `Successfully added ${pointsToAdd} points to ${selectedUser.display_name || selectedUser.username}`,
    });

    setShowAddPointsDialog(false);
    setSelectedUser(null);
    setPointsToAdd('');
    setSearchUser('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badge & Points Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="search-user">Search User</Label>
            <div className="flex gap-2">
              <Input
                id="search-user"
                placeholder="Search by username or display name..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
              />
              <Button onClick={handleSearchUser}>
                <Users className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div>
                      <p className="font-medium">{user.display_name || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                          setShowAwardBadgeDialog(true);
                        }}
                      >
                        <Award className="h-4 w-4 mr-1" />
                        Badge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                          setShowAddPointsDialog(true);
                        }}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Points
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="pt-4">
            <h4 className="font-semibold mb-2">Available Badges</h4>
            <div className="grid grid-cols-2 gap-2">
              {badges.map((badge) => (
                <div key={badge.id} className="flex items-center gap-2 p-2 border rounded">
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Award Badge Dialog */}
      <Dialog open={showAwardBadgeDialog} onOpenChange={setShowAwardBadgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Badge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="text-sm font-medium">
                {selectedUser?.display_name || selectedUser?.username}
              </p>
            </div>
            <div>
              <Label htmlFor="badge-select">Select Badge</Label>
              <select
                id="badge-select"
                className="w-full p-2 border rounded"
                value={selectedBadge}
                onChange={(e) => setSelectedBadge(e.target.value)}
              >
                <option value="">Choose a badge...</option>
                {badges.map((badge) => (
                  <option key={badge.id} value={badge.id}>
                    {badge.icon} {badge.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAwardBadgeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAwardBadge}>
              <Award className="h-4 w-4 mr-2" />
              Award Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Points Dialog */}
      <Dialog open={showAddPointsDialog} onOpenChange={setShowAddPointsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="text-sm font-medium">
                {selectedUser?.display_name || selectedUser?.username}
              </p>
            </div>
            <div>
              <Label htmlFor="points-input">Points Amount</Label>
              <Input
                id="points-input"
                type="number"
                min="1"
                placeholder="Enter points amount..."
                value={pointsToAdd}
                onChange={(e) => setPointsToAdd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPointsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPoints}>
              <Sparkles className="h-4 w-4 mr-2" />
              Add Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BadgeManagement;