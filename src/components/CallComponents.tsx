import React from 'react';
import { useChat } from '@/context/ChatContext';
import CallModal from './CallModal';
import IncomingCallDialog from './IncomingCallDialog';

const CallComponents: React.FC = () => {
  const { isCallActive } = useChat();
  
  return (
    <>
      {isCallActive && <CallModal />}
      <IncomingCallDialog />
    </>
  );
};

export default CallComponents;