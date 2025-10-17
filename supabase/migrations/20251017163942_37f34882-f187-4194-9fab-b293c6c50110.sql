-- Create News conversation with fixed ID
INSERT INTO public.conversations (
  id, 
  is_group_chat, 
  group_name, 
  created_by, 
  participants, 
  created_by_role,
  is_system_conversation
)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  true,
  '📰 Nexus News',
  (SELECT user_id FROM public.profiles LIMIT 1),
  COALESCE(ARRAY_AGG(user_id), ARRAY[]::uuid[]),
  'system',
  true
FROM public.profiles
ON CONFLICT (id) DO UPDATE
SET participants = EXCLUDED.participants;

-- Create Community conversation with fixed ID
INSERT INTO public.conversations (
  id, 
  is_group_chat, 
  group_name, 
  created_by, 
  participants, 
  created_by_role,
  is_system_conversation
)
SELECT 
  '00000000-0000-0000-0000-000000000002'::uuid,
  true,
  '🌟 Nexus Community',
  (SELECT user_id FROM public.profiles LIMIT 1),
  COALESCE(ARRAY_AGG(user_id), ARRAY[]::uuid[]),
  'system',
  true
FROM public.profiles
ON CONFLICT (id) DO UPDATE
SET participants = EXCLUDED.participants;

-- Update the handle_new_user function to add users to both conversations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  NEWS_CONVERSATION_ID UUID := '00000000-0000-0000-0000-000000000001';
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
  
  -- Create News conversation if it doesn't exist
  INSERT INTO public.conversations (id, is_group_chat, group_name, created_by, participants, created_by_role, is_system_conversation)
  VALUES (
    NEWS_CONVERSATION_ID,
    true,
    '📰 Nexus News',
    first_user_id,
    ARRAY[NEW.id],
    'system',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET participants = array_append(conversations.participants, NEW.id)
  WHERE NOT (NEW.id = ANY(conversations.participants));
  
  -- Create Community conversation if it doesn't exist
  INSERT INTO public.conversations (id, is_group_chat, group_name, created_by, participants, created_by_role, is_system_conversation)
  VALUES (
    COMMUNITY_CONVERSATION_ID,
    true,
    '🌟 Nexus Community',
    first_user_id,
    ARRAY[NEW.id],
    'system',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET participants = array_append(conversations.participants, NEW.id)
  WHERE NOT (NEW.id = ANY(conversations.participants));
  
  RETURN NEW;
END;
$$;

-- Add welcome messages to News and Community
DO $$
DECLARE
  system_user_id UUID;
BEGIN
  -- Get a system user (first admin or first user)
  SELECT user_id INTO system_user_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;
  
  IF system_user_id IS NULL THEN
    SELECT user_id INTO system_user_id
    FROM public.profiles
    LIMIT 1;
  END IF;
  
  -- Add welcome message to News (only if no messages exist)
  IF NOT EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO public.messages (conversation_id, sender_id, content, is_system_message, system_message_type)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      system_user_id,
      '📰 Welcome to Nexus News! Stay updated with the latest announcements and updates from the Nexus team.',
      true,
      'welcome'
    );
  END IF;
  
  -- Add welcome message to Community (only if no messages exist)
  IF NOT EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO public.messages (conversation_id, sender_id, content, is_system_message, system_message_type)
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      system_user_id,
      '🌟 Welcome to Nexus Community! Connect with other members, share ideas, and be part of our growing community. Say hello! 👋',
      true,
      'welcome'
    );
  END IF;
END $$;