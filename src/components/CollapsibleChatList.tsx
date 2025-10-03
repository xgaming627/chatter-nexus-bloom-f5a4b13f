import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ChatList from './ChatList';

const CollapsibleChatList: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex flex-col h-full">
      <Button
        variant="ghost"
        className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="font-medium">Conversations</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 transition-transform" />
        ) : (
          <ChevronRight className="h-4 w-4 transition-transform" />
        )}
      </Button>
      
      <div
        className={cn(
          "flex-1 overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "opacity-100" : "opacity-0 h-0"
        )}
      >
        {isExpanded && <ChatList />}
      </div>
    </div>
  );
};

export default CollapsibleChatList;
