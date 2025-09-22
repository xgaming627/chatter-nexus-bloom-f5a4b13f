-- Phase 1: Fix the handle_new_user function to not use email as username/display_name
-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, online_status)
  VALUES (
    NEW.id,
    NULL, -- Don't auto-assign username from email
    NULL, -- Don't auto-assign display_name from email  
    'offline'
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Clean up existing profiles that have emails as usernames/display_names
UPDATE public.profiles 
SET username = NULL, display_name = NULL 
WHERE username LIKE '%@%' OR display_name LIKE '%@%';

-- Add unique constraint on username to prevent duplicates (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_unique') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END
$$;

-- Create login_sessions table for real login tracking
CREATE TABLE IF NOT EXISTS public.login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on login_sessions
ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own login sessions" ON public.login_sessions;
DROP POLICY IF EXISTS "Moderators can view all login sessions" ON public.login_sessions;
DROP POLICY IF EXISTS "Moderators can update usernames" ON public.profiles;

-- Policy for users to view their own login sessions
CREATE POLICY "Users can view their own login sessions"
ON public.login_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Policy for moderators to view all login sessions  
CREATE POLICY "Moderators can view all login sessions"
ON public.login_sessions FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE display_name IN ('vitorrossato812@gmail.com', 'lukasbraga77@gmail.com')
    OR user_id = auth.uid()
  )
);

-- Add username editing capability for moderators
CREATE POLICY "Moderators can update usernames"
ON public.profiles FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE display_name IN ('vitorrossato812@gmail.com', 'lukasbraga77@gmail.com')
  )
);