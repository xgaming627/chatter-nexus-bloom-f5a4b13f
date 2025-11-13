import React from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { useChat } from '@/context/ChatContext';

export const MessagesSection: React.FC = () => {
  const { currentConversation } = useChat();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat List */}
      <div className="w-60 bg-muted/30 border-r">
        <ChatList />
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-background">
        {currentConversation ? (
          <ChatWindow />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">Select a conversation</p>
              <p className="text-sm">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
