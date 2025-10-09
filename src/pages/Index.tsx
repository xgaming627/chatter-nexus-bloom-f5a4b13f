import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useNavigate } from "react-router-dom";
import { useFreeTrialModals } from "@/hooks/useFreeTrialModals";
import { FreeTrialModal, TrialExpiringModal } from "@/components/FreeTrialModal";
import { Settings, Bell, Crown } from "lucide-react";
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
import NexusTitle from "@/components/NexusTitle";
import { ChatProvider } from "@/context/ChatContext";
import ModeratorPanel from "@/components/ModeratorPanel";
import WarnUserNotification from "@/components/WarnUserNotification";
import WarningReloadHandler from "@/components/WarningReloadHandler";
import ModeratorNotifications from "@/components/ModeratorNotifications";
import NotificationDisplay from "@/components/NotificationDisplay";
import { BrowserNotificationPermission } from "@/components/BrowserNotificationPermission";
import { LiveSupportProvider } from "@/context/LiveSupportContext";
import { CallNotificationsManager } from "@/components/CallNotification";
import { LiveKitRoom } from "@/components/LiveKitRoom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const Index = () => {
  const { currentUser } = useAuth();
  const { isModerator } = useRole();
  const navigate = useNavigate();
  const { showFreeTrialModal, setShowFreeTrialModal, showExpiringModal, setShowExpiringModal } = useFreeTrialModals();

  const [showSettings, setShowSettings] = useState(false);
  const [showModeratorPanel, setShowModeratorPanel] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{
    roomName: string;
    isVideoCall: boolean;
  } | null>(null);

  useEffect(() => {
    if (currentUser) {
      const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
      if (!hasSeenWelcome) setShowWelcome(true);
    }
  }, [currentUser]);

  const handleAcceptTerms = () => {
    localStorage.setItem("hasSeenWelcome", "true");
    setShowWelcome(false);
  };

  const handleAcceptCall = (roomName: string, isVideoCall: boolean) => {
    setIncomingCall({ roomName, isVideoCall });
  };

  const handleLeaveCall = () => {
    setIncomingCall(null);
  };

  return (
    <LiveSupportProvider>
      {!currentUser ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="w-full max-w-md">
            <h1 className="text-4xl font-bold text-center mb-6 text-white">Nexus Chat</h1>
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

          {incomingCall && (
            <LiveKitRoom
              roomName={incomingCall.roomName}
              participantName={currentUser?.displayName || currentUser?.email || "User"}
              isVideoCall={incomingCall.isVideoCall}
              onLeave={handleLeaveCall}
            />
          )}

          <div className="flex flex-col h-screen bg-background">
            <header className="bg-teams-purple text-white py-2 px-4 shadow-md dark:bg-gray-800">
              <div className="flex justify-between items-center">
                <NexusTitle />
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/nexus-plus")}
                    className="border border-yellow-400 bg-gradient-to-r from-yellow-500/20 to-amber-500/20"
                  >
                    <Crown className="h-4 w-4 mr-1 text-yellow-400" />
                    Get Nexus Plus
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(true)}
                    className="text-white hover:bg-gray-700"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                  <ProfileDropdown />
                </div>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-full max-w-xs border-r bg-gray-50 dark:bg-gray-900 dark:border-gray-700 flex flex-col">
                <div className="p-4">
                  <NewChatButton />
                  <NewsButton />
                  {isModerator && (
                    <Button variant="outline" className="w-full mt-2" onClick={() => setShowModeratorPanel(true)}>
                      Moderator Panel
                    </Button>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatList />
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                {showModeratorPanel && isModerator ? <ModeratorPanel /> : <ChatWindow />}
              </div>
            </div>
          </div>

          <SettingsModal
            open={showSettings}
            onOpenChange={setShowSettings}
            onShowModeratorPanel={
              isModerator
                ? () => {
                    setShowModeratorPanel(true);
                    setShowSettings(false);
                  }
                : undefined
            }
          />

          <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Welcome to Nexus Chat!</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[400px] pr-4">
                <p>Welcome to Nexus Chat — powered by Quibly Inc. 🚀</p>
              </ScrollArea>
              <DialogFooter>
                <Button onClick={handleAcceptTerms}>I Accept</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <FreeTrialModal open={showFreeTrialModal} onClose={() => setShowFreeTrialModal(false)} />
          <TrialExpiringModal
            open={showExpiringModal}
            onClose={() => setShowExpiringModal(false)}
            onViewPricing={() => navigate("/nexus-plus")}
          />
        </ChatProvider>
      )}
    </LiveSupportProvider>
  );
};

export default Index;
