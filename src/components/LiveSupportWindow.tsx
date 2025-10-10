import React, { useState, useRef, useEffect } from "react";
import { useLiveSupport } from "@/context/LiveSupportContext";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Star, Send, X, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "./UserAvatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom"; // ✅ React Router navigation

interface LiveSupportWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LiveSupportWindow: React.FC<LiveSupportWindowProps> = ({ open, onOpenChange }) => {
  const auth = useAuth();
  const liveSupport = useLiveSupport();
  const navigate = useNavigate(); // ✅ Hook to handle safe navigation

  const currentUser = auth?.currentUser;
  const {
    currentSupportSession,
    supportMessages,
    sendSupportMessage,
    createSupportSession,
    confirmEndSupport,
    submitFeedback,
  } = liveSupport || {};

  // Guard for missing contexts
  if (!auth || !liveSupport) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Live Support</DialogTitle>
          </DialogHeader>
          <p className="text-center text-muted-foreground py-6">Loading support system...</p>
        </DialogContent>
      </Dialog>
    );
  }

  const [newMessage, setNewMessage] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hasFirstMessageSent, setHasFirstMessageSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [supportMessages]);

  useEffect(() => {
    if (open && currentUser) {
      handleCreateSession();
    }
  }, [open, currentUser]);

  useEffect(() => {
    const handleClose = () => onOpenChange(false);
    window.addEventListener("closeSupportWindow", handleClose);
    return () => window.removeEventListener("closeSupportWindow", handleClose);
  }, [onOpenChange]);

  useEffect(() => {
    if (currentSupportSession?.status === "ended" && open) {
      setShowFeedback(true);
    }
  }, [currentSupportSession?.status, open]);

  useEffect(() => {
    if (!open) {
      setNewMessage("");
      setHasFirstMessageSent(false);
      setShowFeedback(false);
      setRating(0);
      setFeedback("");
    }
  }, [open]);

  useEffect(() => {
    if (hasFirstMessageSent && supportMessages.length === 1) {
      const timer = setTimeout(() => {
        sendSupportMessage?.(
          "Thanks for contacting support! One of our representatives will speak to you shortly!",
          "system",
        );
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasFirstMessageSent, supportMessages.length, sendSupportMessage]);

  const handleCreateSession = async () => {
    try {
      const session = await createSupportSession?.();
      console.log("Support session created:", session);
    } catch (error) {
      console.error("Error creating support session:", error);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && currentSupportSession) {
      sendSupportMessage?.(newMessage);
      setNewMessage("");
      if (!hasFirstMessageSent) setHasFirstMessageSent(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const getMessageTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "HH:mm");
  };

  const handleEndSupport = () => {
    confirmEndSupport?.();
  };

  const handleForceEnd = () => {
    onOpenChange(false);
    toast({
      title: "Support window closed",
      description: "You can reopen support anytime from your profile menu.",
    });
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    await submitFeedback?.(rating, feedback);
    setShowFeedback(false);
    setRating(0);
    setFeedback("");
    toast({
      title: "Feedback submitted",
      description: "Thank you for your feedback!",
    });

    onOpenChange(false);
  };

  const handleViewFullSession = () => {
    // ✅ Router-safe navigation (acts like 301 redirect in SPA)
    if (currentSupportSession?.id) {
      navigate(`/support/${currentSupportSession.id}`);
    } else {
      toast({
        title: "No session found",
        description: "You need an active session before viewing details.",
        variant: "destructive",
      });
    }
  };

  if (!currentUser) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Live Support</DialogTitle>
          </DialogHeader>
          <p className="text-center text-muted-foreground py-6">Please log in to access live support.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Live Support</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleViewFullSession}>
                  Open in Full View
                </Button>
                <Button variant="outline" size="sm" onClick={handleEndSupport}>
                  Request to End
                </Button>
                <Button variant="destructive" size="sm" onClick={handleForceEnd}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 mb-4">
            {supportMessages && supportMessages.length > 0 ? (
              supportMessages.map((message) => {
                const isOwn = message.sender_id === currentUser?.uid;
                const isSystem = message.sender_role === "system";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSystem ? "justify-center" : isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`${
                        isSystem
                          ? "bg-muted text-muted-foreground text-center py-2 px-4 rounded-md text-sm w-full"
                          : "max-w-[80%] break-words"
                      }`}
                    >
                      {!isOwn && !isSystem && (
                        <div className="flex items-center mb-1">
                          <UserAvatar username="Support" size="sm" />
                          <span className="text-xs font-medium ml-2">Support Agent</span>
                        </div>
                      )}
                      {!isSystem && (
                        <div className={`chat-bubble ${isOwn ? "chat-bubble-sent" : "chat-bubble-received"}`}>
                          {message.content}
                          <div className="text-right">
                            <span className="message-time inline-block mt-1">{getMessageTime(message.timestamp)}</span>
                          </div>
                        </div>
                      )}
                      {isSystem && <div>{message.content}</div>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground">Starting a new support session...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          {currentSupportSession?.status === "active" && (
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

      {/* Feedback Modal */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rate your experience</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={rating === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRating(value)}
                >
                  <Star className={`h-5 w-5 ${rating >= value ? "fill-yellow-400" : ""}`} />
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
              <ThumbsUp className="mr-2 h-4 w-4" /> Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveSupportWindow;
