import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Users as UsersIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthForms from "@/components/AuthForms";
import UsernameSetupModal from "@/components/UsernameSetupModal";
import { ChatProvider } from "@/context/ChatContext";
import { LiveSupportProvider } from "@/context/LiveSupportContext";
import WarnUserNotification from "@/components/WarnUserNotification";
import WarningReloadHandler from "@/components/WarningReloadHandler";
import { BrowserNotificationPermission } from "@/components/BrowserNotificationPermission";
import { NotificationInbox } from "@/components/NotificationInbox";
import { ActiveNowPanel } from "@/components/ActiveNowPanel";
import { ProfileBar } from "@/components/ProfileBar";
import { FriendsList } from "@/components/FriendsList";
import { MessagesSection } from "@/components/MessagesSection";
import SearchUsers from "@/components/SearchUsers";
import ModeratorPanel from "@/components/ModeratorPanel";

const IndexContent = () => {
  const { currentUser } = useAuth();
  const { isModerator } = useRole();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'friends' | 'messages' | 'search' | 'moderator'>('friends');

  const handleSettingsClick = () => navigate('/settings');

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AuthForms />
        </div>
      </div>
    );
  }

  return (
    <>
      <UsernameSetupModal />
      <BrowserNotificationPermission />
      <WarnUserNotification />
      <WarningReloadHandler />

      <div className="flex h-screen bg-background overflow-hidden">
        {/* Left Sidebar - Friends & Navigation */}
        <div className="w-60 bg-muted/30 flex flex-col border-r">
          <div className="p-4 border-b">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => setActiveView('search')}
            >
              Start a conversation
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Button
              variant="ghost"
              className={`w-full justify-start px-4 py-2 rounded-none hover:bg-muted ${activeView === 'friends' ? 'bg-muted' : ''}`}
              onClick={() => setActiveView('friends')}
            >
              <UsersIcon className="mr-2 h-4 w-4" />
              Friends
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 rounded-none hover:bg-muted text-primary"
              onClick={() => navigate('/nexus-plus')}
            >
              <span className="mr-2">✨</span>
              Nexus Plus
            </Button>
            {isModerator && (
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 rounded-none hover:bg-muted text-amber-500"
                onClick={() => setActiveView('moderator')}
              >
                <Shield className="mr-2 h-4 w-4" />
                Moderator Panel
              </Button>
            )}
            
            <div className="px-4 pt-4 pb-2 border-t mt-4">
              <div className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                Direct Messages
              </div>
              <Button
                variant="ghost"
                className={`w-full justify-start text-sm ${activeView === 'messages' ? 'bg-muted' : ''}`}
                onClick={() => setActiveView('messages')}
              >
                Messages
              </Button>
            </div>
          </div>

          <ProfileBar onSettingsClick={handleSettingsClick} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-12 bg-background border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              <h1 className="font-semibold">
                {activeView === 'friends' ? 'Friends' : activeView === 'search' ? 'Find Friends' : activeView === 'moderator' ? 'Moderator Panel' : 'Messages'}
              </h1>
            </div>
            <NotificationInbox />
          </div>

          <div className="flex-1 overflow-hidden">
            {activeView === 'friends' ? (
              <FriendsList />
            ) : activeView === 'search' ? (
              <div className="p-4">
                <SearchUsers />
              </div>
            ) : activeView === 'moderator' ? (
              <ModeratorPanel />
            ) : (
              <MessagesSection />
            )}
          </div>
        </div>

        {/* Right Sidebar - Active Now (hidden in messages view) */}
        {activeView !== 'messages' && <ActiveNowPanel />}
      </div>
    </>
  );
};

const Index = () => (
  <LiveSupportProvider>
    <ChatProvider>
      <IndexContent />
    </ChatProvider>
  </LiveSupportProvider>
);

export default Index;
