import React, { useState, useRef, useEffect } from 'react';
import { useChat, Message } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Check, ChevronDown, Phone, Video, Paperclip, Send, Shield, X, Info, User, UserCheck, UserMinus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from './UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import CallModal from './CallModal';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const ChatWindow: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    currentConversation, 
    messages, 
    sendMessage, 
    uploadFile, 
    markAsRead, 
    reportMessage,
    startVideoCall,
    startVoiceCall,
    isCallActive,
    updateUserDescription,
    updateOnlineStatus,
    blockUser,
    unblockUser,
    hasNewMessages,
    getBlockedUsers
  } = useChat();
  
  const [newMessage, setNewMessage] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileDescription, setProfileDescription] = useState('');
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'away' | 'offline'>('online');
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showUserInfoDialog, setShowUserInfoDialog] = useState(false);
  const [profileTab, setProfileTab] = useState("info");
  const [blockedReason, setBlockedReason] = useState('');
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isModeratorUser = (user: { email?: string }) =>
    user.email === "vitorrossato812@gmail.com";

  useEffect(() => {
    if (currentUser?.email === 'vitorrossato812@gmail.com') {
      setIsModerator(true);
    } else {
      setIsModerator(false);
    }
    
    if (document.visibilityState === 'visible') {
      updateOnlineStatus('online');
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus('online');
      } else {
        updateOnlineStatus('offline');
      }
    };
    
    const handleUserActivity = () => {
      let timeout: NodeJS.Timeout;
      
      const resetTimeout = () => {
        if (timeout) clearTimeout(timeout);
        updateOnlineStatus('online');
        
        timeout = setTimeout(() => {
          updateOnlineStatus('away');
        }, 10 * 60 * 1000);
      };
      
      document.addEventListener('mousemove', resetTimeout);
      document.addEventListener('keydown', resetTimeout);
      document.addEventListener('click', resetTimeout);
      
      resetTimeout();
      
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousemove', resetTimeout);
        document.removeEventListener('keydown', resetTimeout);
        document.removeEventListener('click', resetTimeout);
      };
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const cleanup = handleUserActivity();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanup();
    };
  }, [currentUser, updateOnlineStatus]);
  
  useEffect(() => {
    const checkIfBlocked = async () => {
      if (!currentConversation || currentConversation.isGroupChat) return;

      try {
        const blockedUsers = await getBlockedUsers();
        const blockedEntry = blockedUsers.find(
          user => user.uid === currentConversation.participantsInfo[0]?.uid
        );
        setIsBlocked(!!blockedEntry);
        setBlockedReason(blockedEntry?.reason || '');
      } catch (error) {
        console.error("Error checking blocked status:", error);
      }
    };
    checkIfBlocked();
  }, [currentConversation, getBlockedUsers]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!messageContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };
    
    const container = messageContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      toast({
        title: "Cannot send message",
        description: "You have blocked this user. Unblock them to send messages.",
        variant: "destructive",
      });
      return;
    }
    
    if (newMessage.trim() && currentConversation) {
      console.log("Sending message to conversation:", currentConversation.id);
      sendMessage(newMessage, currentConversation.id);
      setNewMessage('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentConversation) {
      return;
    }
    
    if (isBlocked) {
      toast({
        title: "Cannot send files",
        description: "You have blocked this user. Unblock them to send files.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Unsupported file type",
        description: "Only image files are supported",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }
    
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }
    
    console.log("Uploading file:", file.name);
    uploadFile(file, currentConversation.id);
    e.target.value = '';
  };
  
  const getMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'HH:mm');
  };
  
  const handleReportMessage = (message: Message) => {
    reportMessage(message.id, 'Inappropriate content');
    toast({
      title: "Message reported",
      description: "This message has been reported to moderators",
    });
  };

  const handleBlockUser = () => {
    if (!currentConversation || currentConversation.isGroupChat) return;
    
    const userId = currentConversation.participantsInfo[0]?.uid;
    if (!userId) return;
    
    blockUser(userId)
      .then(() => {
        setIsBlocked(true);
        setShowBlockDialog(false);
        toast({
          title: "User blocked",
          description: "You will no longer receive messages from this user"
        });
      });
  };

  const handleUnblockUser = () => {
    if (!currentConversation || currentConversation.isGroupChat) return;
    
    const userId = currentConversation.participantsInfo[0]?.uid;
    if (!userId) return;
    
    unblockUser(userId)
      .then(() => {
        setIsBlocked(false);
        toast({
          title: "User unblocked",
          description: "You can now exchange messages with this user"
        });
      });
  };

  const handleUpdateProfile = () => {
    updateUserDescription(profileDescription);
    updateOnlineStatus(onlineStatus);
    setShowProfileDialog(false);
  };
  
  const handleAvatarClick = () => {
    if (!currentConversation || currentConversation.isGroupChat) {
      return;
    }
    
    setShowUserInfoDialog(true);
  };
  
  const getMessageStatus = (message: Message) => {
    if (message.senderId !== currentUser?.uid) return null;
    
    if (message.read) {
      return <span className="text-xs text-green-500 ml-1">read</span>;
    } else {
      return <span className="text-xs text-gray-500 ml-1">delivered</span>;
    }
  };
  
  if (!currentConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">Welcome to ChatNexus</h3>
          <p className="text-muted-foreground">Select a conversation or search for a user to start chatting</p>
        </div>
      </div>
    );
  }
  
  const isGroup = currentConversation.isGroupChat;
  const conversationName = isGroup && currentConversation.groupName 
    ? currentConversation.groupName 
    : currentConversation.participantsInfo[0]?.displayName || 'Chat';
  
  const otherUserIsModerator = !isGroup && 
    isModeratorUser(currentConversation.participantsInfo[0] || {});
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isCallActive && <CallModal />}
      
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-3">
          <div onClick={handleAvatarClick} className="cursor-pointer">
            <UserAvatar 
              username={
                isGroup && currentConversation.groupName 
                  ? currentConversation.groupName 
                  : currentConversation.participantsInfo[0]?.username
              } 
              photoURL={
                isGroup && currentConversation.groupPhotoURL 
                  ? currentConversation.groupPhotoURL 
                  : currentConversation.participantsInfo[0]?.photoURL
              }
            />
          </div>
          <div>
            <h2 className="font-semibold">{conversationName}</h2>
            {!isGroup && (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    @{currentConversation.participantsInfo[0]?.username}
                  </p>
                  {otherUserIsModerator && (
                    <Badge className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      <Shield className="h-3 w-3 mr-1" /> Moderator
                    </Badge>
                  )}
                  <span className={`h-2 w-2 rounded-full ${
                    currentConversation.participantsInfo[0]?.onlineStatus === 'online'
                      ? 'bg-green-500'
                      : currentConversation.participantsInfo[0]?.onlineStatus === 'away'
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                  }`}></span>
                </div>
                {currentConversation.participantsInfo[0]?.description && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    "{currentConversation.participantsInfo[0]?.description}"
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <ChevronDown className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                <User className="h-4 w-4 mr-2" /> Edit Profile
              </DropdownMenuItem>
              {!isGroup && !isBlocked && (
                <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>
                  <UserX className="h-4 w-4 mr-2" /> Block User
                </DropdownMenuItem>
              )}
              {!isGroup && isBlocked && (
                <DropdownMenuItem onClick={handleUnblockUser}>
                  <UserCheck className="h-4 w-4 mr-2" /> Unblock User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => startVoiceCall(currentConversation.id)}
            disabled={isBlocked}
            title={isBlocked ? "Unblock user to call" : "Voice call"}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => startVideoCall(currentConversation.id)}
            disabled={isBlocked}
            title={isBlocked ? "Unblock user to call" : "Video call"}
          >
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length > 0 ? (
          messages.map((message) => {
            const isOwnMessage = message.senderId === currentUser?.uid;
            const isModeratorMessage = isModerator && !isOwnMessage;
            
            if (!isOwnMessage && !message.read) {
              markAsRead(message.id);
            }
            
            return (
              <div 
                key={message.id} 
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
              >
                <div className="max-w-[80%] break-words">
                  {!isOwnMessage && !isGroup && (
                    <div className="flex items-center mb-1">
                      <UserAvatar 
                        username={
                          isModeratorUser(currentConversation.participantsInfo[0] || {}) 
                            ? "Moderator"
                            : currentConversation.participantsInfo[0]?.username
                        }
                        photoURL={
                          isModeratorUser(currentConversation.participantsInfo[0] || {}) 
                            ? undefined
                            : currentConversation.participantsInfo[0]?.photoURL
                        }
                        size="sm"
                      />
                      <span className="text-xs font-medium ml-2 flex items-center">
                        {isModeratorUser(currentConversation.participantsInfo[0] || {}) ? (
                          <>
                            <span>Moderator</span>
                            <Badge className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              <Shield className="h-3 w-3" />
                            </Badge>
                          </>
                        ) : (
                          currentConversation.participantsInfo[0]?.displayName
                        )}
                      </span>
                    </div>
                  )}
                  
                  {isGroup && !isOwnMessage && (
                    <div className="flex items-center mb-1">
                      <UserAvatar 
                        username="User" // This would need to be fetched from the user's info
                        size="sm" 
                      />
                      <span className="text-xs font-medium ml-2">
                        User Name  {/* This would need to be fetched from the user's info */}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-end gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isOwnMessage ? "end" : "start"} className="dropdown-menu">
                        {!isOwnMessage && (
                          <DropdownMenuItem onClick={() => handleReportMessage(message)}>
                            Report message
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <div
                      className={cn(
                        "chat-bubble group",
                        isOwnMessage 
                          ? "chat-bubble-sent" 
                          : isModeratorMessage 
                            ? "chat-bubble-moderator bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                            : "chat-bubble-received"
                      )}
                    >
                      {message.fileURL ? (
                        <div className="space-y-2">
                          <a 
                            href={message.fileURL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 underline"
                          >
                            <Paperclip className="h-4 w-4" />
                            {message.fileName || "Attachment"}
                          </a>
                          {message.fileType?.startsWith('image/') && (
                            <img 
                              src={message.fileURL} 
                              alt="Attachment" 
                              className="rounded-md max-h-60 max-w-full object-contain"
                            />
                          )}
                        </div>
                      ) : (
                        message.content
                      )}
                      
                      <div className="text-right">
                        <span className="message-time inline-block mt-1">
                          {getMessageTime(message.timestamp)}
                          {isOwnMessage && getMessageStatus(message)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {showScrollButton && (
        <Button
          size="icon"
          className="absolute bottom-20 right-8 rounded-full shadow-md"
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      )}
      
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBlocked}
          >
            <Paperclip className="h-5 w-5" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isBlocked}
            />
          </Button>

          <Textarea
            placeholder={isBlocked ? `You have blocked this user${blockedReason ? ": " + blockedReason : ""}` : "Type a message..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-0 search-input bg-background text-foreground"
            rows={1}
            disabled={isBlocked}
          />

          <Button type="submit" size="icon" disabled={!newMessage.trim() || isBlocked}>
            <Send className="h-5 w-5" />
          </Button>
        </form>

        {isBlocked && (
          <div className="text-center mt-2 text-sm text-destructive">
            <UserX className="inline-block h-4 w-4 mr-1" /> 
            You have blocked this user
            {blockedReason && (
              <span className="ml-2 italic">{blockedReason}</span>
            )}
            <Button 
              variant="link" 
              size="sm" 
              onClick={handleUnblockUser}
              className="ml-2"
            >
              Unblock
            </Button>
          </div>
        )}
      </div>
      
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Your Profile</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="info" onValueChange={setProfileTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="info">
                <Info className="h-4 w-4 mr-2" />
                Information
              </TabsTrigger>
              <TabsTrigger value="description">
                <User className="h-4 w-4 mr-2" />
                Description
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-image">Profile Image</Label>
                <Input 
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      toast({
                        title: "File upload not available",
                        description: "Profile picture upload is not yet supported. Please connect Supabase.",
                        variant: "destructive"
                      });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Upload a new profile image</p>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <RadioGroup 
                  defaultValue={onlineStatus} 
                  onValueChange={(value) => setOnlineStatus(value as 'online' | 'away' | 'offline')}
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="flex items-center">
                      <UserCheck className="h-4 w-4 text-green-500 mr-2" />
                      Online
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="away" id="away" />
                    <Label htmlFor="away" className="flex items-center">
                      <UserMinus className="h-4 w-4 text-yellow-500 mr-2" />
                      Away
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="offline" id="offline" />
                    <Label htmlFor="offline" className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      Offline
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Status is automatically updated based on your activity.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="description" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Profile Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add a short description about yourself"
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">This will be visible to other users</p>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateProfile}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p>
              Are you sure you want to block {currentConversation.participantsInfo[0]?.displayName || 'this user'}?
              You will no longer receive messages from them.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlockUser}>
              <UserX className="mr-2 h-4 w-4" />
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showUserInfoDialog} onOpenChange={setShowUserInfoDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          
          {!isGroup && currentConversation.participantsInfo[0] && (
            <div className="py-4">
              <div className="flex justify-center mb-4">
                <UserAvatar 
                  username={currentConversation.participantsInfo[0].username} 
                  photoURL={currentConversation.participantsInfo[0].photoURL}
                  size="lg"
                />
              </div>
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium">
                  {currentConversation.participantsInfo[0].displayName}
                  {otherUserIsModerator && (
                    <Badge className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      <Shield className="h-3 w-3 mr-1" /> Moderator
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  @{currentConversation.participantsInfo[0].username}
                </p>
              </div>
              
              {currentConversation.participantsInfo[0].description && (
                <div className="border-t border-b py-4 my-4">
                  <p className="text-sm italic">
                    "{currentConversation.participantsInfo[0].description}"
                  </p>
                </div>
              )}
              
              <div className="flex justify-center space-x-4 mt-4">
                {!isBlocked ? (
                  <Button variant="outline" onClick={() => {
                    setShowUserInfoDialog(false);
                    setShowBlockDialog(true);
                  }}>
                    <UserX className="mr-2 h-4 w-4" /> Block User
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => {
                    handleUnblockUser();
                    setShowUserInfoDialog(false);
                  }}>
                    <UserCheck className="mr-2 h-4 w-4" /> Unblock User
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {hasNewMessages && (
        <div className="fixed bottom-4 right-4 bg-teams-purple text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          You have new messages
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
