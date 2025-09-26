import React from 'react';
import { useCustomCall } from '@/hooks/useCustomCall';
import CallModal from './CallModal';
import IncomingCallDialog from './IncomingCallDialog';

const CallComponents: React.FC = () => {
  const customCall = useCustomCall();
  
  return (
    <>
      {/* Show call modal when call is active (not idle) */}
      {customCall.callStatus !== 'idle' && <CallModal />}
      
      {/* Show incoming call dialog when there's an incoming call */}
      <IncomingCallDialog />
    </>
  );
};

export default CallComponents;