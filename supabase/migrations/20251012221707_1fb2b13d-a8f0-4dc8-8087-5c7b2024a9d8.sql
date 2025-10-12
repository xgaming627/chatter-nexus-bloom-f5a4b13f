-- Add profile customization columns for Nexus Plus features
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS banner_color TEXT DEFAULT '#1a1b26',
ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
ADD COLUMN IF NOT EXISTS custom_name_color TEXT,
ADD COLUMN IF NOT EXISTS read_receipts_enabled BOOLEAN DEFAULT true;

-- Create message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reactions FOR SELECT
USING (
  message_id IN (
    SELECT m.id FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE auth.uid() = ANY(c.participants)
  )
);

CREATE POLICY "Users can add reactions to messages in their conversations"
ON public.message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  message_id IN (
    SELECT m.id FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE auth.uid() = ANY(c.participants)
  )
);

CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Create reported profiles table
CREATE TABLE IF NOT EXISTS public.reported_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_user_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  saved_username TEXT,
  saved_display_name TEXT,
  saved_photo_url TEXT,
  saved_description TEXT,
  saved_banner_color TEXT,
  saved_banner_image_url TEXT
);

ALTER TABLE public.reported_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report profiles"
ON public.reported_profiles FOR INSERT
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Moderators can view all profile reports"
ON public.reported_profiles FOR SELECT
USING (is_moderator(auth.uid()));

CREATE POLICY "Moderators can update profile reports"
ON public.reported_profiles FOR UPDATE
USING (is_moderator(auth.uid()));

-- Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friends"
ON public.friends FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can add friends"
ON public.friends FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend status"
ON public.friends FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete friends"
ON public.friends FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Add ignored_users table for ignore functionality
CREATE TABLE IF NOT EXISTS public.ignored_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ignored_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ignored_user_id)
);

ALTER TABLE public.ignored_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their ignored users"
ON public.ignored_users FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can ignore other users"
ON public.ignored_users FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unignore users"
ON public.ignored_users FOR DELETE
USING (auth.uid() = user_id);

-- Update license_keys table to support different durations
ALTER TABLE public.license_keys
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 3;

-- Add system message support to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS system_message_type TEXT;

-- Enable realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reported_profiles_status ON public.reported_profiles(status);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);