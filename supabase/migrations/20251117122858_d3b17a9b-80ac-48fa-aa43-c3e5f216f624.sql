-- Get the first admin user ID to use as creator
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the first admin user
  SELECT user_id INTO admin_user_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;

  -- If no admin found, get the first user
  IF admin_user_id IS NULL THEN
    SELECT user_id INTO admin_user_id
    FROM public.profiles
    LIMIT 1;
  END IF;

  -- Create Nexus Community conversation if it doesn't exist
  INSERT INTO public.conversations (
    id,
    created_by,
    created_by_role,
    participants,
    is_group_chat,
    is_system_conversation,
    group_name,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000004',
    admin_user_id,
    'admin',
    ARRAY(SELECT user_id FROM public.profiles),
    true,
    true,
    'Nexus Community',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET participants = ARRAY(SELECT user_id FROM public.profiles);
END $$;

-- Create a trigger to automatically add new users to Nexus Community
CREATE OR REPLACE FUNCTION add_user_to_nexus_community()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the new user to the Nexus Community conversation
  UPDATE public.conversations
  SET participants = array_append(participants, NEW.user_id)
  WHERE id = '00000000-0000-0000-0000-000000000004'
  AND NOT (NEW.user_id = ANY(participants));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_add_to_nexus ON public.profiles;

-- Create trigger that fires when a new profile is created
CREATE TRIGGER on_profile_created_add_to_nexus
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION add_user_to_nexus_community();