import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import WarnUserDialog from './WarnUserDialog';

interface WarnUserDialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    uid: string;
    username?: string;
    displayName: string;
  };
}

const WarnUserDialogWrapper: React.FC<WarnUserDialogWrapperProps> = ({
  open,
  onOpenChange,
  user
}) => {
  const { warnUser } = useChat();

  const handleWarn = async (reason: string, duration: string) => {
    await warnUser(user.uid, reason, duration);
    onOpenChange(false);
  };

  return (
    <WarnUserDialog
      open={open}
      onOpenChange={onOpenChange}
      onWarn={handleWarn}
      user={{
        uid: user.uid,
        displayName: user.displayName || user.username || 'User',
        username: user.username || 'User',
        email: null,
        photoURL: null
      }}
    />
  );
};

export default WarnUserDialogWrapper;