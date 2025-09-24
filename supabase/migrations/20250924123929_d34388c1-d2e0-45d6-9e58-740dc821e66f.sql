-- Fix the get_users_for_moderators function to avoid auth.users access issues
CREATE OR REPLACE FUNCTION public.get_users_for_moderators()
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  email text,
  photo_url text,
  description text,
  online_status text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is a moderator using new role system
  IF NOT public.is_moderator(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Moderator permissions required';
  END IF;

  -- Return user data without emails since auth.users is restricted
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    'hidden@privacy.com'::text as email, -- Use placeholder email for privacy
    p.photo_url,
    p.description,
    p.online_status,
    p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;