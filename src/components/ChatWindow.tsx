
import React, { useState, useRef, useEffect } from 'react';
import { useChat, Message } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Check, ChevronDown, Phone, Video, Paperclip, Send } from 'lucide-react';
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
    isCallActive
  } = useChat();
  
  const [newMessage, setNewMessage] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
    if (file && currentConversation) {
      uploadFile(file, currentConversation.id);
      e.target.value = '';
    }
  };
  
  const getMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'HH:mm');
  };
  
  const handleReportMessage = (message: Message) => {
    reportMessage(message.id, 'Inappropriate content');
  };
  
  if (!currentConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">Welcome to ChatNexus</h3>
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
              <p className="text-xs text-muted-foreground">
                @{currentConversation.participantsInfo[0]?.username}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            
            // Mark message as read if it's not our own and not read yet
            if (!isOwnMessage && !message.read) {
              markAsRead(message.id);
            }
            
            return (
              <div 
                key={message.id} 
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[80%] break-words">
                  {!isOwnMessage && !isGroup && (
                    <div className="flex items-center mb-1">
                      <UserAvatar 
                        username={currentConversation.participantsInfo[0]?.username} 
                        photoURL={currentConversation.participantsInfo[0]?.photoURL} 
                        size="sm" 
                      />
                      <span className="text-xs font-medium ml-2">
                        {currentConversation.participantsInfo[0]?.displayName}
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
                      <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
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
                        isOwnMessage ? "chat-bubble-sent" : "chat-bubble-received"
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
              className="hidden"
              onChange={handleFileUpload}
            />
          </Button>
          
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-0"
            rows={1}
          />
          
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
