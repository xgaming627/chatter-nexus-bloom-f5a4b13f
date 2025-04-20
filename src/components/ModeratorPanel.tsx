
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, doc, updateDoc, 
  Timestamp, orderBy, onSnapshot, increment as firestoreIncrement
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
import { MessageSquare, ArrowLeft, Ban, Shield, AlertTriangle } from 'lucide-react';
import ChatWindow from './ChatWindow';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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
  banExpiry?: any;
  createdAt?: any;
  warnings?: number;
  lastWarning?: any;
  ipAddress?: string;
  vpnDetected?: boolean;
  description?: string;
  onlineStatus?: 'online' | 'away' | 'offline';
}

const ModeratorPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const { setCurrentConversationId } = useChat();
  const [isModerator, setIsModerator] = useState(false);
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [banDuration, setBanDuration] = useState('1d');
  const [showUserChat, setShowUserChat] = useState(false);
  const [showModPanel, setShowModPanel] = useState(true);
  const [banReason, setBanReason] = useState('');
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showWarnDialog, setShowWarnDialog] = useState(false);
  const [warnReason, setWarnReason] = useState('');
  const [userToAction, setUserToAction] = useState<User | null>(null);
  
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
  
  // Load all users
  useEffect(() => {
    if (!isModerator) return;
    
    const loadUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const userData = snapshot.docs.map(doc => ({
          ...doc.data(),
          uid: doc.id
        })) as User[];
        
        // Simulate some users with VPN for demo
        const enhancedUserData = userData.map((user, index) => ({
          ...user,
          ipAddress: `192.168.${Math.floor(index / 255)}.${index % 255}`,
          vpnDetected: index % 5 === 0, // Every 5th user has VPN
          onlineStatus: ['online', 'away', 'offline'][Math.floor(Math.random() * 3)] as 'online' | 'away' | 'offline'
        }));
        
        setUsers(enhancedUserData);
        setFilteredUsers(enhancedUserData);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    
    loadUsers();
  }, [isModerator]);
  
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
  
  // Filter users as user types
  useEffect(() => {
    if (searchUsername.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.username?.toLowerCase().includes(searchUsername.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchUsername.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchUsername.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchUsername, users]);
  
  // Search for users by username
  const searchUserMessages = async () => {
    if (!searchUsername.trim() && !selectedUserId) return;
    
    try {
      let userId = selectedUserId;

      if (!userId) {
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
        userId = userData.uid;
        setSelectedUserId(userId);
      }

      // Then get messages from the user
      const messagesRef = collection(db, "messages");
      const messageQuery = query(messagesRef, where("senderId", "==", userId));
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
          description: `User has no messages`,
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
  
  // Show ban dialog
  const openBanDialog = (user: User) => {
    setUserToAction(user);
    setShowBanDialog(true);
  };
  
  // Show warn dialog
  const openWarnDialog = (user: User) => {
    setUserToAction(user);
    setShowWarnDialog(true);
  };
  
  // Handle message action (e.g., ban user)
  const banUser = async () => {
    if (!userToAction) return;
    
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
      await updateDoc(doc(db, "users", userToAction.uid), {
        status: "banned",
        banExpiry: banExpiryDate,
        banReason: banReason || "Violation of terms of service"
      });
      
      toast({
        title: "User banned",
        description: `${userToAction.username} has been banned until ${format(banExpiryDate, 'PPP')}`,
      });
      
      // Refresh user list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === userToAction.uid 
            ? { 
                ...user, 
                status: "banned", 
                banExpiry: banExpiryDate,
                banReason: banReason || "Violation of terms of service"
              } 
            : user
        )
      );
      
      setShowBanDialog(false);
      setBanReason('');
    } catch (error) {
      console.error("Error banning user:", error);
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive"
      });
    }
  };
  
  // Handle warn user
  const warnUser = async () => {
    if (!userToAction) return;
    
    try {
      // Update the user's record with a warning
      await updateDoc(doc(db, "users", userToAction.uid), {
        warnings: firestoreIncrement(1),
        lastWarning: new Date(),
        lastWarningReason: warnReason || "Policy violation"
      });
      
      toast({
        title: "User warned",
        description: "A warning has been issued to this user",
      });
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === userToAction.uid 
            ? { 
                ...user, 
                warnings: (user.warnings || 0) + 1,
                lastWarning: new Date(),
                lastWarningReason: warnReason || "Policy violation"
              } 
            : user
        )
      );
      
      setShowWarnDialog(false);
      setWarnReason('');
    } catch (error) {
      console.error("Error warning user:", error);
      toast({
        title: "Error",
        description: "Failed to warn user",
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
  
  const toggleModeratorPanel = () => {
    setShowModPanel(!showModPanel);
  };
  
  // Render user status badge
  const renderUserStatus = (user: User) => {
    if (user.status === 'banned') {
      return (
        <Badge variant="destructive" className="px-2 py-1 rounded-full text-xs">
          Banned
        </Badge>
      );
    }
    
    if (user.warnings && user.warnings > 0) {
      return (
        <Badge variant="outline" className="px-2 py-1 rounded-full text-xs bg-yellow-200 text-yellow-800">
          Warned ({user.warnings})
        </Badge>
      );
    }
    
    if (user.vpnDetected) {
      return (
        <Badge variant="outline" className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
          VPN Detected
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="px-2 py-1 rounded-full text-xs bg-green-200 text-green-800">
        {user.onlineStatus || "Active"}
      </Badge>
    );
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
  
  // Show only chat window if minimized
  if (!showModPanel && showUserChat) {
    return (
      <div className="container mx-auto p-4">
        <Button 
          variant="outline" 
          className="mb-4 fixed top-20 right-4 z-50 shadow-md"
          onClick={toggleModeratorPanel}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Show Moderator Panel
        </Button>
        <div className="border rounded-lg overflow-hidden h-[80vh]">
          <ChatWindow />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Moderator Panel</h1>
        {showUserChat && (
          <Button 
            variant="outline" 
            onClick={toggleModeratorPanel}
          >
            {showModPanel ? (
              <>Minimize Panel</>
            ) : (
              <>Show Panel</>
            )}
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="reports">
        <TabsList className="mb-4">
          <TabsTrigger value="reports">Reported Messages</TabsTrigger>
          <TabsTrigger value="search">User Search</TabsTrigger>
          <TabsTrigger value="support">Live Support</TabsTrigger>
          {showUserChat && (
            <TabsTrigger value="chat">User Chat</TabsTrigger>
          )}
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
              <CardTitle>User Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input 
                  placeholder="Search users by name, username or email" 
                  value={searchUsername}
                  onChange={e => setSearchUsername(e.target.value)}
                  className="max-w-md search-input bg-background text-foreground"
                />
              </div>
              
              <Table>
                <TableCaption>Registered Users</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.uid} className={user.vpnDetected ? "bg-orange-50 dark:bg-orange-900/20" : ""}>
                        <TableCell>@{user.username}</TableCell>
                        <TableCell>{user.displayName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.createdAt ? format(user.createdAt.toDate(), 'PPp') : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {renderUserStatus(user)}
                        </TableCell>
                        <TableCell>
                          <span className={user.vpnDetected ? "text-orange-600" : ""}>
                            {user.ipAddress || "Unknown"}
                            {user.vpnDetected && (
                              <Badge className="ml-2 bg-orange-200 text-orange-800 text-xs">VPN</Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUserId(user.uid);
                                searchUserMessages();
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Find Messages
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => openBanDialog(user)}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Ban
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => openWarnDialog(user)}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Warn
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">No users found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {searchResults.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Messages from selected user</h3>
                  <Table>
                    <TableCaption>User Messages</TableCaption>
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="support">
          <ModeratorLiveSupport />
        </TabsContent>
        
        <TabsContent value="chat" className={showUserChat ? "" : "hidden"}>
          <div className="border rounded-lg overflow-hidden h-[70vh]">
            <ChatWindow />
          </div>
        </TabsContent>
      </Tabs>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              {userToAction ? `Ban user @${userToAction.username} (${userToAction.email})` : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Ban Duration</label>
              <Select defaultValue="1d" onValueChange={setBanDuration}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Ban Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Reason for Ban</label>
              <Textarea
                placeholder="Enter reason for ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={banUser}>Ban User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warn Dialog */}
      <Dialog open={showWarnDialog} onOpenChange={setShowWarnDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Warn User</DialogTitle>
            <DialogDescription>
              {userToAction ? `Issue a warning to @${userToAction.username} (${userToAction.email})` : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-1 block">Warning Reason</label>
            <Textarea
              placeholder="Enter reason for warning..."
              value={warnReason}
              onChange={(e) => setWarnReason(e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarnDialog(false)}>Cancel</Button>
            <Button variant="secondary" onClick={warnUser}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Issue Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModeratorPanel;
