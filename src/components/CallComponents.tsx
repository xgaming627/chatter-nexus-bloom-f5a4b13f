import React from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import CallModal from './CallModal';
import IncomingCallDialog from './IncomingCallDialog';

const CallComponents: React.FC = () => {
  const webRTC = useWebRTC();
  
  return (
    <>
      {webRTC.isCallActive && <CallModal />}
      <IncomingCallDialog />
    </>
  );
};

export default CallComponents;