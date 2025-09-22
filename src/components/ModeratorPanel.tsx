import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import UsernameEditDialog from './UsernameEditDialog';
import TermsOfService from './TermsOfService';

interface ModerationItem {
  id: string;
  message_id: string;
  conversation_id: string;
  content: string;
  sender_id: string;
  reported_by?: string;
  timestamp: string;
  reason: string;
  status: string;
}

interface User {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email?: string;
  status?: string;
  ban_expiry?: string;
  created_at?: string;
  warnings?: number;
  last_warning?: string;
  ip_address?: string;
  vpn_detected?: boolean;
  description?: string | null;
  online_status?: string;
  photo_url?: string | null;
}

interface SupportSession {
  id: string;
  user_id: string;
  userInfo?: {
    display_name: string;
    email: string;
  };
  created_at: string;
  last_message?: {
    content: string;
    timestamp: string;
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
  const [showEditUsernameDialog, setShowEditUsernameDialog] = useState(false);
  const [userToEditUsername, setUserToEditUsername] = useState<User | null>(null);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deleteAccountReason, setDeleteAccountReason] = useState('');

  const isModeratorUser = (user: { email?: string, display_name?: string }) =>
    user.email === "vitorrossato812@gmail.com" || user.email === "lukasbraga77@gmail.com" ||
    user.display_name === "vitorrossato812@gmail.com" || user.display_name === "lukasbraga77@gmail.com";

  const isOwnerUser = (user: { email?: string, display_name?: string }) =>
    user.email === "vitorrossato812@gmail.com" || user.display_name === "vitorrossato812@gmail.com";

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
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error loading users:", error);
          return;
        }

        const enhancedUserData = profiles?.map((user) => ({
          ...user,
          warnings: 0, // This could be fetched from user_warnings table if needed
          ip_address: '***.***.***.**', // Hide IP for privacy
          vpn_detected: false, // Could be implemented with real VPN detection
          online_status: user.online_status || 'offline'
        })) || [];
        
        setUsers(enhancedUserData);
        setFilteredUsers(enhancedUserData);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    
    loadUsers();
  }, [isModerator]);
  
  useEffect(() => {
    if (searchUsername.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.username?.toLowerCase().includes(searchUsername.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(searchUsername.toLowerCase()) ||
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
        const { data: userProfiles, error } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', searchUsername)
          .single();
        
        if (error || !userProfiles) {
          toast({
            title: "User not found",
            description: `No user found with username ${searchUsername}`,
            variant: "destructive"
          });
          return;
        }
        
        userId = userProfiles.user_id;
        setSelectedUserId(userId);
      }

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId)
        .order('timestamp', { ascending: false });
      
      if (error) {
        throw error;
      }

      setSearchResults(messages || []);
      setSelectedMessages([]);
      
      if (!messages || messages.length === 0) {
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
      
      const { error } = await supabase
        .from('profiles')
        .update({
          online_status: 'banned',
          ban_expiry: banExpiryDate.toISOString(),
          ban_reason: banReason || 'Violation of terms of service'
        })
        .eq('user_id', userToAction.user_id);

      if (error) throw error;
      
      toast({
        title: "User banned",
        description: `${userToAction.username} has been banned until ${format(banExpiryDate, 'PPP')}`,
      });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.user_id === userToAction.user_id 
            ? { 
                ...user, 
                online_status: 'banned' as any,
                ban_expiry: banExpiryDate.toISOString(),
                ban_reason: banReason || 'Violation of terms of service'
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
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('description') // Remove warnings from select since it doesn't exist
        .eq('user_id', userToAction.user_id)
        .single();

      if (fetchError) throw fetchError;

      const currentWarnings = 0; // Since warnings column doesn't exist, start with 0
      
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
      
      const { error } = await supabase
        .from('profiles')
        .update({
          description: `Warning: ${warnReason || 'Policy violation'}. Expires: ${warningExpiry.toISOString()}`
        })
        .eq('user_id', userToAction.user_id);

      if (error) throw error;
      
      toast({
        title: "User warned",
        description: "A warning has been issued to this user",
      });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.user_id === userToAction.user_id 
            ? { 
                ...user, 
                warnings: (user.warnings || 0) + 1,
                last_warning: new Date().toISOString(),
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
      const { error } = await supabase
        .from('profiles')
        .update({
          online_status: 'deleted',
          display_name: 'Deleted User',
          username: `deleted_${userToAction.user_id}`,
          description: '',
          delete_reason: deleteAccountReason || 'Account deleted by moderator'
        })
        .eq('user_id', userToAction.user_id);

      if (error) throw error;
      
      toast({
        title: "Account deleted",
        description: "The user account has been deleted",
      });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.user_id === userToAction.user_id 
            ? { 
                ...user, 
                online_status: 'deleted' as any,
                display_name: 'Deleted User',
                username: `deleted_${userToAction.user_id}`,
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
      // Note: In a real application, you would need a proper role management system
      // This is a simplified implementation
      toast({
        title: "Feature not implemented",
        description: "Moderator role management is not yet implemented in Supabase version",
        variant: "destructive"
      });
      
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

  if (!currentUser || !isModerator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have permission to access the moderator panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showUserChat) {
    return (
      <div>
        <Button 
          variant="outline" 
          onClick={() => setShowUserChat(false)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Moderator Panel
        </Button>
        <ChatWindow />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Moderator Panel</h1>
        </div>
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          {isOwnerUser(currentUser) ? 'Owner' : 'Moderator'}
        </Badge>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="messages">Message Search</TabsTrigger>
          <TabsTrigger value="support">Live Support</TabsTrigger>
          <TabsTrigger value="terms">Terms of Service</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Search & Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Search users by username, name, or email..."
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                />
                {isOwnerUser(currentUser) && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowAddModeratorDialog(true)}
                  >
                    Add Moderator
                  </Button>
                )}
              </div>
              
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Warnings</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                         <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {user.username || 'No username'}
                              {user.vpn_detected && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">
                                  VPN
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                           <TableCell>{user.display_name || user.username || 'No display name'}</TableCell>
                           <TableCell>
                             {isModeratorUser(currentUser) 
                               ? (user.display_name?.includes('@') ? user.display_name : 'Private')
                               : '***@*****.***'
                             }
                           </TableCell>
                        <TableCell>
                          <Badge variant={
                            user.online_status === 'banned' ? 'destructive' :
                            user.online_status === 'deleted' ? 'secondary' :
                            user.online_status === 'online' ? 'default' : 'outline'
                          }>
                            {user.online_status || 'offline'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.warnings ? (
                            <Badge variant="destructive" className="bg-orange-100 text-orange-800">
                              {user.warnings}
                            </Badge>
                          ) : (
                            '0'
                          )}
                        </TableCell>
                         <TableCell>
                           <div className="flex gap-2">
                             <Button 
                               size="sm" 
                               variant="outline"
                               onClick={() => {
                                 setUserToEditUsername(user);
                                 setShowEditUsernameDialog(true);
                               }}
                               title="Edit Username"
                             >
                               Edit
                             </Button>
                             <Button 
                               size="sm" 
                               variant="outline"
                               onClick={() => openWarnDialog(user)}
                             >
                               <AlertTriangle className="h-3 w-3" />
                             </Button>
                             <Button 
                               size="sm" 
                               variant="destructive"
                               onClick={() => openBanDialog(user)}
                             >
                               <Ban className="h-3 w-3" />
                             </Button>
                             {isOwnerUser(currentUser) && (
                               <Button 
                                 size="sm" 
                                 variant="destructive"
                                 onClick={() => openDeleteAccountDialog(user)}
                               >
                                 Delete
                               </Button>
                             )}
                           </div>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Username to search messages for..."
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                />
                <Button onClick={searchUserMessages}>
                  Search Messages
                </Button>
              </div>
              
              <ScrollArea className="h-[400px]">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((message) => (
                      <Card key={message.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-muted-foreground">
                            {message.timestamp ? format(new Date(message.timestamp), 'PPpp') : 'Unknown time'}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenUserChat(message.conversation_id)}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Open Chat
                          </Button>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        {message.flagged_for_moderation && (
                          <Badge variant="destructive" className="mt-2">
                            Flagged for Moderation
                          </Badge>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No messages found. Search for a user to see their messages.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <ModeratorLiveSupport />
        </TabsContent>

        <TabsContent value="terms">
          <TermsOfService />
        </TabsContent>
      </Tabs>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {userToAction?.username}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ban Duration</label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger>
                  <SelectValue />
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
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                placeholder="Reason for ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={banUser}>
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warn Dialog */}
      <Dialog open={showWarnDialog} onOpenChange={setShowWarnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warn User</DialogTitle>
            <DialogDescription>
              Issue a warning to {userToAction?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Warning Duration</label>
              <Select value={warnDuration} onValueChange={setWarnDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Warning Reason</label>
              <Textarea
                placeholder="Reason for warning..."
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarnDialog(false)}>
              Cancel
            </Button>
            <Button onClick={warnUser}>
              Issue Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Moderator Dialog */}
      <Dialog open={showAddModeratorDialog} onOpenChange={setShowAddModeratorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Moderator</DialogTitle>
            <DialogDescription>
              Enter the email address of the user you want to make a moderator
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Email address..."
              type="email"
              value={newModeratorEmail}
              onChange={(e) => setNewModeratorEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModeratorDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addModerator}>
              Add Moderator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Username Edit Dialog */}
      <UsernameEditDialog
        user={userToEditUsername}
        open={showEditUsernameDialog}
        onOpenChange={setShowEditUsernameDialog}
        onUserUpdated={(updatedUser) => {
          setUsers(prevUsers => 
            prevUsers.map(user => 
              user.user_id === updatedUser.user_id 
                ? { ...user, username: updatedUser.username }
                : user
            )
          );
          setUserToEditUsername(null);
        }}
      />

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete {userToAction?.username}'s account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for deletion</label>
              <Textarea
                placeholder="Reason for account deletion..."
                value={deleteAccountReason}
                onChange={(e) => setDeleteAccountReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAccountDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteAccount}>
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModeratorPanel;