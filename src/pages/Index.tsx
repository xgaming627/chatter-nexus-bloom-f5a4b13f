
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Settings, Bell, Crown, Users as UsersIcon, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AuthForms from "@/components/AuthForms";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";
import ProfileDropdown from "@/components/ProfileDropdown";
import SearchUsers from "@/components/SearchUsers";
import SettingsModal from "@/components/SettingsModal";
import UsernameSetupModal from "@/components/UsernameSetupModal";
import NewChatButton from "@/components/NewChatButton";
import NewsButton from "@/components/NewsButton";
import CommunityButton from "@/components/CommunityButton";
import NexusTitle from "@/components/NexusTitle";
import { ChatProvider, useChat } from "@/context/ChatContext";
import ModeratorPanel from "@/components/ModeratorPanel";
import WarnUserNotification from "@/components/WarnUserNotification";
import WarningReloadHandler from "@/components/WarningReloadHandler";
import ModeratorNotifications from "@/components/ModeratorNotifications";
import NotificationDisplay from "@/components/NotificationDisplay";
import { BrowserNotificationPermission } from "@/components/BrowserNotificationPermission";
import { LiveSupportProvider } from "@/context/LiveSupportContext";
import { CallNotificationsManager } from "@/components/CallNotification";
import { LiveKitRoom } from "@/components/LiveKitRoom";
import FriendsTab from "@/components/FriendsTab";
import { ReferralSystem } from "@/components/ReferralSystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const Index = () => {
  const { currentUser } = useAuth();
  const { isModerator } = useRole();
  const [showSettings, setShowSettings] = useState(false);
  const [showModeratorPanel, setShowModeratorPanel] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{roomName: string; isVideoCall: boolean} | null>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);

  // Set dark mode preference
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, []);
  
  useEffect(() => {
    // Show welcome message for new users
    if (currentUser) {
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
    }
  }, [currentUser]);

  // Simplified notifications (since we don't have a notifications system in Supabase yet)
  useEffect(() => {
    if (!currentUser) return;
    
    // Mock notifications for now
    setNotifications([]);
    setUnreadNotifications(0);
  }, [currentUser]);

  const handleAcceptTerms = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };

  const markNotificationsAsRead = async () => {
    // Simplified - no action needed since we don't have real notifications yet
    setUnreadNotifications(0);
  };

  const handleAcceptCall = (roomName: string, isVideoCall: boolean) => {
    setIncomingCall({ roomName, isVideoCall });
  };

  const handleLeaveCall = () => {
    setIncomingCall(null);
  };
  
  return (
    <LiveSupportProvider>
      {/* If user is not logged in, show auth forms */}
      {!currentUser ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-teams-purple mb-2 dark:text-white">Nexus Chat</h1>
              <p className="text-gray-600 dark:text-gray-300">Connect with your friends, anywhere, anytime.</p>
            </div>
            <AuthForms />
          </div>
        </div>
      ) : (
      <ChatProvider>
        <UsernameSetupModal />
        <WarnUserNotification />
        <WarningReloadHandler />
        <ModeratorNotifications />
        <NotificationDisplay />
        <BrowserNotificationPermission />
        <CallNotificationsManager onAcceptCall={handleAcceptCall} />
        
        {/* Incoming call LiveKit room */}
        {incomingCall && (
          <LiveKitRoom
            roomName={incomingCall.roomName}
            participantName={currentUser?.displayName || currentUser?.email || 'User'}
            isVideoCall={incomingCall.isVideoCall}
            onLeave={handleLeaveCall}
          />
        )}
        
        <div className="flex flex-col h-screen bg-background">
          {/* Header */}
          <header className="bg-teams-purple text-white py-2 px-4 shadow-md dark:bg-gray-800">
            <div className="flex justify-between items-center max-w-[1400px] mx-auto">
              <NexusTitle />
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-teams-purple-light dark:hover:bg-gray-700"
                  onClick={() => setShowFriends(true)}
                  title="Friends"
                >
                  <UsersIcon className="h-5 w-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-teams-purple-light dark:hover:bg-gray-700"
                  onClick={() => window.location.href = '/nexus-shop'}
                  title="Nexus Shop"
                >
                  <ShoppingBag className="h-5 w-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-teams-purple-light dark:hover:bg-gray-700 border border-yellow-400 bg-gradient-to-r from-yellow-500/20 to-amber-500/20"
                  onClick={() => window.location.href = '/nexus-plus'}
                >
                  <Crown className="h-4 w-4 mr-1 text-yellow-400" />
                  Nexus Plus
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-teams-purple-light dark:hover:bg-gray-700"
                  onClick={() => setShowReferrals(true)}
                >
                  Invite Friends
                </Button>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-white hover:bg-teams-purple-light dark:hover:bg-gray-700 relative"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadNotifications > 0 && (
                        <Badge 
                          className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs bg-red-500"
                        >
                          {unreadNotifications}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="py-2 px-4 border-b bg-muted/50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Notifications</h3>
                        {unreadNotifications > 0 && (
                          <Button variant="ghost" size="sm" onClick={markNotificationsAsRead}>
                            Mark all as read
                          </Button>
                        )}
                      </div>
                    </div>
                    <ScrollArea className="h-[300px]">
                      {notifications.length > 0 ? (
                        <div className="py-2">
                          {notifications.map(notification => (
                            <div 
                              key={notification.id}
                              className={`px-4 py-2 hover:bg-muted/50 ${!notification.read ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium">{notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}</p>
                                  <p className="text-xs text-muted-foreground">{notification.content}</p>
                                </div>
                                {!notification.read && (
                                  <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.timestamp ? format(new Date(notification.timestamp), 'PPp') : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No notifications</p>
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-teams-purple-light dark:hover:bg-gray-700"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <ProfileDropdown />
              </div>
            </div>
          </header>
          
          {/* Main content */}
          {showModeratorPanel && isModerator ? (
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-full max-w-xs border-r bg-gray-50 dark:bg-gray-900 dark:border-gray-700 flex flex-col">
                <div className="p-4">
                  <NewChatButton />
                  <NewsButton />
                  <CommunityButton />
                  <div className="md:hidden mb-4">
                    <SearchUsers />
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatList />
                </div>
              </div>
              
              {/* Main area - Moderator panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <ModeratorPanel />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-full max-w-xs border-r bg-gray-50 dark:bg-gray-900 dark:border-gray-700 flex flex-col animate-fadeIn">
                <div className="p-4">
                  <NewChatButton />
                  <NewsButton />
                  <CommunityButton />
                  <div className="md:hidden mb-4">
                    <SearchUsers />
                  </div>
                  {isModerator && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => setShowModeratorPanel(true)}
                    >
                      Moderator Panel
                    </Button>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatList />
                </div>
              </div>
              
              {/* Chat area */}
              <div className="flex-1 flex flex-col overflow-hidden animate-scaleIn">
                <ChatWindow />
              </div>
            </div>
          )}
        </div>
        
        <SettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
          onShowModeratorPanel={isModerator ? () => {
            setShowModeratorPanel(true);
            setShowSettings(false);
          } : undefined}
        />
        
        <FriendsTab open={showFriends} onOpenChange={setShowFriends} />
        <ReferralSystem open={showReferrals} onOpenChange={setShowReferrals} />

        {/* Welcome Dialog */}
        <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Welcome to Nexus Chat (v1.13.5)!</DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-4 py-4">
                <p>
                  👋 Welcome to Nexus Chat (BETA v1.13.6)!
                  This app is currently under development, so you may notice ongoing changes and new features being added.
                </p>
                
                <p>
                  By continuing, you agree to our Terms of Service, which includes our right to collect certain data
                  such as messages, IP addresses, activity logs, and more for platform functionality and safety.
                </p>
                
                <p>
                  Nexus Chat is proudly built and managed by the Quibly Team. 💡
                  If you need help, just click on your profile picture and select "Live Support" — we're here for you!
                </p>
                
                <p>
                  Thanks for being part of our growing community. 🚀
                </p>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">Try our features!</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Click new chat and start chatting with your friends, thank you for being here!
                  </p>
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter>
              <Button onClick={handleAcceptTerms}>
                I Accept the Terms of Service
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ChatProvider>
      )}
    </LiveSupportProvider>
  );
};

export default Index;
