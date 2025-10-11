-- Fix RLS policies for community chat and special conversations

-- Update messages RLS to allow inserts to community and news conversations
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;

CREATE POLICY "Users can create messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  (auth.uid() = sender_id) AND 
  (
    -- Regular conversations where user is participant
    conversation_id IN (
      SELECT conversations.id
      FROM conversations
      WHERE auth.uid() = ANY (conversations.participants)
    )
    OR
    -- Special conversations (news and community) - all authenticated users can post
    conversation_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
  )
);

-- Fix conversations policy to allow authenticated users to access special conversations
DROP POLICY IF EXISTS "Users can view conversations they participate in or special con" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in or special conversations"
ON public.conversations
FOR SELECT
USING (
  (auth.uid() = ANY (participants)) OR 
  (id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002') AND auth.uid() IS NOT NULL)
);

DROP POLICY IF EXISTS "Users can update conversations they participate in or special c" ON public.conversations;

CREATE POLICY "Users can update conversations they participate in or special conversations"
ON public.conversations
FOR UPDATE
USING (
  (auth.uid() = ANY (participants)) OR 
  (id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002') AND auth.uid() IS NOT NULL)
);

-- Fix call_notifications to handle special conversations
DROP POLICY IF EXISTS "Users can view their call notifications" ON public.call_notifications;

CREATE POLICY "Users can view their call notifications"
ON public.call_notifications
FOR SELECT
USING (
  (auth.uid() = caller_id) OR 
  (auth.uid() = receiver_id) OR
  -- Allow viewing call notifications for special conversation rooms
  (room_name LIKE 'conv_00000000-0000-0000-0000-00000000000%' AND auth.uid() IS NOT NULL)
);