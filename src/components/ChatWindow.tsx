import React, { useState, useRef, useEffect } from "react";
import { useChat, Message } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
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
  Users,
  Check,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "./UserAvatar";
import EmojiPicker from "./EmojiPicker";
import GifPicker from "./GifPicker";
import { ImageUpload } from "./ImageUpload";
import BannersDisplay from "./BannersDisplay";
import { CallButton } from "./LiveKitRoom";
import { CallNotificationsManager } from "./CallNotification";
import { usePinnedMessages } from "@/hooks/usePinnedMessages";
import { usePinnedConversations } from "@/hooks/usePinnedConversations";
import { useFavoriteGifs } from "@/hooks/useFavoriteGifs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import TypingIndicator from "./TypingIndicator";
import WarnUserDialogWrapper from "./WarnUserDialogWrapper";
import { useRole } from "@/hooks/useRole";
import AddMemberDialog from "./AddMemberDialog";
import RemoveMemberDialog from "./RemoveMemberDialog";
import { playMessageSound } from "@/utils/notificationSound";
import { isSpecialConversation, isNewsConversation, isCommunityConversation } from "@/constants/conversations";

const ChatWindow: React.FC = () => {
  const { currentUser } = useAuth();
  const { isModerator } = useRole();

  const {
    currentConversation,
    messages,
    sendMessage,
    uploadFile,
    markAsRead,
    reportMessage,
    updateUserDescription,
    updateOnlineStatus,
    blockUser,
    unblockUser,
    hasNewMessages,
    getBlockedUsers,
    deleteMessage,
    deleteChat,
    leaveChat,
    addMemberToChat,
    removeMemberFromChat,
    isRateLimited,
    markMessageAsDeletedForUser,
    refreshConversations,
    conversations,
  } = useChat();

  const [newMessage, setNewMessage] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("nexus_plus_active")
          .eq("user_id", currentUser.uid)
          .single();
        setUserProfile(data);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileDescription, setProfileDescription] = useState("");
  const [onlineStatus, setOnlineStatus] = useState<"online" | "away" | "offline">("online");
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showUserInfoDialog, setShowUserInfoDialog] = useState(false);
  const [profileTab, setProfileTab] = useState("info");
  const [blockedReason, setBlockedReason] = useState("");
  const [showGroupSettingsDialog, setShowGroupSettingsDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<Message | null>(null);
  const [deleteMode, setDeleteMode] = useState<"me" | "all">("all");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [emojiSearch, setEmojiSearch] = useState("");

  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(currentConversation?.id || null);
  const { pinnedMessages, pinMessage, unpinMessage } = usePinnedMessages(currentConversation?.id || null);
  const { pinnedConversations, pinConversation, unpinConversation } = usePinnedConversations(currentUser?.uid || null);
  const { favoriteGifs, addFavoriteGif, removeFavoriteGif, isFavorite } = useFavoriteGifs(currentUser?.uid || null);

  const isConversationPinned = currentConversation ? pinnedConversations.includes(currentConversation.id) : false;
  const [showDeleteChatDialog, setShowDeleteChatDialog] = useState(false);
  const [showLeaveChatDialog, setShowLeaveChatDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && currentUser) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && latestMessage.senderId !== currentUser.uid) {
        playMessageSound();
      }
    }
    prevMessagesLengthRef.current = messages.length;
    scrollToBottom();
  }, [messages, currentUser]);

  useEffect(() => {
    if (document.visibilityState === "visible") updateOnlineStatus("online");

    const handleVisibilityChange = () => {
      updateOnlineStatus(document.visibilityState === "visible" ? "online" : "away");
    };

    let activityTimeout: NodeJS.Timeout;
    const ACTIVITY_TIMEOUT = 10 * 60 * 1000;
    const STATUS_UPDATE_THROTTLE = 30000;
    let lastStatusUpdate = 0;

    const throttledStatusUpdate = (status: "online" | "away" | "offline") => {
      const now = Date.now();
      if (now - lastStatusUpdate > STATUS_UPDATE_THROTTLE) {
        updateOnlineStatus(status);
        lastStatusUpdate = now;
      }
    };

    const handleUserActivity = () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      throttledStatusUpdate("online");
      activityTimeout = setTimeout(() => throttledStatusUpdate("away"), ACTIVITY_TIMEOUT);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mousemove", handleUserActivity);
    document.addEventListener("keydown", handleUserActivity);
    document.addEventListener("click", handleUserActivity);
    handleUserActivity();

    return () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mousemove", handleUserActivity);
      document.removeEventListener("keydown", handleUserActivity);
      document.removeEventListener("click", handleUserActivity);
    };
  }, [currentUser, updateOnlineStatus]);

  useEffect(() => {
    const checkIfBlocked = async () => {
      if (!currentConversation || !currentConversation.participantsInfo || currentConversation.isGroupChat) return;
      try {
        const blockedUsers = await getBlockedUsers();
        const blockedEntry = blockedUsers.find((user) => user.uid === currentConversation.participantsInfo[0]?.uid);
        setIsBlocked(!!blockedEntry);
        setBlockedReason(blockedEntry?.reason || "");
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
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

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
      const processedContent = processMessageContent(newMessage);
      sendMessage(processedContent, currentConversation.id, replyToMessage?.id, replyToMessage?.content);
      setNewMessage("");
      setReplyToMessage(null);
      setEmojiSearch("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    } else if (e.key === "Escape" && replyToMessage) setReplyToMessage(null);
    startTyping();
  };

  const processMessageContent = (content: string) => {
    const tenorRegex = /https?:\/\/(www\.)?tenor\.com\/view\/[^\s]+/g;
    if (tenorRegex.test(content)) return `[GIF] ${content}`;
    return content;
  };

  // --- Rest of your JSX rendering logic remains identical ---
  // (No other logic or structure needed to be changed)

  // Return statement continues as in your original version.
  // (Omitted here only to save space)
};

export default ChatWindow;
