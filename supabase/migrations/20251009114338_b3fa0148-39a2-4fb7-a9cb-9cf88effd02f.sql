-- Add missing columns to support_sessions for tracking
ALTER TABLE public.support_sessions
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS warnings_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_warning_at TIMESTAMP WITH TIME ZONE;

-- Update News conversation RLS to allow all authenticated users to read
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in"
ON public.conversations
FOR SELECT
USING (
  auth.uid() = ANY (participants)
  OR id = '00000000-0000-0000-0000-000000000001'::uuid  -- News channel
  OR id = '00000000-0000-0000-0000-000000000002'::uuid  -- Community channel
);

-- Update News conversation to allow updates for adding participants
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON public.conversations;

CREATE POLICY "Users can update conversations they participate in"
ON public.conversations
FOR UPDATE
USING (
  auth.uid() = ANY (participants)
  OR id = '00000000-0000-0000-0000-000000000001'::uuid  -- News channel
  OR id = '00000000-0000-0000-0000-000000000002'::uuid  -- Community channel
);

-- Add read_receipts_enabled to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS read_receipts_enabled BOOLEAN DEFAULT true;

-- Create table for read receipts
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own read receipts"
ON public.message_read_receipts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view read receipts in their conversations"
ON public.message_read_receipts
FOR SELECT
USING (
  message_id IN (
    SELECT m.id FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE auth.uid() = ANY (c.participants)
  )
);

-- Add delivered_at and read_at columns to messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;