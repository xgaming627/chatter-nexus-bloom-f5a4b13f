-- Add real IP tracking fields to support_sessions table
ALTER TABLE public.support_sessions 
ADD COLUMN IF NOT EXISTS ipv4_address TEXT,
ADD COLUMN IF NOT EXISTS ipv6_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS vpn_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create function to get user's real email from auth.users
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_uuid uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email from auth.users table
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN user_email;
END;
$$;

-- Update support_sessions to include user email when created
CREATE OR REPLACE FUNCTION public.update_support_session_with_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set user email from auth.users
  NEW.user_email := public.get_user_email_by_id(NEW.user_id);
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically populate user data
DROP TRIGGER IF EXISTS support_session_user_data_trigger ON public.support_sessions;
CREATE TRIGGER support_session_user_data_trigger
  BEFORE INSERT ON public.support_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_session_with_user_data();