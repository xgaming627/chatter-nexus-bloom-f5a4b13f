-- Add policy to allow users to search for other users to start conversations
CREATE POLICY "Users can search profiles for conversations" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_id != auth.uid()
  AND username IS NOT NULL
);