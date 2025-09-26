import React from 'react';
import { useRealCall } from '@/hooks/useRealCall';
import CallModal from './CallModal';
import IncomingCallDialog from './IncomingCallDialog';

const CallComponents: React.FC = () => {
  const realCall = useRealCall();
  
  console.log('🎯 CallComponents rendered, callStatus:', realCall.callStatus, 'incomingCall:', realCall.incomingCall);
  
  return (
    <>
      {/* Show call modal when call is active (not idle) */}
      {realCall.callStatus !== 'idle' && <CallModal />}
      
      {/* Show incoming call dialog when there's an incoming call */}
      <IncomingCallDialog />
    </>
  );
};

export default CallComponents;