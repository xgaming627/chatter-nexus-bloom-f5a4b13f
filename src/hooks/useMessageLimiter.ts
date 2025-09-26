import { useState, useCallback, useEffect } from 'react';

interface MessageLimiterConfig {
  maxMessages: number;
  timeWindowMs: number;
  cooldownMs: number;
}

const DEFAULT_CONFIG: MessageLimiterConfig = {
  maxMessages: 5, // Maximum messages
  timeWindowMs: 60000, // Per minute
  cooldownMs: 30000 // 30 second cooldown when limit exceeded
};

export const useMessageLimiter = (config: Partial<MessageLimiterConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [messageTimestamps, setMessageTimestamps] = useState<number[]>([]);
  const [isLimited, setIsLimited] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);

  // Clean up old timestamps
  const cleanupTimestamps = useCallback(() => {
    const now = Date.now();
    const cutoff = now - finalConfig.timeWindowMs;
    
    setMessageTimestamps(prev => prev.filter(timestamp => timestamp > cutoff));
  }, [finalConfig.timeWindowMs]);

  // Check if user can send a message
  const canSendMessage = useCallback(() => {
    const now = Date.now();
    
    // Check if still in cooldown
    if (cooldownEnd && now < cooldownEnd) {
      return false;
    }
    
    // Clean up old timestamps
    cleanupTimestamps();
    
    // Check if under the limit
    return messageTimestamps.length < finalConfig.maxMessages;
  }, [messageTimestamps.length, finalConfig.maxMessages, cooldownEnd, cleanupTimestamps]);

  // Record a message being sent
  const recordMessage = useCallback(() => {
    const now = Date.now();
    
    setMessageTimestamps(prev => {
      const updated = [...prev, now];
      
      // Check if limit exceeded
      if (updated.length >= finalConfig.maxMessages) {
        setIsLimited(true);
        setCooldownEnd(now + finalConfig.cooldownMs);
      }
      
      return updated;
    });
  }, [finalConfig.maxMessages, finalConfig.cooldownMs]);

  // Get remaining cooldown time
  const getRemainingCooldown = useCallback(() => {
    if (!cooldownEnd) return 0;
    const remaining = Math.max(0, cooldownEnd - Date.now());
    return Math.ceil(remaining / 1000); // Return seconds
  }, [cooldownEnd]);

  // Effect to handle cooldown expiry
  useEffect(() => {
    if (!cooldownEnd) return;

    const timer = setTimeout(() => {
      setIsLimited(false);
      setCooldownEnd(null);
      // Clear all timestamps when cooldown ends
      setMessageTimestamps([]);
    }, cooldownEnd - Date.now());

    return () => clearTimeout(timer);
  }, [cooldownEnd]);

  // Cleanup effect
  useEffect(() => {
    const interval = setInterval(cleanupTimestamps, 5000); // Clean every 5 seconds
    return () => clearInterval(interval);
  }, [cleanupTimestamps]);

  return {
    canSendMessage: canSendMessage(),
    isLimited,
    recordMessage,
    getRemainingCooldown,
    messagesInWindow: messageTimestamps.length,
    maxMessages: finalConfig.maxMessages
  };
};