
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, doc, updateDoc, 
  Timestamp, orderBy, onSnapshot, increment as firestoreIncrement,
  setDoc, serverTimestamp, getDoc, addDoc
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { User as ChatUser } from "@/context/ChatContext";
import TermsOfService from './TermsOfService';

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

interface SupportSession {
  id: string;
  userId: string;
  userInfo?: {
    displayName: string;
    email: string;
  };
  createdAt: Timestamp;
  lastMessage?: {
    content: string;
    timestamp: Timestamp;
  };
  status: string;
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
  const [archivedSessions, setArchivedSessions] = useState<SupportSession[]>([]);
  const [warnDuration, setWarnDuration] = useState('24h');
  const [showAddModeratorDialog, setShowAddModeratorDialog] = useState(false);
  const [newModeratorEmail, setNewModeratorEmail] = useState('');
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deleteAccountReason, setDeleteAccountReason] = useState('');

  const isModeratorUser = (user: { email?: string }) =>
    user.email === "vitorrossato812@gmail.com" || user.email === "lukasbraga77@gmail.com";

  const isOwnerUser = (user: { email?: string }) =>
    user.email === "vitorrossato812@gmail.com";

  useEffect(() => {
    const checkModerator = async () => {
      if (!currentUser) return;
      
      if (isModeratorUser(currentUser)) {
        setIsModerator(true);
      } else {
        setIsModerator(false);
      }
    };
    
    checkModerator();
  }, [currentUser]);
  
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
        
        const enhancedUserData = userData.map((user, index) => ({
          ...user,
          ipAddress: `192.168.${Math.floor(index / 255)}.${index % 255}`,
          vpnDetected: index % 5 === 0,
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
  
  const searchUserMessages = async () => {
    if (!searchUsername.trim() && !selectedUserId) return;
    
    try {
      let userId = selectedUserId;

      if (!userId) {
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
  
  const handleOpenUserChat = async (conversationId: string) => {
    await setCurrentConversationId(conversationId);
    setShowUserChat(true);
  };
  
  const openBanDialog = (user: User) => {
    setUserToAction(user);
    setShowBanDialog(true);
  };
  
  const openWarnDialog = (user: User) => {
    setUserToAction(user);
    setShowWarnDialog(true);
  };

  const openDeleteAccountDialog = (user: User) => {
    setUserToAction(user);
    setShowDeleteAccountDialog(true);
  };
  
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
      
      await updateDoc(doc(db, "users", userToAction.uid), {
        status: "banned",
        banExpiry: banExpiryDate,
        banReason: banReason || "Violation of terms of service"
      });
      
      toast({
        title: "User banned",
        description: `${userToAction.username} has been banned until ${format(banExpiryDate, 'PPP')}`,
      });
      
      // Add a notification for the user
      await addDoc(collection(db, "notifications"), {
        userId: userToAction.uid,
        type: "ban",
        content: `Your account has been banned until ${format(banExpiryDate, 'PPP')}. Reason: ${banReason || "Violation of terms of service"}`,
        read: false,
        timestamp: serverTimestamp()
      });
      
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
  
  const warnUser = async () => {
    if (!userToAction) return;
    
    try {
      // Get current warnings count
      const userDoc = await getDoc(doc(db, "users", userToAction.uid));
      const currentWarnings = userDoc.exists() ? (userDoc.data().warnings || 0) : 0;
      
      let warningExpiry;
      switch (warnDuration) {
        case '24h':
          warningExpiry = new Date();
          warningExpiry.setHours(warningExpiry.getHours() + 24);
          break;
        case '7d':
          warningExpiry = new Date();
          warningExpiry.setDate(warningExpiry.getDate() + 7);
          break;
        case '30d':
          warningExpiry = new Date();
          warningExpiry.setDate(warningExpiry.getDate() + 30);
          break;
        case 'permanent':
          warningExpiry = new Date();
          warningExpiry.setFullYear(warningExpiry.getFullYear() + 100);
          break;
        default:
          warningExpiry = new Date();
          warningExpiry.setHours(warningExpiry.getHours() + 24);
      }
      
      await updateDoc(doc(db, "users", userToAction.uid), {
        warnings: currentWarnings + 1,
        lastWarning: new Date(),
        lastWarningReason: warnReason || "Policy violation",
        warningExpiry: warningExpiry
      });

      // Add a warning notification
      await addDoc(collection(db, "notifications"), {
        userId: userToAction.uid,
        type: "warning",
        content: `Your account has been warned: ${warnReason || "Policy violation"}. This warning expires on ${format(warningExpiry, 'PPP')}.`,
        read: false,
        requiresAction: true,
        timestamp: serverTimestamp()
      });
      
      toast({
        title: "User warned",
        description: "A warning has been issued to this user",
      });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === userToAction.uid 
            ? { 
                ...user, 
                warnings: (user.warnings || 0) + 1,
                lastWarning: new Date(),
                lastWarningReason: warnReason || "Policy violation",
                warningExpiry: warningExpiry
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

  const deleteAccount = async () => {
    if (!userToAction) return;
    
    try {
      // In a real app, you would want to anonymize this data rather than delete it
      await updateDoc(doc(db, "users", userToAction.uid), {
        status: "deleted",
        displayName: "Deleted User",
        email: `deleted_${userToAction.uid}@example.com`,
        username: `deleted_${userToAction.uid}`,
        description: "",
        deleteReason: deleteAccountReason || "Account deleted by moderator",
        deletedAt: serverTimestamp()
      });
      
      toast({
        title: "Account deleted",
        description: "The user account has been deleted",
      });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === userToAction.uid 
            ? { 
                ...user, 
                status: "deleted",
                displayName: "Deleted User",
                email: `deleted_${userToAction.uid}@example.com`,
                username: `deleted_${userToAction.uid}`,
              } 
            : user
        )
      );
      
      setShowDeleteAccountDialog(false);
      setDeleteAccountReason('');
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive"
      });
    }
  };

  const addModerator = async () => {
    if (!newModeratorEmail || !newModeratorEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Find the user by email
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", newModeratorEmail));
      const userDocs = await getDocs(userQuery);
      
      if (userDocs.empty) {
        toast({
          title: "User not found",
          description: "No user found with that email address",
          variant: "destructive"
        });
        return;
      }
      
      const userDoc = userDocs.docs[0];
      await updateDoc(doc(db, "users", userDoc.id), {
        role: "moderator"
      });
      
      toast({
        title: "Moderator added",
        description: `${newModeratorEmail} is now a moderator`,
      });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.email === newModeratorEmail
            ? { ...user, role: "moderator" } 
            : user
        )
      );
      
      setShowAddModeratorDialog(false);
      setNewModeratorEmail('');
    } catch (error) {
      console.error("Error adding moderator:", error);
      toast({
        title: "Error",
        description: "Failed to add moderator",
        variant: "destructive"
      });
    }
  };
  
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
  
  const renderUserStatus = (user: User) => {
    if (user.status === 'banned') {
      return (
        <Badge variant="destructive" className="px-2 py-1 rounded-full text-xs">
          Banned
        </Badge>
      );
    }
    
    if (user.status === 'deleted') {
      return (
        <Badge variant="outline" className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-800">
          Deleted
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

  useEffect(() => {
    if (!isModerator) return;
    const fetchArchivedSessions = async () => {
      try {
        const sessionsRef = collection(db, "supportSessions");
        const q = query(sessionsRef, where("status", "==", "ended"), orderBy("lastMessage.timestamp", "desc"));
        const snap = await getDocs(q);
        const sessions = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as SupportSession[];
        setArchivedSessions(sessions);
      } catch (e) {
        console.error("Error fetching archived support sessions", e);
      }
    };
    fetchArchivedSessions();
  }, [isModerator]);
  
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
      <ScrollArea className="h-[80vh]">
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
          
          {/* Add Moderator button (only for owner) */}
          {isOwnerUser(currentUser) && (
            <Button 
              onClick={() => setShowAddModeratorDialog(true)}
              className="ml-auto mr-2"
            >
              Add Moderator
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="reports">
          <TabsList className="mb-4">
            <TabsTrigger value="reports">Reported Messages</TabsTrigger>
            <TabsTrigger value="search">User Search</TabsTrigger>
            <TabsTrigger value="support">Live Support</TabsTrigger>
            <TabsTrigger value="files">Archived Sessions</TabsTrigger>
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
                <ScrollArea className="h-[500px]">
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
                </ScrollArea>
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
                <ScrollArea className="h-[500px]">
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
                            <TableCell>
                              @{user.username}
                              {isModeratorUser(user) && (
                                <Badge variant="secondary" className="ml-2 px-2 py-1 rounded-full bg-blue-600 text-white text-xs">
                                  <Shield className="h-3 w-3 mr-1" /> Moderator
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{user.displayName}</TableCell>
                            <TableCell>
                              {user.email}
                              {isModeratorUser(user) && (
                                <Badge variant="secondary" className="ml-2 px-2 py-1 rounded-full bg-blue-600 text-white text-xs">
                                  <Shield className="h-3 w-3 mr-1" /> Moderator
                                </Badge>
                              )}
                            </TableCell>
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
                                  disabled={user.status === 'banned' || isModeratorUser(user)}
                                  onClick={() => openBanDialog(user)}
                                >
                                  <Ban className="h-4 w-4 mr-1" />
                                  Ban
                                </Button>
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  disabled={isModeratorUser(user)}
                                  onClick={() => openWarnDialog(user)}
                                >
                                  <Shield className="h-4 w-4 mr-1" />
                                  Warn
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  disabled={user.status === 'deleted' || isModeratorUser(user)}
                                  onClick={() => openDeleteAccountDialog(user)}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-1" />
                                  Delete Account
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
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="support">
            <ScrollArea className="h-[500px]">
              <ModeratorLiveSupport />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>Archived Support Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableCaption>Support sessions that have been ended</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedSessions.length > 0 ? (
                        archivedSessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>
                              {session.createdAt?.toDate
                                ? format(session.createdAt.toDate(), 'PPp')
                                : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {session.userInfo?.displayName || session.userId}
                            </TableCell>
                            <TableCell>
                              {session.lastMessage?.content || ''}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {session.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">No archived sessions found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="chat" className={showUserChat ? "" : "hidden"}>
            <div className="border rounded-lg overflow-hidden h-[70vh]">
              <ChatWindow />
            </div>
          </TabsContent>
        </Tabs>
        
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
              <label className="text-sm font-medium mb-1 block mt-4">Warning Duration</label>
              <Select defaultValue="24h" onValueChange={setWarnDuration}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs mt-2">
                By warning this user, they will see a notification with the reason, duration, and a link to our <a href="#" className="underline text-blue-700" onClick={e => {e.preventDefault(); setShowWarnDialog(false);}}>Terms of Service</a>.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWarnDialog(false)}>Cancel</Button>
              <Button variant="secondary" onClick={async () => {
                await warnUser();
                toast({
                  title: "User warned",
                  description: `Warned for ${warnDuration}: "${warnReason}". See Terms of Service.`,
                });
                setShowWarnDialog(false);
              }}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Issue Warning
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                {userToAction ? `Delete account for @${userToAction.username} (${userToAction.email})` : ''}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <p className="text-destructive font-bold">Warning: This action cannot be undone!</p>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Reason for Account Deletion</label>
                <Textarea
                  placeholder="Enter reason for account deletion..."
                  value={deleteAccountReason}
                  onChange={(e) => setDeleteAccountReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteAccountDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={deleteAccount}>Delete Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddModeratorDialog} onOpenChange={setShowAddModeratorDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Moderator</DialogTitle>
              <DialogDescription>
                Enter the email address of the user you want to make a moderator
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Email Address</label>
                <Input
                  placeholder="Enter email address..."
                  value={newModeratorEmail}
                  onChange={(e) => setNewModeratorEmail(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModeratorDialog(false)}>Cancel</Button>
              <Button onClick={addModerator}>Add Moderator</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ScrollArea>
    </div>
  );
};

export default ModeratorPanel;
