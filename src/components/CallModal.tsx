
import { useChat } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';
import { Phone, Video, Mic, MicOff, X } from 'lucide-react';
import { useState } from 'react';
import UserAvatar from './UserAvatar';

interface CallModalProps {
  isGroup?: boolean;
}

const CallModal: React.FC<CallModalProps> = ({ isGroup = false }) => {
  const { currentConversation, endCall, activeCallType } = useChat();
  const [muted, setMuted] = useState(false);
  const [callTime, setCallTime] = useState(0);
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!currentConversation) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="text-center">
          <h3 className="text-xl font-medium mb-4">
            {activeCallType === 'video' ? 'Video Call' : 'Voice Call'}
          </h3>
          
          <p className="text-lg font-semibold mb-2">
            {isGroup 
              ? currentConversation.groupName 
              : currentConversation.participantsInfo[0]?.displayName || 'User'}
          </p>
          
          <p className="text-muted-foreground mb-6">
            {formatTime(callTime)}
          </p>
          
          <div className="flex justify-center mb-8">
            {isGroup ? (
              <div className="grid grid-cols-3 gap-2">
                {currentConversation.participantsInfo.slice(0, 6).map((user) => (
                  <div key={user.uid} className="flex flex-col items-center">
                    <UserAvatar username={user.username} photoURL={user.photoURL} />
                    <span className="text-xs mt-1">{user.displayName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <UserAvatar 
                username={currentConversation.participantsInfo[0]?.username || 'User'} 
                photoURL={currentConversation.participantsInfo[0]?.photoURL}
                size="lg"
              />
            )}
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => setMuted(!muted)}
            >
              {muted ? (
                <MicOff className="h-6 w-6 text-destructive" />
              ) : (
                <Mic className="h-6 w-6 text-green-500" />
              )}
            </Button>
            
            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={endCall}
            >
              {activeCallType === 'video' ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={endCall}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
