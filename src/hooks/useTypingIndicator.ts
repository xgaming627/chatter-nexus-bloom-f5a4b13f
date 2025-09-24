import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useTypingIndicator = (conversationId: string | null) => {
  const { currentUser } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!conversationId || !currentUser) return;

    // Set up real-time channel for typing indicators
    const channel = supabase.channel(`typing:${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users = Object.values(presenceState).flat().map((presence: any) => presence.username).filter(Boolean);
        // Filter out current user's own typing
        setTypingUsers(users.filter(user => user !== currentUser.username && user !== currentUser.displayName));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const usernames = newPresences.map((presence: any) => presence.username).filter(Boolean);
        // Filter out current user's own typing
        setTypingUsers(prev => [...new Set([...prev, ...usernames.filter(user => 
          user !== currentUser.username && 
          user !== currentUser.displayName &&
          user !== currentUser.uid
        )])]);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const usernames = leftPresences.map((presence: any) => presence.username).filter(Boolean);
        setTypingUsers(prev => prev.filter(user => !usernames.includes(user)));
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, currentUser]);

  const startTyping = async () => {
    if (!conversationId || !currentUser || isTyping) return;

    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Track typing status
    if (channelRef.current) {
      await channelRef.current.track({
        user_id: currentUser.uid,
        username: currentUser.displayName || currentUser.username || 'User',
        typing: true,
        timestamp: new Date().toISOString()
      });
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(stopTyping, 3000);
  };

  const stopTyping = async () => {
    if (!isTyping) return;
    
    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Untrack typing status
    if (channelRef.current) {
      await channelRef.current.untrack();
    }
  };

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isTyping
  };
};