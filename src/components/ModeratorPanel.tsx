
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, doc, updateDoc, 
  Timestamp, orderBy, onSnapshot 
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ModeratorLiveSupport from './ModeratorLiveSupport';
import { useChat } from '@/context/ChatContext';
import { MessageSquare } from 'lucide-react';

interface ModerationItem {
  id: string;
  messageId: string;
  conversationId: string;
  content: string;
  senderId: string;
  reportedBy?: string;
  timestamp: Timestamp;
  reason: string;
  status: string;
}

interface User {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  status?: string;
  banExpiry?: Date;
}

const ModeratorPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const { setCurrentConversationId } = useChat();
  const [isModerator, setIsModerator] = useState(false);
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [banDuration, setBanDuration] = useState('1d');
  const [showUserChat, setShowUserChat] = useState(false);
  
  // Check if current user is a moderator
  useEffect(() => {
    const checkModerator = async () => {
      if (!currentUser) return;
      
      // For demo purposes, we'll check if the email is the specified mod email
      if (currentUser.email === 'vitorrossato812@gmail.com') {
        setIsModerator(true);
      } else {
        setIsModerator(false);
      }
    };
    
    checkModerator();
  }, [currentUser]);
  
  // Load moderation items when the component mounts
  useEffect(() => {
    if (!isModerator) return;
    
    const q = query(
      collection(db, "moderation"),
      orderBy("timestamp", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ModerationItem[] = [];
      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        } as ModerationItem);
      });
      
      setModerationItems(items);
    });
    
    return () => unsubscribe();
  }, [isModerator]);
  
  // Search for users by username
  const searchUserMessages = async () => {
    if (!searchUsername.trim()) return;
    
    try {
      // First, find the user by username
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("username", "==", searchUsername));
      const userDocs = await getDocs(userQuery);
      
      if (userDocs.empty) {
        toast({
          title: "User not found",
          description: `No user found with username ${searchUsername}`,
          variant: "destructive"
        });
        return;
      }
      
      const userData = userDocs.docs[0].data() as User;
      setSelectedUserId(userData.uid);
      
      // Then get messages from the user
      const messagesRef = collection(db, "messages");
      const messageQuery = query(messagesRef, where("senderId", "==", userData.uid));
      const messageDocs = await getDocs(messageQuery);
      
      const messages: any[] = [];
      messageDocs.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setSearchResults(messages);
      setSelectedMessages([]);
      
      if (messages.length === 0) {
        toast({
          title: "No messages found",
          description: `User ${searchUsername} has no messages`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error("Error searching user messages:", error);
      toast({
        title: "Search error",
        description: "Failed to search user messages",
        variant: "destructive"
      });
    }
  };
  
  // Handle opening user chat
  const handleOpenUserChat = async (conversationId: string) => {
    await setCurrentConversationId(conversationId);
    setShowUserChat(true);
  };
  
  // Handle message action (e.g., ban user)
  const banUser = async () => {
    if (!selectedUserId) return;
    
    try {
      let banExpiryDate;
      switch (banDuration) {
        case '1d':
          banExpiryDate = new Date();
          banExpiryDate.setDate(banExpiryDate.getDate() + 1);
          break;
        case '7d':
          banExpiryDate = new Date();
          banExpiryDate.setDate(banExpiryDate.getDate() + 7);
          break;
        case '30d':
          banExpiryDate = new Date();
          banExpiryDate.setDate(banExpiryDate.getDate() + 30);
          break;
        case 'permanent':
          banExpiryDate = new Date();
          banExpiryDate.setFullYear(banExpiryDate.getFullYear() + 100);
          break;
        default:
          banExpiryDate = new Date();
          banExpiryDate.setDate(banExpiryDate.getDate() + 1);
      }
      
      // Update the user's record with the ban
      await updateDoc(doc(db, "users", selectedUserId), {
        status: "banned",
        banExpiry: banExpiryDate
      });
      
      toast({
        title: "User banned",
        description: `User has been banned until ${format(banExpiryDate, 'PPP')}`,
      });
      
      // Clear search results
      setSearchResults([]);
      setSelectedMessages([]);
      setSearchUsername('');
      setSelectedUserId(null);
    } catch (error) {
      console.error("Error banning user:", error);
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive"
      });
    }
  };
  
  // Handle moderation action
  const handleModeration = async (id: string, action: 'approve' | 'dismiss') => {
    try {
      await updateDoc(doc(db, "moderation", id), {
        status: action === 'approve' ? 'flagged' : 'dismissed'
      });
      
      toast({
        title: `Message ${action === 'approve' ? 'flagged' : 'dismissed'}`,
      });
    } catch (error) {
      console.error(`Error ${action}ing message:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} message`,
        variant: "destructive"
      });
    }
  };
  
  if (!currentUser) {
    return null;
  }
  
  if (!isModerator) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to access the moderator panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Moderator Panel</h1>
      
      <Tabs defaultValue="reports">
        <TabsList className="mb-4">
          <TabsTrigger value="reports">Reported Messages</TabsTrigger>
          <TabsTrigger value="search">User Search</TabsTrigger>
          <TabsTrigger value="support">Live Support</TabsTrigger>
          <TabsTrigger value="chat">User Chat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reported Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>List of messages that need moderation</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moderationItems.length > 0 ? (
                    moderationItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.timestamp && format(item.timestamp.toDate(), 'PPp')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.content}</TableCell>
                        <TableCell>{item.reason}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 
                            item.status === 'flagged' ? 'bg-red-200 text-red-800' : 
                            'bg-green-200 text-green-800'
                          }`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleModeration(item.id, 'approve')}
                              >
                                Flag
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleModeration(item.id, 'dismiss')}
                              >
                                Dismiss
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenUserChat(item.conversationId)}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Chat
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No reported messages</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Search User Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input 
                  placeholder="Enter username" 
                  value={searchUsername}
                  onChange={e => setSearchUsername(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={searchUserMessages}>Search</Button>
              </div>
              
              {searchResults.length > 0 && (
                <>
                  <Table>
                    <TableCaption>Messages from @{searchUsername}</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Conversation</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell>
                            {message.timestamp && format(message.timestamp.toDate(), 'PPp')}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{message.content}</TableCell>
                          <TableCell>{message.conversationId}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenUserChat(message.conversationId)}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              View Chat
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Ban User</h3>
                    <div className="flex items-center gap-4">
                      <Select defaultValue="1d" onValueChange={setBanDuration}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Ban Duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1d">1 Day</SelectItem>
                          <SelectItem value="7d">7 Days</SelectItem>
                          <SelectItem value="30d">30 Days</SelectItem>
                          <SelectItem value="permanent">Permanent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="destructive" 
                        onClick={banUser}
                      >
                        Ban User
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="support">
          <ModeratorLiveSupport />
        </TabsContent>
        
        <TabsContent value="chat" className={showUserChat ? "" : "hidden"}>
          <Button 
            variant="outline" 
            className="mb-4"
            onClick={() => setShowUserChat(false)}
          >
            Back to Moderator Panel
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModeratorPanel;
