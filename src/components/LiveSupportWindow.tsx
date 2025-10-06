
import React, { useState, useRef, useEffect } from 'react';
import { useLiveSupport } from '@/context/LiveSupportContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Star, Send, X, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from './UserAvatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface LiveSupportWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LiveSupportWindow: React.FC<LiveSupportWindowProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const { currentUser } = useAuth();
  const { 
    currentSupportSession,
    supportMessages,
    sendSupportMessage,
    createSupportSession,
    requestEndSupport,
    forceEndSupport,
    submitFeedback,
    isActiveSupportSession,
  } = useLiveSupport();
  
  const [newMessage, setNewMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasFirstMessageSent, setHasFirstMessageSent] = useState(false);
  
  useEffect(() => {
    scrollToBottom();
    console.log("Support window messages:", supportMessages);
  }, [supportMessages]);
  
  useEffect(() => {
    if (open) {
      // Always create a fresh session when opening support window
      // Don't reuse ended or completed sessions
      handleCreateSession();
    }
  }, [open]);

  // Listen for custom event to close support window
  useEffect(() => {
    const handleClose = () => {
      onOpenChange(false);
    };
    
    window.addEventListener('closeSupportWindow', handleClose);
    return () => window.removeEventListener('closeSupportWindow', handleClose);
  }, [onOpenChange]);
  
  // Close window when session ends
  useEffect(() => {
    if (currentSupportSession?.status === 'ended') {
      // Close the support window and clear messages after a short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    }
  }, [currentSupportSession?.status, onOpenChange]);
  
  // Clear messages when dialog is closed
  useEffect(() => {
    if (!open) {
      // Reset state when dialog is closed
      setNewMessage('');
      setHasFirstMessageSent(false);
      setShowFeedback(false);
      setRating(0);
      setFeedback('');
    }
  }, [open]);
  
  useEffect(() => {
    // Add automated welcome message
    if (hasFirstMessageSent && supportMessages.length === 1) {
      // Add a small delay to make it look natural
      const timer = setTimeout(() => {
        sendSupportMessage("Thanks for contacting support! One of our representatives will speak to you shortly!", "system");
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [hasFirstMessageSent, supportMessages.length, sendSupportMessage]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleCreateSession = async () => {
    try {
      await createSupportSession();
      console.log("Support session created");
    } catch (error) {
      console.error("Error creating support session:", error);
    }
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() && currentSupportSession) {
      console.log("Sending message:", newMessage);
      sendSupportMessage(newMessage);
      setNewMessage('');
      
      if (!hasFirstMessageSent) {
        setHasFirstMessageSent(true);
      }
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
  
  const handleEndSupport = () => {
    if (currentSupportSession?.status === 'ended') {
      onOpenChange(false);
      setShowFeedback(true);
    } else {
      requestEndSupport();
      toast({
        title: "End request sent",
        description: "Waiting for confirmation to end support session"
      });
    }
  };
  
  const handleForceEnd = () => {
    forceEndSupport();
    onOpenChange(false);
    setShowFeedback(true);
  };
  
  const handleSubmitFeedback = () => {
    submitFeedback(rating, feedback);
    setShowFeedback(false);
    toast({
      title: "Feedback submitted",
      description: "Thank you for your feedback"
    });
  };
  
  if (!currentUser) {
    return null;
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Live Support</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleEndSupport}
                >
                  Request to End
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleForceEnd}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 mb-4">
            {supportMessages.length > 0 ? (
              supportMessages.map((message) => {
                const isOwnMessage = message.sender_id === currentUser?.uid;
                const isSystemMessage = message.sender_role === 'system';
                
                return (
                  <div 
                    key={message.id} 
                    className={`flex ${isSystemMessage ? 'justify-center' : isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`${isSystemMessage ? 'bg-muted text-muted-foreground text-center py-2 px-4 rounded-md text-sm w-full' : 'max-w-[80%] break-words'}`}>
                      {!isOwnMessage && !isSystemMessage && (
                        <div className="flex items-center mb-1">
                          <UserAvatar 
                            username="Support"
                            size="sm" 
                          />
                          <span className="text-xs font-medium ml-2">
                            Support Agent
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
                Starting a new support session...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message input - only show for active sessions */}
          {currentSupportSession?.status === 'active' && (
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
          )}
        </DialogContent>
      </Dialog>
      
      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rate your experience</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(value => (
                <Button
                  key={value}
                  variant={rating === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRating(value)}
                >
                  <Star className={`h-5 w-5 ${rating >= value ? 'fill-yellow-400' : ''}`} />
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Additional feedback (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitFeedback} disabled={rating === 0}>
              <ThumbsUp className="mr-2 h-4 w-4" />
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveSupportWindow;
