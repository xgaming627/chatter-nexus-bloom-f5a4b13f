
import React, { useState, useRef, useEffect } from 'react';
import { useChat, Message } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Check, ChevronDown, Phone, Video, Paperclip, Send, ShieldCheck, X } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
    hasNewMessages
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
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if user is a moderator
  useEffect(() => {
    if (currentUser?.email === 'vitorrossato812@gmail.com') {
      setIsModerator(true);
    } else {
      setIsModerator(false);
    }
  }, [currentUser]);
  
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
    
    // Check file type - only allow images
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Unsupported file type",
        description: "Only image files are supported",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }
    
    // Check file size (limit to 5MB)
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
        setShowBlockDialog(false);
        toast({
          title: "User blocked",
          description: "You will no longer receive messages from this user"
        });
      });
  };

  const handleUpdateProfile = () => {
    updateUserDescription(profileDescription);
    updateOnlineStatus(onlineStatus);
    setShowProfileDialog(false);
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
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isCallActive && <CallModal />}
      
      {/* Chat header */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-3">
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
          <div>
            <h2 className="font-semibold">{conversationName}</h2>
            {!isGroup && (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    @{currentConversation.participantsInfo[0]?.username}
                  </p>
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
              <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>Edit Profile</DropdownMenuItem>
              {!isGroup && <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>Block User</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="icon" variant="ghost" onClick={() => startVoiceCall(currentConversation.id)}>
            <Phone className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => startVideoCall(currentConversation.id)}>
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length > 0 ? (
          messages.map((message) => {
            const isOwnMessage = message.senderId === currentUser?.uid;
            const isModeratorMessage = isModerator && !isOwnMessage;
            
            // Mark message as read if it's not our own and not read yet
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
                          isModeratorMessage 
                            ? "Moderator"
                            : currentConversation.participantsInfo[0]?.username
                        } 
                        photoURL={
                          isModeratorMessage 
                            ? undefined
                            : currentConversation.participantsInfo[0]?.photoURL
                        } 
                        size="sm" 
                      />
                      <span className="text-xs font-medium ml-2 flex items-center">
                        {isModeratorMessage ? (
                          <>
                            <ShieldCheck className="h-3 w-3 mr-1 text-blue-600" />
                            Moderator
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
                          {isOwnMessage && (
                            <span className="ml-1">
                              {message.read ? (
                                <Check className="h-3 w-3 inline text-green-500" />
                              ) : (
                                <Check className="h-3 w-3 inline text-muted-foreground" />
                              )}
                            </span>
                          )}
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
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </Button>
          
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-0 search-input bg-background text-foreground"
            rows={1}
          />
          
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
      
      {/* Profile dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Your Profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Profile Description</Label>
              <Textarea
                id="description"
                placeholder="Add a short description about yourself"
                value={profileDescription}
                onChange={(e) => setProfileDescription(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">This will be visible to other users</p>
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
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    Online
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="away" id="away" />
                  <Label htmlFor="away" className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></span>
                    Away
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="offline" id="offline" />
                  <Label htmlFor="offline" className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-gray-400 mr-2"></span>
                    Offline
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
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
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlockUser}>
              <X className="mr-2 h-4 w-4" />
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New message notification */}
      {hasNewMessages && (
        <div className="fixed bottom-4 right-4 bg-teams-purple text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          You have new messages
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
