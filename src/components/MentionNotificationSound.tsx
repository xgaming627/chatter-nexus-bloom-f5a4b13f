import { useEffect } from 'react';

interface MentionNotificationSoundProps {
  play: boolean;
  onPlayed?: () => void;
}

const MentionNotificationSound: React.FC<MentionNotificationSoundProps> = ({ play, onPlayed }) => {
  useEffect(() => {
    if (play) {
      // Create audio context only when needed (after user gesture)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume context if it's suspended
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            playBeep(audioContext, onPlayed);
          });
        } else {
          playBeep(audioContext, onPlayed);
        }
      } catch (error) {
        console.log('AudioContext not available, using fallback');
        // Fallback to HTML5 audio if Web Audio API fails
        if (onPlayed) onPlayed();
      }
    }
  }, [play, onPlayed]);

  const playBeep = (audioContext: AudioContext, onPlayed?: () => void) => {
    // Create a simple beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure the sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // High pitch
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // Lower pitch
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Cleanup
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
      audioContext.close();
      if (onPlayed) onPlayed();
    };
  };

  return null; // This component doesn't render anything
};

export default MentionNotificationSound;