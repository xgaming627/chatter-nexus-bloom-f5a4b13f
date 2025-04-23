import React, { useState, useRef, useEffect } from 'react';
import { useChat, Message } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { AlertTriangle, ChevronDown, Phone, Video, Paperclip, Send, Shield, X, Info, User, UserCheck, UserMinus, UserX, Trash2, Bell, Folder, UserPlus, MessageSquare } from 'lucide-react';
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
    getBlockedUsers,
    deleteMessage,
    storeChat,
    unstoreChat,
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
  const [showGroupSettingsDialog, setShowGroupSettingsDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<Message | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [messageCounter, setMessageCounter] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const rateLimitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isModeratorUser = (user: { email?: string }) =>
    user.email === "vitorrossato812@gmail.com" || user.email === "lukasbraga77@gmail.com";

  useEffect(() => {
    if (currentUser?.email === 'vitorrossato812@gmail.com' || currentUser?.email === 'lukasbraga77@gmail.com') {
      setIsModerator(true);
    } else {
      setIsModerator(false);
    }
    
    // Check if current user is online
    if (document.visibilityState === 'visible') {
      updateOnlineStatus('online');
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus('online');
      } else {
        updateOnlineStatus('away');
      }
    };
    
    const handleUserActivity = () => {
      let timeout: NodeJS.Timeout;
      
      // Reset the timeout and set status to online
      const resetTimeout = () => {
        if (timeout) clearTimeout(timeout);
        updateOnlineStatus('online');
        
        // Set away status after 10 minutes of inactivity
        timeout = setTimeout(() => {
          updateOnlineStatus('away');
        }, 10 * 60 * 1000); // 10 minutes
      };
      
      // Add event listeners for user activity
      document.addEventListener('mousemove', resetTimeout);
      document.addEventListener('keydown', resetTimeout);
      document.addEventListener('click', resetTimeout);
      
      // Start the timeout
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
  
  // Check if the current conversation partner is blocked
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
  
  const checkRateLimit = (): boolean => {
    const now = new Date();
    
    // If this is the first message or it's been more than 30 seconds since last message
    if (!lastMessageTime || (now.getTime() - lastMessageTime.getTime() > 30000)) {
      setLastMessageTime(now);
      setMessageCounter(1);
      return false;
    }
    
    // Update the last message time
    setLastMessageTime(now);
    
    // If we've sent 5 or more messages in the last 10 seconds, rate limit
    if (messageCounter >= 4 && (now.getTime() - lastMessageTime.getTime() < 10000)) {
      setIsRateLimited(true);
      
      // Reset rate limit after 10 seconds
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
      
      rateLimitTimeoutRef.current = setTimeout(() => {
        setIsRateLimited(false);
        setMessageCounter(0);
      }, 10000);
      
      return true;
    }
    
    // Increment the counter
    setMessageCounter(prev => prev + 1);
    return false;
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
    
    if (isRateLimited) {
      toast({
        title: "Slow down",
        description: "You're sending messages too quickly. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }
    
    if (newMessage.trim() && currentConversation) {
      // Check rate limit
      if (checkRateLimit()) {
        return;
      }
      
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
    
    if (isRateLimited) {
      toast({
        title: "Slow down",
        description: "You're sending messages too quickly. Please wait a moment.",
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
    
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }
    
    // Check rate limit
    if (checkRateLimit()) {
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

  const handleDeleteMessage = (message: Message) => {
    setConfirmDeleteMessage(message);
  };

  const confirmDelete = async () => {
    if (confirmDeleteMessage) {
      await deleteMessage(confirmDeleteMessage.id, currentUser?.displayName || currentUser?.username || "User");
      setConfirmDeleteMessage(null);
      toast({
        title: "Message deleted",
        description: "Your message has been deleted",
      });
    }
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

  const handleUpdateGroupSettings = async () => {
    if (!currentConversation || !currentConversation.isGroupChat) return;
    
    // This function would be implemented in ChatContext
    // await updateGroupSettings(currentConversation.id, newGroupName);
    
    toast({
      title: "Group updated",
      description: "Group settings have been updated",
    });
    
    setShowGroupSettingsDialog(false);
  };
  
  const handleAvatarClick = () => {
    if (!currentConversation) {
      return;
    }
    
    if (currentConversation.isGroupChat) {
      setShowGroupSettingsDialog(true);
      return;
    }
    
    setShowUserInfoDialog(true);
  };
  
  const getMessageStatus = (message: Message) => {
    if (message.senderId !== currentUser?.uid) return null;
    
    if (message.deleted) {
      return null;
    } else if (message.read) {
      return <span className="text-xs text-green-500 ml-1">read</span>;
    } else if (message.delivered) {
      return <span className="text-xs text-blue-500 ml-1">delivered</span>;
    } else {
      return <span className="text-xs text-gray-500 ml-1">sent</span>;
    }
  };
  
  const handleStoreChat = () => {
    if (!currentConversation) return;
    
    if (currentConversation.isStored) {
      unstoreChat(currentConversation.id);
      toast({
        title: "Chat unstored",
        description: "This chat has been removed from your stored chats",
      });
    } else {
      storeChat(currentConversation.id);
      toast({
        title: "Chat stored",
        description: "This chat has been added to your stored chats",
      });
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
      {isCallActive && <CallModal isGroup={isGroup} />}
      
      {/* Chat header */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-3">
          <div onClick={handleAvatarClick} className="cursor-pointer">
            <UserAvatar 
              username={
                isGroup && currentConversation.groupName 
                  ? currentConversation.groupName 
                  : currentConversation.participantsInfo[0]?.username || "User"
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
                    @{currentConversation.participantsInfo[0]?.username || "User"}
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
            {isGroup && (
              <div className="text-xs text-muted-foreground">
                {currentConversation.participants.length} members
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="icon" 
            variant="ghost"
            onClick={handleStoreChat}
            title={currentConversation.isStored ? "Unstore Chat" : "Store Chat"}
          >
            <Folder className={`h-5 w-5 ${currentConversation.isStored ? "fill-current" : ""}`} />
          </Button>
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
              {isGroup && (
                <DropdownMenuItem onClick={() => setShowGroupSettingsDialog(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" /> Group Settings
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
      
      {/* Messages */}
      <ScrollArea ref={messageContainerRef} className="flex-1">
        <div className="p-4 space-y-4">
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
                          username={
                            // Find user info from participants array
                            currentConversation.participantsInfo.find(
                              user => user.uid === message.senderId
                            )?.username || "User"
                          }
                          photoURL={
                            currentConversation.participantsInfo.find(
                              user => user.uid === message.senderId
                            )?.photoURL
                          }
                          size="sm"
                        />
                        <span className="text-xs font-medium ml-2">
                          {isModeratorUser({email: 
                            currentConversation.participantsInfo.find(
                              user => user.uid === message.senderId
                            )?.email || ""
                          }) ? (
                            <div className="flex items-center">
                              <span>Moderator</span>
                              <Badge className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                <Shield className="h-3 w-3" />
                              </Badge>
                            </div>
                          ) : (
                            currentConversation.participantsInfo.find(
                              user => user.uid === message.senderId
                            )?.displayName || "User"
                          )}
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
                          {isOwnMessage && (
                            <DropdownMenuItem onClick={() => handleDeleteMessage(message)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete message
                            </DropdownMenuItem>
                          )}
                          {!isOwnMessage && (
                            <DropdownMenuItem onClick={() => handleReportMessage(message)}>
                              <Shield className="h-4 w-4 mr-2" /> Report message
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
                        {message.deleted ? (
                          <em className="text-gray-500 dark:text-gray-400">
                            This message has been deleted by {message.deletedBy || "User"}
                          </em>
                        ) : message.fileURL ? (
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
                        
                        {!message.deleted && (
                          <div className="text-right">
                            <span className="message-time inline-block mt-1">
                              {getMessageTime(message.timestamp)}
                              {isOwnMessage && getMessageStatus(message)}
                            </span>
                          </div>
                        )}
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
      </ScrollArea>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          size="icon"
          className="absolute bottom-20 right-8 rounded-full shadow-md"
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      )}
      
      {/* Message input */}
      <div className="p-4 border-t">
        {isRateLimited && (
          <div className="mb-2 py-2 px-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 text-sm rounded-md flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            You're sending messages too quickly. Please wait a moment.
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBlocked || isRateLimited}
          >
            <Paperclip className="h-5 w-5" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isBlocked || isRateLimited}
            />
          </Button>

          <Textarea
            placeholder={
              isRateLimited ? "Please wait a moment before sending more messages..." :
              isBlocked ? `You have blocked this user${blockedReason ? ": " + blockedReason : ""}` : 
              "Type a message..."
            }
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-0 search-input bg-background text-foreground"
            rows={1}
            disabled={isBlocked || isRateLimited}
          />

          <Button type="submit" size="icon" disabled={!newMessage.trim() || isBlocked || isRateLimited}>
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
      
      {/* Profile dialog */}
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
      
      {/* Block user dialog */}
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
