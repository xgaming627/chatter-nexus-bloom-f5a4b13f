import React from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import CallModal from './CallModal';
import IncomingCallDialog from './IncomingCallDialog';

const CallComponents: React.FC = () => {
  const webRTC = useWebRTC();
  
  return (
    <>
      {/* Show call modal when call is active (not idle) */}
      {webRTC.callStatus !== 'idle' && <CallModal />}
      
      {/* Show incoming call dialog when there's an incoming call */}
      <IncomingCallDialog />
    </>
  );
};

export default CallComponents;