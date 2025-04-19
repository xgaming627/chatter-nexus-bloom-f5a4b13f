
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

const Index = () => {
  const { currentUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  
  // Check if the user is the moderator
  const isModerator = currentUser?.email === 'vitorrossato812@gmail.com';
  
  // If user is not logged in, show auth forms
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-teams-purple mb-2">ChatNexus</h1>
            <p className="text-gray-600">Connect with your team, anywhere, anytime</p>
          </div>
          <AuthForms />
        </div>
      </div>
    );
  }
  
  // If user is a moderator, show the moderator panel
  if (isModerator) {
    return (
      <ChatProvider>
        <UsernameSetupModal />
        <ModeratorPanel />
      </ChatProvider>
    );
  }
  
  // Main chat application UI
  return (
    <ChatProvider>
      <UsernameSetupModal />
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="bg-teams-purple text-white py-2 px-4 shadow-md">
          <div className="flex justify-between items-center max-w-[1400px] mx-auto">
            <h1 className="text-xl font-bold">ChatNexus</h1>
            <div className="flex items-center gap-2">
              <div className="max-w-xs w-64 hidden md:block">
                <SearchUsers />
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white hover:bg-teams-purple-light"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-5 w-5" />
              </Button>
              <ProfileDropdown />
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-full max-w-xs border-r bg-gray-50 flex flex-col">
            <div className="p-4">
              <NewChatButton />
              <div className="md:hidden mb-4">
                <SearchUsers />
              </div>
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
      </div>
      
      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </ChatProvider>
  );
};

export default Index;
