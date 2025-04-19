
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useChat } from '@/context/ChatContext';
import { Badge } from '@/components/ui/badge';
import SearchUsers from './SearchUsers';

interface User {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
}

const NewChatButton: React.FC = () => {
  const { createConversation, createGroupChat, setCurrentConversationId } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUserSelect = (user: User) => {
    if (!selectedUsers.find(u => u.uid === user.uid)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.uid !== userId));
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;
    
    setLoading(true);
    
    try {
      // For one-on-one chat
      if (selectedUsers.length === 1) {
        const conversationId = await createConversation([selectedUsers[0].uid]);
        setCurrentConversationId(conversationId);
        setIsOpen(false);
        setSelectedUsers([]);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0 || !groupName.trim()) return;
    
    setLoading(true);
    
    try {
      const userIds = selectedUsers.map(user => user.uid);
      const conversationId = await createGroupChat(groupName, userIds);
      setCurrentConversationId(conversationId);
      setIsOpen(false);
      setSelectedUsers([]);
      setGroupName('');
    } catch (error) {
      console.error("Error creating group chat:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full mb-2">
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
            <DialogDescription>
              Search for users or create a group chat
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">Direct Chat</TabsTrigger>
              <TabsTrigger value="group">Group Chat</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="space-y-4 mt-4">
              <SearchUsers onUserSelected={handleUserSelect} />
              
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedUsers.map(user => (
                    <Badge key={user.uid} variant="secondary">
                      {user.displayName}
                      <button
                        className="ml-1 focus:outline-none"
                        onClick={() => removeUser(user.uid)}
                      >
                        ✕
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <DialogFooter>
                <Button 
                  onClick={handleCreateChat}
                  disabled={selectedUsers.length === 0 || loading}
                >
                  {loading ? "Creating..." : "Start Chat"}
                </Button>
              </DialogFooter>
            </TabsContent>
            
            <TabsContent value="group" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Input
                  placeholder="Group Name"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                />
              </div>
              
              <SearchUsers onUserSelected={handleUserSelect} />
              
              <div>
                <h4 className="text-sm font-medium mb-2">Selected Users ({selectedUsers.length})</h4>
                {selectedUsers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <Badge key={user.uid} variant="secondary">
                        {user.displayName}
                        <button
                          className="ml-1 focus:outline-none"
                          onClick={() => removeUser(user.uid)}
                        >
                          ✕
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No users selected</p>
                )}
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={handleCreateGroup}
                  disabled={selectedUsers.length === 0 || !groupName.trim() || loading}
                >
                  {loading ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewChatButton;
