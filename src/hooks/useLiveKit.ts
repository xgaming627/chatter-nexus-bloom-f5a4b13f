import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface LiveKitToken {
  token: string;
  serverUrl: string;
}

export const useLiveKit = () => {
  const { currentUser } = useAuth();
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  const generateToken = useCallback(async (
    roomName: string, 
    participantName: string
  ): Promise<LiveKitToken | null> => {
    if (!currentUser) {
      toast.error('You must be logged in to join a call');
      return null;
    }

    // Verify we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('No valid session:', sessionError);
      toast.error('Authentication required. Please log in again.');
      return null;
    }

    setIsGeneratingToken(true);
    try {
      console.log('Invoking generate-livekit-token with session:', session.access_token.substring(0, 20) + '...');
      
      const { data, error } = await supabase.functions.invoke('generate-livekit-token', {
        body: { roomName, participantName },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Token generation error:', error);
        toast.error('Failed to join call. Please try again.');
        return null;
      }

      console.log('Token generated successfully');
      return data as LiveKitToken;
    } catch (error) {
      console.error('Error generating LiveKit token:', error);
      toast.error('Failed to join call. Please try again.');
      return null;
    } finally {
      setIsGeneratingToken(false);
    }
  }, [currentUser]);

  return {
    generateToken,
    isGeneratingToken
  };
};
