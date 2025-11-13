import React from 'react';
import { getDateSeparator } from '@/utils/messageUtils';

interface MessageDateSeparatorProps {
  date: Date;
}

export const MessageDateSeparator: React.FC<MessageDateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center gap-4 my-4 px-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-semibold">
        {getDateSeparator(date)}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};
