-- Fix RLS policies for special conversations (News and Community)
-- Allow all authenticated users to read these special conversations

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON public.conversations;

-- Recreate policies with special conversation access
CREATE POLICY "Users can view conversations they participate in or special convs"
ON public.conversations
FOR SELECT
USING (
  auth.uid() = ANY (participants) 
  OR id IN (
    '00000000-0000-0000-0000-000000000001'::uuid,  -- News
    '00000000-0000-0000-0000-000000000002'::uuid   -- Community
  )
);

CREATE POLICY "Users can update conversations they participate in or special convs"
ON public.conversations
FOR UPDATE
USING (
  auth.uid() = ANY (participants)
  OR id IN (
    '00000000-0000-0000-0000-000000000001'::uuid,  -- News
    '00000000-0000-0000-0000-000000000002'::uuid   -- Community
  )
);

-- Fix call_notifications RLS to prevent 406 errors
DROP POLICY IF EXISTS "Users can view their call notifications" ON public.call_notifications;

CREATE POLICY "Users can view their call notifications"
ON public.call_notifications
FOR SELECT
USING (
  auth.uid() = caller_id 
  OR auth.uid() = receiver_id
);