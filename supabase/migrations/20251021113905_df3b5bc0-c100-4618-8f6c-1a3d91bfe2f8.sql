-- Create News and Community conversations if they don't exist
INSERT INTO public.conversations (
  id,
  is_group_chat,
  group_name,
  created_by,
  participants,
  created_by_role,
  is_system_conversation
)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    true,
    '📰 Nexus News',
    (SELECT id FROM auth.users LIMIT 1),
    ARRAY[]::uuid[],
    'system',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    true,
    '🌟 Nexus Community',
    (SELECT id FROM auth.users LIMIT 1),
    ARRAY[]::uuid[],
    'system',
    true
  )
ON CONFLICT (id) DO NOTHING;