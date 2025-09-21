import React, { useState, useRef, useEffect } from 'react';
import { useChat, Message } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { 
  AlertTriangle, 
  ChevronDown, 
  Phone, 
  Video, 
  Paperclip, 
  Send, 
  Shield, 
  X, 
  Info, 
  User, 
  UserCheck, 
  UserMinus, 
  UserX, 
  Trash2, 
  Bell, 
  Folder, 
  UserPlus, 
  MessageSquare,
  LogOut,
  Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from './UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
    deleteChat,
    leaveChat,
    addMemberToChat,
    removeMemberFromChat,
    isRateLimited
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
  
  const [showDeleteChatDialog, setShowDeleteChatDialog] = useState(false);
  const [showLeaveChatDialog, setShowLeaveChatDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isModeratorUser = (user: { email?: string; uid?: string }) => {
    // Check by UID since we restricted email access
    const moderatorUIDs = [
      // Add known moderator UIDs here - this would need to be configured per deployment
    ];
    
    // Fallback to email check for now
    return user?.email === "vitorrossato812@gmail.com" || user?.email === "lukasbraga77@gmail.com";
  };

  useEffect(() => {
    if (currentUser?.email === 'vitorrossato812@gmail.com' || currentUser?.email === 'lukasbraga77@gmail.com') {
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
        updateOnlineStatus('away');
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
      if (!currentConversation || !currentConversation.participantsInfo || currentConversation.isGroupChat) return;

      try {
        const blockedUsers = await getBlockedUsers();
        if (currentConversation.participantsInfo && currentConversation.participantsInfo.length > 0) {
          const blockedEntry = blockedUsers.find(
            user => user.uid === currentConversation.participantsInfo[0]?.uid
          );
          setIsBlocked(!!blockedEntry);
          setBlockedReason(blockedEntry?.reason || '');
        }
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
    
    if (isRateLimited) {
      toast({
        title: "Slow down",
        description: "Please wait 2 seconds between messages.",
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
    
    if (isRateLimited) {
      toast({
        title: "Slow down",
        description: "You're sending messages too quickly. Please wait 2 seconds between messages.",
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
      return <span className="text-xs text-green-500 ml-1">✓✓</span>;
    } else if (message.delivered) {
      return <span className="text-xs text-blue-500 ml-1">✓</span>;
    } else {
      return <span className="text-xs text-gray-500 ml-1">⏱</span>;
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
  
  const handleDeleteChat = async () => {
    if (!currentConversation) return;
    
    try {
      await deleteChat(currentConversation.id);
      setShowDeleteChatDialog(false);
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };
  
  const handleLeaveChat = async () => {
    if (!currentConversation) return;
    
    try {
      await leaveChat(currentConversation.id);
      setShowLeaveChatDialog(false);
    } catch (error) {
      console.error("Error leaving chat:", error);
    }
  };
  
  const handleAddMember = async () => {
    if (!currentConversation || !newMemberUsername.trim()) return;
    
    try {
      const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
      
      await addMemberToChat(currentConversation.id, userId);
      setShowAddMemberDialog(false);
      setNewMemberUsername('');
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };
  
  const handleRemoveMember = async () => {
    if (!currentConversation || !memberToRemove) return;
    
    try {
      await removeMemberFromChat(currentConversation.id, memberToRemove);
      setShowRemoveMemberDialog(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error("Error removing member:", error);
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
  
  const participantsInfo = currentConversation.participantsInfo || [];
  const isGroup = currentConversation.isGroupChat;
  const conversationName = isGroup && currentConversation.groupName 
    ? currentConversation.groupName 
    : (participantsInfo.length > 0 && participantsInfo[0] ? participantsInfo[0]?.displayName : 'Chat');
  
  const otherUserIsModerator = !isGroup && 
    participantsInfo.length > 0 && participantsInfo[0] && isModeratorUser(participantsInfo[0]);
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isCallActive && <CallModal isGroup={isGroup} />}
      
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-3">
          <div onClick={handleAvatarClick} className="cursor-pointer">
            <UserAvatar 
              username={
                isGroup && currentConversation.groupName 
                  ? currentConversation.groupName 
                  : (participantsInfo.length > 0 && participantsInfo[0] ? participantsInfo[0]?.username : "User")
              } 
              photoURL={
                isGroup && currentConversation.groupPhotoURL 
                  ? currentConversation.groupPhotoURL 
                  : (participantsInfo.length > 0 && participantsInfo[0] ? participantsInfo[0]?.photoURL : undefined)
              }
            />
          </div>
          <div>
            <h2 className="font-semibold">{conversationName}</h2>
            {!isGroup && participantsInfo.length > 0 && participantsInfo[0] && (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    @{participantsInfo[0]?.username || "User"}
                  </p>
                  {otherUserIsModerator && (
                    <Badge className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      <Shield className="h-3 w-3 mr-1" /> Moderator
                    </Badge>
                  )}
                  <span className={`h-2 w-2 rounded-full ${
                    participantsInfo[0]?.onlineStatus === 'online'
                      ? 'bg-green-500'
                      : participantsInfo[0]?.onlineStatus === 'away'
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                  }`}></span>
                </div>
                {participantsInfo[0]?.description && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    "{participantsInfo[0]?.description}"
                  </p>
                )}
              </>
            )}
            {isGroup && (
              <div className="text-xs text-muted-foreground">
                {currentConversation.participants ? currentConversation.participants.length : 0} members
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
              
              {!isGroup && !isBlocked && participantsInfo.length > 0 && participantsInfo[0] && (
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
                <>
                  <DropdownMenuItem onClick={() => setShowGroupSettingsDialog(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" /> Group Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setShowAddMemberDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" /> Add Member
                  </DropdownMenuItem>
                  
                  {currentConversation.created_by === currentUser?.uid && (
                    <DropdownMenuItem onClick={() => setShowRemoveMemberDialog(true)}>
                      <UserMinus className="h-4 w-4 mr-2" /> Remove Member
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={() => setShowLeaveChatDialog(true)}>
                    <LogOut className="h-4 w-4 mr-2" /> Leave Chat
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => setShowDeleteChatDialog(true)}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Chat
              </DropdownMenuItem>
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
      
      <ScrollArea ref={messageContainerRef} className="flex-1">
        <div className="p-4 space-y-4">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isOwnMessage = message.senderId === currentUser?.uid;
              const isModeratorMessage = isModerator && !isOwnMessage;
              const isSystemMessage = message.senderId === "system" || message.is_system_message;
              
              if (!isOwnMessage && !message.read && !isSystemMessage) {
                markAsRead(message.id);
              }
              
              if (isSystemMessage) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full text-xs text-center text-gray-600 dark:text-gray-300">
                      {message.content}
                    </div>
                  </div>
                );
              }
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className="max-w-[80%] break-words">
                    {!isOwnMessage && !isGroup && participantsInfo.length > 0 && participantsInfo[0] && (
                      <div className="flex items-center mb-1">
                        <UserAvatar 
                          username={
                            isModeratorUser(participantsInfo[0]) 
                              ? "Moderator"
                              : participantsInfo[0]?.username
                          }
                          photoURL={
                            isModeratorUser(participantsInfo[0]) 
                              ? undefined
                              : participantsInfo[0]?.photoURL
                          }
                          size="sm"
                        />
                        <span className="text-xs font-medium ml-2 flex items-center">
                          {isModeratorUser(participantsInfo[0]) ? (
                            <>
                              <span>Moderator</span>
                              <Badge className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                <Shield className="h-3 w-3" />
                              </Badge>
                            </>
                          ) : (
                            participantsInfo[0]?.displayName
                          )}
                        </span>
                      </div>
                    )}
                    
                    {isGroup && !isOwnMessage && (
                      <div className="flex items-center mb-1">
                        <UserAvatar 
                          username={
                            currentConversation.participantsInfo?.find(
                              user => user?.uid === message.senderId
                            )?.username || "User"
                          }
                          photoURL={
                            currentConversation.participantsInfo?.find(
                              user => user?.uid === message.senderId
                            )?.photoURL
                          }
                          size="sm"
                        />
                        <span className="text-xs font-medium ml-2">
                          {currentConversation.participantsInfo && isModeratorUser({email: 
                            currentConversation.participantsInfo.find(
                              user => user?.uid === message.senderId
                            )?.email || ""
                          }) ? (
                            <div className="flex items-center">
                              <span>Moderator</span>
                              <Badge className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                <Shield className="h-3 w-3" />
                              </Badge>
                            </div>
                          ) : (
                            currentConversation.participantsInfo?.find(
                              user => user?.uid === message.senderId
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
        {isRateLimited && (
          <div className="mb-2 py-2 px-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 text-sm rounded-md flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            You're sending messages too quickly. Please wait 2 seconds between messages.
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
              isRateLimited ? "Please wait 2 seconds between messages..." :
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
                      <UserX className="h-4 w-4 text-gray-500 mr-2" />
                      Offline
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
            
            <TabsContent value="description" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">About me</Label>
                <Textarea
                  id="description"
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  placeholder="Tell others about yourself..."
                  className="min-h-[100px]"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              Are you sure you want to block this user? You will no longer receive messages from them.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="block-reason">Reason (optional)</Label>
              <Textarea
                id="block-reason"
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="Why are you blocking this user?"
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlockUser}>Block User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showUserInfoDialog} onOpenChange={setShowUserInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Information</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {participantsInfo.length > 0 && participantsInfo[0] && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <UserAvatar 
                    username={participantsInfo[0]?.username || "User"}
                    photoURL={participantsInfo[0]?.photoURL}
                    size="lg"
                  />
                  <div>
                    <h3 className="font-semibold">{participantsInfo[0]?.displayName}</h3>
                    <p className="text-sm text-muted-foreground">@{participantsInfo[0]?.username}</p>
                    {otherUserIsModerator && (
                      <Badge className="mt-1">Moderator</Badge>
                    )}
                  </div>
                </div>
                
                {participantsInfo[0]?.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">About</h4>
                    <p className="text-sm text-muted-foreground italic">"{participantsInfo[0].description}"</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      participantsInfo[0]?.onlineStatus === 'online'
                        ? 'bg-green-500'
                        : participantsInfo[0]?.onlineStatus === 'away'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                    }`}></span>
                    <span className="text-sm">
                      {participantsInfo[0]?.onlineStatus === 'online'
                        ? 'Online'
                        : participantsInfo[0]?.onlineStatus === 'away'
                        ? 'Away'
                        : 'Offline'
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            {!isBlocked ? (
              <Button variant="destructive" onClick={() => {
                setShowUserInfoDialog(false);
                setShowBlockDialog(true);
              }}>
                <UserX className="h-4 w-4 mr-2" /> Block User
              </Button>
            ) : (
              <Button variant="outline" onClick={() => {
                handleUnblockUser();
                setShowUserInfoDialog(false);
              }}>
                <UserCheck className="h-4 w-4 mr-2" /> Unblock User
              </Button>
            )}
            <Button onClick={() => setShowUserInfoDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showGroupSettingsDialog} onOpenChange={setShowGroupSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={newGroupName || (currentConversation?.groupName || '')}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Members</Label>
              <div className="border rounded-md p-2 max-h-[200px] overflow-y-auto">
                {currentConversation?.participantsInfo?.map((participant) => (
                  <div key={participant.uid} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <UserAvatar username={participant.username || "User"} photoURL={participant.photoURL} size="sm" />
                      <span>{participant.displayName || participant.username}</span>
                    </div>
                    
                    {currentConversation.created_by === currentUser?.uid && 
                      participant.uid !== currentUser?.uid && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setMemberToRemove(participant.uid);
                            setShowRemoveMemberDialog(true);
                            setShowGroupSettingsDialog(false);
                          }}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupSettingsDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateGroupSettings}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteMessage} onOpenChange={(open) => !open && setConfirmDeleteMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteMessage(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDeleteChatDialog} onOpenChange={setShowDeleteChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? All messages will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteChatDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteChat}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showLeaveChatDialog} onOpenChange={setShowLeaveChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this group chat? You will need to be added back by another member to rejoin.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveChatDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleLeaveChat}>Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Enter the username of the person you want to add to this group.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-username">Username</Label>
              <Input
                id="member-username"
                value={newMemberUsername}
                onChange={(e) => setNewMemberUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>Cancel</Button>
            <Button onClick={handleAddMember}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showRemoveMemberDialog} onOpenChange={setShowRemoveMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the group?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {currentConversation?.participantsInfo?.find(p => p.uid === memberToRemove) && (
              <div className="flex items-center gap-2">
                <UserAvatar 
                  username={currentConversation.participantsInfo.find(p => p.uid === memberToRemove)?.username || "User"}
                  photoURL={currentConversation.participantsInfo.find(p => p.uid === memberToRemove)?.photoURL}
                />
                <span>
                  {currentConversation.participantsInfo.find(p => p.uid === memberToRemove)?.displayName || 
                   currentConversation.participantsInfo.find(p => p.uid === memberToRemove)?.username}
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveMemberDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveMember}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatWindow;
