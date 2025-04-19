
import React from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useChat } from '@/context/ChatContext';
import { useState } from 'react';

const CallModal: React.FC = () => {
  const { isCallActive, activeCallType, endCall, currentConversation } = useChat();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
  };

  if (!isCallActive || !currentConversation) return null;

  const callTitle = activeCallType === 'video' ? 'Video Call' : 'Voice Call';
  const participantName = currentConversation.isGroupChat
    ? currentConversation.groupName || 'Group call'
    : currentConversation.participantsInfo[0]?.displayName || 'User';

  return (
    <Dialog open={isCallActive} onOpenChange={(open) => !open && endCall()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-6 py-10">
          <div className="text-center">
            <h2 className="text-xl font-semibold">{callTitle}</h2>
            <p className="text-muted-foreground">with {participantName}</p>
            <p className="text-sm text-muted-foreground mt-2">Connected: 00:05</p>
          </div>

          {activeCallType === 'video' && (
            <div className="bg-gray-200 w-full aspect-video rounded-lg flex items-center justify-center">
              {isVideoOff ? (
                <div className="text-muted-foreground">Video turned off</div>
              ) : (
                <div className="animate-pulse text-muted-foreground">
                  Video preview (mock)
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <Button 
              size="icon" 
              variant={isMuted ? "default" : "outline"} 
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            
            {activeCallType === 'video' && (
              <Button 
                size="icon" 
                variant={isVideoOff ? "default" : "outline"} 
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            )}
            
            <Button size="icon" variant="destructive" onClick={endCall}>
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;
