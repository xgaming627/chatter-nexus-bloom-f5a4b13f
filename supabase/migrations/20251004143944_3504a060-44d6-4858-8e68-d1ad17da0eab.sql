-- Create license keys table for Nexus Plus
CREATE TABLE IF NOT EXISTS public.license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pinned messages table
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  pinned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, conversation_id)
);

-- Create pinned conversations table
CREATE TABLE IF NOT EXISTS public.pinned_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create favorite gifs table
CREATE TABLE IF NOT EXISTS public.favorite_gifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gif_url TEXT NOT NULL,
  gif_title TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, gif_url)
);

-- Add nexus_plus fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nexus_plus_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nexus_plus_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS nexus_plus_reminder_shown BOOLEAN DEFAULT false;

-- Add last_activity to support_sessions for auto-close
ALTER TABLE public.support_sessions
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Enable RLS
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_gifs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for license_keys
CREATE POLICY "Users can view their own license keys"
  ON public.license_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert license keys"
  ON public.license_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for pinned_messages
CREATE POLICY "Users can view pinned messages in their conversations"
  ON public.pinned_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE auth.uid() = ANY(participants)
  ));

CREATE POLICY "Users can pin messages in their conversations"
  ON public.pinned_messages FOR INSERT
  WITH CHECK (
    auth.uid() = pinned_by AND
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can unpin their own pinned messages"
  ON public.pinned_messages FOR DELETE
  USING (auth.uid() = pinned_by);

-- RLS Policies for pinned_conversations
CREATE POLICY "Users can view their own pinned conversations"
  ON public.pinned_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can pin their own conversations"
  ON public.pinned_conversations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can unpin their own conversations"
  ON public.pinned_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for favorite_gifs
CREATE POLICY "Users can view their own favorite gifs"
  ON public.favorite_gifs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorite gifs"
  ON public.favorite_gifs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorite gifs"
  ON public.favorite_gifs FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-close inactive support sessions
CREATE OR REPLACE FUNCTION auto_close_inactive_support_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_sessions
  SET status = 'closed'
  WHERE status = 'active'
    AND last_activity < NOW() - INTERVAL '1 day';
END;
$$;

-- Trigger to update last_activity on support messages
CREATE OR REPLACE FUNCTION update_support_session_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_sessions
  SET last_activity = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_support_activity_trigger
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION update_support_session_activity();