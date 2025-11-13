import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface AntiSpamConfig {
  maxMessagesPerMinute: number;
  maxMessageLength: number;
  banThreshold: number; // Number of violations before auto-ban
}

const DEFAULT_CONFIG: AntiSpamConfig = {
  maxMessagesPerMinute: 10,
  maxMessageLength: 500,
  banThreshold: 3 // Auto-ban after 3 violations
};

export const useAntiSpam = (config: Partial<AntiSpamConfig> = {}) => {
  const { currentUser } = useAuth();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [violations, setViolations] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  const messageTimestamps = useRef<number[]>([]);
  const lastMessageContent = useRef<string>('');
  const repeatCount = useRef(0);

  const banUser = useCallback(async () => {
    if (!currentUser) return;

    try {
      const banExpiry = new Date();
      banExpiry.setHours(banExpiry.getHours() + 24); // 24-hour ban

      await supabase
        .from('profiles')
        .update({ 
          status: 'banned',
          online_status: 'offline'
        })
        .eq('user_id', currentUser.uid);

      setIsBanned(true);
      
      toast({
        title: "Account Banned",
        description: "You have been automatically banned for spam/abuse. Contact support if you believe this is an error.",
        variant: "destructive"
      });

      // Log the ban
      await supabase.from('moderation_logs').insert({
        moderator_id: currentUser.uid, // System ban
        target_user_id: currentUser.uid,
        log_type: 'auto_ban',
        details: { reason: 'Automatic spam detection', violations }
      });

    } catch (error) {
      console.error('Error banning user:', error);
    }
  }, [currentUser, violations]);

  const checkSpam = useCallback((messageContent: string): { allowed: boolean; reason?: string } => {
    if (isBanned) {
      return { allowed: false, reason: 'You are banned from sending messages' };
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    messageTimestamps.current = messageTimestamps.current.filter(t => t > oneMinuteAgo);

    // Check rate limit
    if (messageTimestamps.current.length >= finalConfig.maxMessagesPerMinute) {
      const newViolations = violations + 1;
      setViolations(newViolations);

      if (newViolations >= finalConfig.banThreshold) {
        banUser();
        return { allowed: false, reason: 'Account banned for spam' };
      }

      return { allowed: false, reason: `Slow down! Max ${finalConfig.maxMessagesPerMinute} messages per minute` };
    }

    // Check for repeated identical messages (spam)
    if (messageContent === lastMessageContent.current) {
      repeatCount.current += 1;
      if (repeatCount.current >= 3) {
        const newViolations = violations + 1;
        setViolations(newViolations);

        if (newViolations >= finalConfig.banThreshold) {
          banUser();
          return { allowed: false, reason: 'Account banned for spam' };
        }

        return { allowed: false, reason: 'Stop spamming the same message' };
      }
    } else {
      repeatCount.current = 0;
      lastMessageContent.current = messageContent;
    }

    // Check for excessively long messages (text bombs)
    if (messageContent.length > finalConfig.maxMessageLength) {
      const newViolations = violations + 1;
      setViolations(newViolations);

      if (newViolations >= finalConfig.banThreshold) {
        banUser();
        return { allowed: false, reason: 'Account banned for spam' };
      }

      return { allowed: false, reason: `Message too long (max ${finalConfig.maxMessageLength} characters)` };
    }

    // Record this message
    messageTimestamps.current.push(now);

    return { allowed: true };
  }, [isBanned, violations, finalConfig, banUser]);

  return {
    checkSpam,
    isBanned,
    violations
  };
};
