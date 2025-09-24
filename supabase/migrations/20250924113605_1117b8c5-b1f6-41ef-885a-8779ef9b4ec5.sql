-- Fix security issues identified in comprehensive security review

-- 1. Add missing RLS policies for login_sessions table
-- Allow edge functions to insert login records
CREATE POLICY "Edge functions can insert login records" 
ON public.login_sessions 
FOR INSERT 
WITH CHECK (true); -- Service role bypasses RLS anyway, but this makes intent clear

-- Prevent unauthorized updates/deletes on login_sessions
CREATE POLICY "No unauthorized updates on login sessions" 
ON public.login_sessions 
FOR UPDATE 
USING (false); -- Completely prevent updates

CREATE POLICY "No unauthorized deletes on login sessions" 
ON public.login_sessions 
FOR DELETE 
USING (false); -- Completely prevent deletes

-- 2. Create user roles system to replace hardcoded moderator checks
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create function to check if user is moderator (replaces hardcoded checks)
CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- 5. Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Update user_warnings policies to use new role system
DROP POLICY IF EXISTS "Moderators can create warnings" ON public.user_warnings;
DROP POLICY IF EXISTS "Moderators can view all warnings" ON public.user_warnings;

CREATE POLICY "Moderators can create warnings" 
ON public.user_warnings 
FOR INSERT 
WITH CHECK (
  issued_by = auth.uid() 
  AND public.is_moderator(auth.uid())
);

CREATE POLICY "Moderators can view all warnings" 
ON public.user_warnings 
FOR SELECT 
USING (
  user_id = auth.uid() -- Users can see their own warnings
  OR public.is_moderator(auth.uid()) -- Moderators can see all warnings
);

-- 7. Update support_messages and support_sessions for moderator access
CREATE POLICY "Moderators can view all support messages" 
ON public.support_messages 
FOR SELECT 
USING (
  session_id IN (
    SELECT support_sessions.id
    FROM support_sessions
    WHERE auth.uid() = support_sessions.user_id
  )
  OR public.is_moderator(auth.uid())
);

CREATE POLICY "Moderators can create support messages" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  session_id IN (
    SELECT support_sessions.id
    FROM support_sessions
    WHERE auth.uid() = support_sessions.user_id
  )
  OR public.is_moderator(auth.uid())
);

CREATE POLICY "Moderators can view all support sessions" 
ON public.support_sessions 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR public.is_moderator(auth.uid())
);

CREATE POLICY "Moderators can update support sessions" 
ON public.support_sessions 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR public.is_moderator(auth.uid())
);

-- 8. Insert default moderator roles for existing moderators
-- (Replace with actual moderator user IDs when known)
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'moderator'::app_role
FROM public.profiles p
WHERE p.display_name IN ('vitorrossato812@gmail.com', 'lukasbraga77@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 9. Update get_users_for_moderators function to use new role system
DROP FUNCTION IF EXISTS public.get_users_for_moderators();

CREATE OR REPLACE FUNCTION public.get_users_for_moderators()
RETURNS TABLE(user_id uuid, username text, display_name text, email text, photo_url text, description text, online_status text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is a moderator using new role system
  IF NOT public.is_moderator(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Moderator permissions required';
  END IF;

  -- Return user data with emails for moderators
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    au.email,
    p.photo_url,
    p.description,
    p.online_status,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- 10. Add updated_at trigger for user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();