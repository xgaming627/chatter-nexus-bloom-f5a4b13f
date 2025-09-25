import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChat } from '@/context/ChatContext';
import { Search, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import UserAvatar from './UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({ open, onOpenChange, conversationId }) => {
  const { currentUser } = useAuth();
  const { addMemberToChat, refreshConversations } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, photo_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      
      // Filter out current user
      const filteredResults = (data || []).filter(user => user.user_id !== currentUser?.uid);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search failed",
        description: "Could not search for users",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: string, username: string) => {
    try {
      await addMemberToChat(conversationId, userId);
      await refreshConversations();
      
      toast({
        title: "Member added",
        description: `${username} has been added to the group`,
      });
      
      onOpenChange(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Failed to add member",
        description: "Could not add user to the group",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Member to Group</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter username or display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    searchUsers();
                  }
                }}
              />
              <Button 
                onClick={searchUsers}
                disabled={isSearching || !searchQuery.trim()}
                size="icon"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-3">
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                    <div className="flex items-center space-x-3">
                      <UserAvatar 
                        username={user.username || user.display_name} 
                        photoURL={user.photo_url}
                        size="sm" 
                      />
                      <div>
                        <p className="font-medium">{user.display_name || user.username}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddMember(user.user_id, user.display_name || user.username)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchQuery.trim() && !isSearching ? (
              <div className="text-center text-muted-foreground py-8">
                No users found for "{searchQuery}"
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Search for users to add to this group
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;