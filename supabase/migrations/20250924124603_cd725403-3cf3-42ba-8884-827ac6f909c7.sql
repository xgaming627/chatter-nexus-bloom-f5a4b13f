-- Add typing indicators support
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for typing indicators
CREATE POLICY "Users can manage their typing status" 
ON public.typing_indicators 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view typing in their conversations" 
ON public.typing_indicators 
FOR SELECT 
USING (conversation_id IN (
  SELECT id FROM public.conversations 
  WHERE auth.uid() = ANY (participants)
));

-- Add reported messages table
CREATE TABLE IF NOT EXISTS public.reported_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL,
  reported_by uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone
);

-- Enable RLS for reported messages
ALTER TABLE public.reported_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for reported messages
CREATE POLICY "Users can report messages" 
ON public.reported_messages 
FOR INSERT 
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Moderators can view all reports" 
ON public.reported_messages 
FOR SELECT 
USING (is_moderator(auth.uid()));

CREATE POLICY "Users can view their own reports" 
ON public.reported_messages 
FOR SELECT 
USING (auth.uid() = reported_by);

-- Add group chat limits and reply support
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS created_by_role text DEFAULT 'user';

-- Add reply support to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id uuid,
ADD COLUMN IF NOT EXISTS reply_to_content text;

-- Add moderator preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_moderator_badge boolean DEFAULT true;