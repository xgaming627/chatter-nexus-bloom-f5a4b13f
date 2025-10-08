-- Create moderation logs table for admin tracking
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_type TEXT NOT NULL CHECK (log_type IN ('warn', 'ban', 'username_change', 'message_search', 'account_delete')),
  moderator_id UUID NOT NULL,
  target_user_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs"
  ON public.moderation_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System and moderators can insert logs
CREATE POLICY "Moderators can insert logs"
  ON public.moderation_logs
  FOR INSERT
  WITH CHECK (is_moderator(auth.uid()));

-- Update handle_new_user function to add users to Nexus Community
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  COMMUNITY_CONVERSATION_ID UUID := '00000000-0000-0000-0000-000000000002';
  first_user_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, username, display_name, online_status)
  VALUES (
    NEW.id,
    NULL,
    NULL,
    'offline'
  );
  
  -- Get first admin user for created_by or use NEW.id
  SELECT user_id INTO first_user_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;
  
  IF first_user_id IS NULL THEN
    first_user_id := NEW.id;
  END IF;
  
  -- Create Nexus Community conversation if it doesn't exist
  INSERT INTO public.conversations (id, is_group_chat, group_name, created_by, participants, created_by_role)
  VALUES (
    COMMUNITY_CONVERSATION_ID,
    true,
    '🌟 Nexus Community',
    first_user_id,
    ARRAY[NEW.id],
    'system'
  )
  ON CONFLICT (id) DO UPDATE
  SET participants = array_append(conversations.participants, NEW.id)
  WHERE NOT (NEW.id = ANY(conversations.participants));
  
  RETURN NEW;
END;
$$;