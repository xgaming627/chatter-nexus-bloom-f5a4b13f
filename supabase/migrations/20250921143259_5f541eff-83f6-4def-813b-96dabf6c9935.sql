-- Drop the overly permissive policy
DROP POLICY "Users can view all profiles" ON public.profiles;

-- Create a security definer function to check if users share conversations
CREATE OR REPLACE FUNCTION public.users_share_conversation(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if both users are participants in the same conversation
  RETURN EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE user1_id = ANY(participants) 
    AND user2_id = ANY(participants)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create a function to check if a user can view another user's profile during search
CREATE OR REPLACE FUNCTION public.can_view_profile_for_search(target_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Allow viewing during search for conversation creation, but limit exposure
  -- This is a controlled search context
  RETURN auth.uid() IS NOT NULL AND target_user_id != auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create new restrictive RLS policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view profiles of conversation partners" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() != user_id 
  AND public.users_share_conversation(auth.uid(), user_id)
);

-- Keep the existing insert and update policies as they are properly restricted
-- INSERT: Users can insert their own profile (auth.uid() = user_id)
-- UPDATE: Users can update their own profile (auth.uid() = user_id)