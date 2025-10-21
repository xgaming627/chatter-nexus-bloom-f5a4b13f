-- Drop existing policies that conflict
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Only moderators can send messages in News" ON public.messages;

-- Allow everyone to view messages in News and Community
CREATE POLICY "Users can view messages in their conversations or special chats"
ON public.messages
FOR SELECT
USING (
  -- Allow viewing in News and Community for everyone
  (conversation_id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid))
  OR
  -- Allow viewing in regular conversations if user is participant and not blocked
  (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE auth.uid() = ANY(participants)
    )
    AND NOT EXISTS (
      SELECT 1 FROM friends
      WHERE status = 'blocked'
      AND (
        (user_id = auth.uid() AND friend_id = messages.sender_id)
        OR (friend_id = auth.uid() AND user_id = messages.sender_id)
      )
    )
  )
);

-- Allow everyone to send in Community, only moderators in News, and normal participants in regular chats
CREATE POLICY "Users can send messages based on chat type"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    -- Allow everyone to send in Community
    (conversation_id = '00000000-0000-0000-0000-000000000002'::uuid)
    OR
    -- Only moderators can send in News
    (conversation_id = '00000000-0000-0000-0000-000000000001'::uuid AND is_moderator(auth.uid()))
    OR
    -- Regular conversations: user must be participant and not blocked
    (
      conversation_id IN (
        SELECT id FROM conversations 
        WHERE auth.uid() = ANY(participants)
      )
      AND NOT EXISTS (
        SELECT 1 FROM friends
        WHERE status = 'blocked'
        AND (
          (user_id = auth.uid() AND friend_id IN (
            SELECT unnest(participants) FROM conversations WHERE id = messages.conversation_id
          ))
          OR (friend_id = auth.uid() AND user_id IN (
            SELECT unnest(participants) FROM conversations WHERE id = messages.conversation_id
          ))
        )
      )
    )
  )
);