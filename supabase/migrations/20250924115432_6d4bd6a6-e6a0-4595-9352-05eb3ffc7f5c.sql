-- Fix infinite recursion in profiles RLS policies
-- Only drop and recreate the problematic recursive policies

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Profiles can be searched by moderators" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of conversation partners" ON public.profiles;
DROP POLICY IF EXISTS "Moderators can update usernames" ON public.profiles;

-- Create simpler, safer policies without recursion

-- Allow moderators to view all profiles (using new role system)
CREATE POLICY "Moderators can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR public.is_moderator(auth.uid())
);

-- Allow moderators to update any profile
CREATE POLICY "Moderators can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (public.is_moderator(auth.uid()));

-- Allow users in same conversations to see each other's profiles
-- Use direct SQL without recursive function calls
CREATE POLICY "Allow conversation partners to see profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR public.is_moderator(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE auth.uid() = ANY(participants) 
    AND user_id = ANY(participants)
  )
);