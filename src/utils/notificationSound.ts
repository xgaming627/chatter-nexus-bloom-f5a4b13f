let messageAudio: HTMLAudioElement | null = null;

export const playMessageSound = () => {
  try {
    if (!messageAudio) {
      messageAudio = new Audio('/notification-sound.mp3');
      messageAudio.volume = 0.5;
    }
    messageAudio.currentTime = 0;
    messageAudio.play().catch(e => console.log('Could not play message sound:', e));
  } catch (error) {
    console.log('Error playing message sound:', error);
  }
};
