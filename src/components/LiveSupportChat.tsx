
import React, { useState, useRef, useEffect } from 'react';
import { useLiveSupport } from '@/context/LiveSupportContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from './UserAvatar';
import { toast } from '@/hooks/use-toast';

const LiveSupportChat: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    currentSupportSession,
    supportMessages,
    sendSupportMessage,
    requestEndSupport,
    forceEndSupport,
  } = useLiveSupport();
  
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
    console.log("Support messages updated:", supportMessages);
  }, [supportMessages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() && currentSupportSession) {
      console.log("Sending support message:", newMessage);
      sendSupportMessage(newMessage);
      setNewMessage('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };
  
  const getMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'HH:mm');
  };
  
  const handleRequestEndSupport = () => {
    requestEndSupport();
    toast({
      title: "End request sent",
      description: "Waiting for user to confirm end of support session"
    });
  };
  
  const handleForceEndSupport = () => {
    forceEndSupport();
    toast({
      title: "Support session ended",
      description: "This support session has been closed"
    });
  };
  
  if (!currentUser || !currentSupportSession) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No support session selected</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Control buttons */}
      <div className="p-2 border-b flex justify-between">
        <div>
          <span className="text-sm font-medium">
            Support Session {currentSupportSession.id.slice(0, 8)}...
          </span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRequestEndSupport}
          >
            Request End
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleForceEndSupport}
          >
            <X className="h-4 w-4 mr-1" />
            Force End
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {supportMessages.length > 0 ? (
          supportMessages.map((message) => {
            const isOwnMessage = message.sender_id === currentUser?.uid;
            const isSystemMessage = message.sender_role === 'system';
            const isUserMessage = message.sender_role === 'user';
            
            return (
              <div 
                key={message.id} 
                className={`flex ${isSystemMessage ? 'justify-center' : isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`${isSystemMessage ? 'bg-muted text-muted-foreground text-center py-2 px-4 rounded-md text-sm w-full' : 'max-w-[80%] break-words'}`}>
                  {!isOwnMessage && !isSystemMessage && (
                    <div className="flex items-center mb-1">
                      <UserAvatar 
                        username={isUserMessage ? currentSupportSession.userInfo?.username || "User" : "Support"} 
                        photoURL={isUserMessage ? currentSupportSession.userInfo?.photo_url : undefined}
                        size="sm" 
                      />
                      <span className="text-xs font-medium ml-2">
                        {isUserMessage 
                          ? currentSupportSession.userInfo?.display_name || "User" 
                          : "Support Agent"}
                      </span>
                    </div>
                  )}
                  
                  {!isSystemMessage && (
                    <div className={`chat-bubble ${isOwnMessage ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                      {message.content}
                      
                      <div className="text-right">
                        <span className="message-time inline-block mt-1">
                          {getMessageTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {isSystemMessage && <div>{message.content}</div>}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground">
            No messages in this support session yet.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t mt-auto">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-0"
            rows={2}
          />
          
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LiveSupportChat;
