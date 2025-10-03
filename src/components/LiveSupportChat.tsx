
import React, { useState, useRef, useEffect } from 'react';
import { useLiveSupport } from '@/context/LiveSupportContext';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useMessageLimiter } from '@/hooks/useMessageLimiter';
import { format } from 'date-fns';
import { X, Send, Clock, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from './UserAvatar';
import LiveSupportEndDialog from './LiveSupportEndDialog';
import FeedbackDialog from './FeedbackDialog';
import { CallButton } from './LiveKitRoom';
import { toast } from '@/hooks/use-toast';

const LiveSupportChat: React.FC = () => {
  const { currentUser } = useAuth();
  const { isModerator } = useRole();
  const { 
    currentSupportSession,
    supportMessages,
    sendSupportMessage,
    requestEndSupport,
    forceEndSupport,
  } = useLiveSupport();
  
  const [newMessage, setNewMessage] = useState('');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Message rate limiting
  const messageLimiter = useMessageLimiter({
    maxMessages: 10, // 10 messages per minute for support
    timeWindowMs: 60000,
    cooldownMs: 60000 // 1 minute cooldown
  });
  
  useEffect(() => {
    scrollToBottom();
    console.log("Support messages updated:", supportMessages);
  }, [supportMessages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageLimiter.canSendMessage) {
      const remainingTime = messageLimiter.getRemainingCooldown();
      toast({
        title: "Message limit reached",
        description: remainingTime > 0 
          ? `Please wait ${remainingTime} seconds before sending another message.`
          : `You can send ${messageLimiter.maxMessages - messageLimiter.messagesInWindow} more messages this minute.`,
        variant: "destructive"
      });
      return;
    }
    
    if (newMessage.trim() && currentSupportSession) {
      console.log("Sending support message:", newMessage);
      sendSupportMessage(newMessage);
      messageLimiter.recordMessage();
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
    if (isModerator) {
      requestEndSupport();
    }
  };
  
  const handleForceEndSupport = () => {
    if (isModerator) {
      forceEndSupport();
    }
  };

  // Show end dialog when session is requested to end and user is not a moderator
  useEffect(() => {
    if (currentSupportSession?.status === 'requested-end' && !isModerator) {
      setShowEndDialog(true);
    } else {
      setShowEndDialog(false);
    }
  }, [currentSupportSession?.status, isModerator]);

      // Show feedback dialog only once when session ends for users and hasn't been rated
      useEffect(() => {
        if (currentSupportSession?.status === 'ended' && 
            !isModerator && 
            currentSupportSession?.rating === null) {
          const timer = setTimeout(() => {
            setShowFeedbackDialog(true);
          }, 500);
          return () => clearTimeout(timer);
        }
      }, [currentSupportSession?.status, currentSupportSession?.rating, isModerator]);
  
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
      <div className="p-2 border-b flex justify-between items-center">
        <div>
          <span className="text-sm font-medium">
            Support Session {currentSupportSession.id.slice(0, 8)}...
          </span>
        </div>
        <div className="flex gap-2 items-center">
          {/* Call buttons */}
          <CallButton
            roomName={`support-${currentSupportSession.id}`}
            participantName={currentUser?.displayName || currentUser?.email || 'User'}
            isVideoCall={false}
            variant="ghost"
            size="sm"
            buttonText=""
          />
          <CallButton
            roomName={`support-${currentSupportSession.id}`}
            participantName={currentUser?.displayName || currentUser?.email || 'User'}
            isVideoCall={true}
            variant="ghost"
            size="sm"
            buttonText=""
          />
          
          {isModerator && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRequestEndSupport}
                disabled={currentSupportSession?.status === 'ended'}
              >
                Request End
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleForceEndSupport}
                disabled={currentSupportSession?.status === 'ended'}
              >
                <X className="h-4 w-4 mr-1" />
                Force End
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
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
      </ScrollArea>
      
      {/* Message input - only show for active sessions */}
      {currentSupportSession?.status === 'active' && (
        <form onSubmit={handleSendMessage} className="p-4 border-t mt-auto">
          {messageLimiter.isLimited && (
            <div className="mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Rate limited. Wait {messageLimiter.getRemainingCooldown()}s to send messages.
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-h-0"
              rows={2}
            />
            
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newMessage.trim() || !messageLimiter.canSendMessage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {!messageLimiter.isLimited && (
            <div className="text-xs text-muted-foreground mt-1">
              {messageLimiter.messagesInWindow}/{messageLimiter.maxMessages} messages this minute
            </div>
          )}
        </form>
      )}

      <LiveSupportEndDialog 
        open={showEndDialog} 
        onOpenChange={setShowEndDialog} 
      />
      
      <FeedbackDialog 
        open={showFeedbackDialog} 
        onOpenChange={setShowFeedbackDialog} 
      />
    </div>
  );
};

export default LiveSupportChat;
