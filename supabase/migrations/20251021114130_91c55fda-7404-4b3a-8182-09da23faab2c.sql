-- Update conversations policies to allow everyone to view News and Community
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations or special chats"
ON public.conversations
FOR SELECT
USING (
  -- Allow viewing News and Community for everyone
  (id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid))
  OR
  -- Allow viewing regular conversations if user is participant
  (auth.uid() = ANY(participants))
);