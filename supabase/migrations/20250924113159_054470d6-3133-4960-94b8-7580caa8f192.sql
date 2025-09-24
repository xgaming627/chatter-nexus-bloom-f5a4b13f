-- Create a secure function for moderators to get user details including emails
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
  -- Check if current user is a moderator
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.display_name IN ('vitorrossato812@gmail.com', 'lukasbraga77@gmail.com')
      OR profiles.user_id IN (
        SELECT au.id FROM auth.users au 
        WHERE au.email IN ('vitorrossato812@gmail.com', 'lukasbraga77@gmail.com')
      )
    )
  ) THEN
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

-- Update the profile search policy to allow moderators to see profiles for search
DROP POLICY IF EXISTS "Profiles can be searched by moderators" ON public.profiles;
CREATE POLICY "Profiles can be searched by moderators" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow moderators to see all profiles for search
  auth.uid() IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.display_name IN ('vitorrossato812@gmail.com', 'lukasbraga77@gmail.com')
  )
  OR 
  -- Allow regular search for conversations
  can_view_profile_for_search(user_id)
  OR 
  -- Allow viewing own profile
  auth.uid() = user_id
  OR
  -- Allow viewing conversation partners
  users_share_conversation(auth.uid(), user_id)
);