import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChat } from '@/context/ChatContext';
import { UserMinus, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import UserAvatar from './UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  participants: any[];
}

const RemoveMemberDialog: React.FC<RemoveMemberDialogProps> = ({ 
  open, 
  onOpenChange, 
  conversationId, 
  participants 
}) => {
  const { currentUser } = useAuth();
  const { removeMemberFromChat, refreshConversations } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  const handleRemoveMember = async (userId: string, username: string) => {
    if (userId === currentUser?.uid) {
      toast({
        title: "Cannot remove yourself",
        description: "You cannot remove yourself from the group. Use 'Leave Chat' instead.",
        variant: "destructive"
      });
      return;
    }

    try {
      await removeMemberFromChat(conversationId, userId);
      await refreshConversations();
      
      toast({
        title: "Member removed",
        description: `${username} has been removed from the group`,
      });
      
      onOpenChange(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Failed to remove member",
        description: "Could not remove user from the group",
        variant: "destructive"
      });
    }
  };

  // Filter participants based on search query
  const filteredParticipants = participants.filter(participant => 
    participant.uid !== currentUser?.uid && // Don't show current user
    (participant.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     participant.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Remove Member from Group</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label>Search Members</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search group members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-3">
            {filteredParticipants.length > 0 ? (
              <div className="space-y-2">
                {filteredParticipants.map((participant) => (
                  <div key={participant.uid} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                    <div className="flex items-center space-x-3">
                      <UserAvatar 
                        username={participant.username || participant.displayName} 
                        photoURL={participant.photoURL}
                        size="sm" 
                      />
                      <div>
                        <p className="font-medium">{participant.displayName || participant.username}</p>
                        <p className="text-sm text-muted-foreground">@{participant.username}</p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveMember(
                        participant.uid, 
                        participant.displayName || participant.username
                      )}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : participants.length <= 1 ? (
              <div className="text-center text-muted-foreground py-8">
                No other members in this group
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No members found for "{searchQuery}"
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

export default RemoveMemberDialog;