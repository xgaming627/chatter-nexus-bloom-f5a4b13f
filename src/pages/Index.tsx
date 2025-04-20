
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthForms from "@/components/AuthForms";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";
import ProfileDropdown from "@/components/ProfileDropdown";
import SearchUsers from "@/components/SearchUsers";
import SettingsModal from "@/components/SettingsModal";
import UsernameSetupModal from "@/components/UsernameSetupModal";
import NewChatButton from "@/components/NewChatButton";
import { ChatProvider } from "@/context/ChatContext";
import ModeratorPanel from "@/components/ModeratorPanel";
import { LiveSupportProvider } from "@/context/LiveSupportContext";

const Index = () => {
  const { currentUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showModeratorPanel, setShowModeratorPanel] = useState(false);
  
  // Check if the user is the moderator
  const isModerator = currentUser?.email === 'vitorrossato812@gmail.com';
  
  // If user is not logged in, show auth forms
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-teams-purple mb-2 dark:text-white">ChatNexus</h1>
            <p className="text-gray-600 dark:text-gray-300">Connect with your team, anywhere, anytime</p>
          </div>
          <AuthForms />
        </div>
      </div>
    );
  }
  
  return (
    <LiveSupportProvider>
      <ChatProvider>
        <UsernameSetupModal />
        
        <div className="flex flex-col h-screen bg-background">
          {/* Header */}
          <header className="bg-teams-purple text-white py-2 px-4 shadow-md dark:bg-gray-800">
            <div className="flex justify-between items-center max-w-[1400px] mx-auto">
              <h1 className="text-xl font-bold">ChatNexus</h1>
              <div className="flex items-center gap-2">
                <div className="max-w-xs w-64 hidden md:block">
                  <SearchUsers />
                </div>
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
                  <div className="md:hidden mb-4">
                    <SearchUsers />
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => setShowModeratorPanel(false)}
                  >
                    Back to Chat
                  </Button>
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
              <div className="w-full max-w-xs border-r bg-gray-50 dark:bg-gray-900 dark:border-gray-700 flex flex-col">
                <div className="p-4">
                  <NewChatButton />
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
              <div className="flex-1 flex flex-col overflow-hidden">
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
      </ChatProvider>
    </LiveSupportProvider>
  );
};

export default Index;
