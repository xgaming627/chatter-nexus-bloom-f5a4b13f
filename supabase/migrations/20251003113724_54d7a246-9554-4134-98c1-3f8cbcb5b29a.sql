-- Create call_notifications table for managing incoming call notifications
CREATE TABLE IF NOT EXISTS public.call_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  caller_name TEXT NOT NULL,
  caller_photo TEXT,
  receiver_id UUID NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_photo TEXT,
  room_name TEXT NOT NULL,
  is_video_call BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ringing',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.call_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view call notifications where they are caller or receiver
CREATE POLICY "Users can view their call notifications"
ON public.call_notifications
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Users can create call notifications
CREATE POLICY "Users can create call notifications"
ON public.call_notifications
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Users can update call notifications where they are receiver (to accept/decline)
CREATE POLICY "Receivers can update call notifications"
ON public.call_notifications
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Callers can update their own notifications (to cancel)
CREATE POLICY "Callers can update their call notifications"
ON public.call_notifications
FOR UPDATE
USING (auth.uid() = caller_id);

-- Auto-delete old call notifications after 5 minutes
CREATE OR REPLACE FUNCTION public.cleanup_old_call_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.call_notifications 
  WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_notifications;