-- Add 20 badge definitions with proper unique constraint
DO $$
BEGIN
  -- Create unique index if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'badge_definitions_name_key') THEN
    CREATE UNIQUE INDEX badge_definitions_name_key ON public.badge_definitions(name);
  END IF;
END $$;

-- Insert badges
INSERT INTO public.badge_definitions (name, color, icon, description) VALUES
('OG', '#FFD700', '👑', 'Original member of Nexus'),
('Rich', '#00FF00', '💰', 'Purchased Nexus Plus'),
('Elite', '#9D00FF', '⭐', 'Elite community member'),
('Developer', '#00CED1', '💻', 'Nexus developer'),
('Supporter', '#FF1493', '❤️', 'Community supporter'),
('Legend', '#FF4500', '🔥', 'Legendary status'),
('Verified', '#1E90FF', '✓', 'Verified account'),
('Artist', '#FF69B4', '🎨', 'Creative artist'),
('Helper', '#32CD32', '🤝', 'Community helper'),
('VIP', '#FFD700', '👔', 'VIP member'),
('Beta', '#8A2BE2', '🧪', 'Beta tester'),
('Bug Hunter', '#FF6347', '🐛', 'Found critical bugs'),
('Streamer', '#9146FF', '📹', 'Content creator'),
('Gamer', '#00FF7F', '🎮', 'Gaming enthusiast'),
('Photographer', '#FF8C00', '📸', 'Photography expert'),
('Musician', '#DA70D6', '🎵', 'Music creator'),
('Writer', '#4682B4', '✍️', 'Content writer'),
('Early Adopter', '#FFD700', '🌟', 'Early platform adopter'),
('Contributor', '#228B22', '💡', 'Code contributor'),
('Partner', '#8B008B', '🤝', 'Official partner')
ON CONFLICT (name) DO NOTHING;

-- Update messages table to properly handle reported messages
ALTER TABLE public.reported_messages DROP CONSTRAINT IF EXISTS reported_messages_message_id_fkey;

-- Add unique constraint to prevent duplicate reports (drop first if exists)
ALTER TABLE public.reported_messages DROP CONSTRAINT IF EXISTS unique_report_per_user_message;
ALTER TABLE public.reported_messages ADD CONSTRAINT unique_report_per_user_message 
UNIQUE (reported_by, message_id);

ALTER TABLE public.reported_profiles DROP CONSTRAINT IF EXISTS unique_report_per_user_profile;
ALTER TABLE public.reported_profiles ADD CONSTRAINT unique_report_per_user_profile
UNIQUE (reported_by, reported_user_id);

-- Drop old policy if exists
DROP POLICY IF EXISTS "Only moderators can send messages in News" ON public.messages;

-- Update RLS policies for messages in News conversation (moderators only can post)
CREATE POLICY "Only moderators can send messages in News" ON public.messages
FOR INSERT
WITH CHECK (
  (conversation_id != '00000000-0000-0000-0000-000000000001') 
  OR 
  (conversation_id = '00000000-0000-0000-0000-000000000001' AND is_moderator(auth.uid()))
);

-- Ensure all users are in Community and News conversations
DO $$
DECLARE
  user_record RECORD;
  news_participants UUID[];
  community_participants UUID[];
BEGIN
  -- Get current participants
  SELECT participants INTO news_participants 
  FROM public.conversations 
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  SELECT participants INTO community_participants 
  FROM public.conversations 
  WHERE id = '00000000-0000-0000-0000-000000000002';
  
  -- Add all users to News and Community if not already there
  FOR user_record IN SELECT user_id FROM public.profiles LOOP
    -- Add to News
    IF news_participants IS NOT NULL AND NOT (user_record.user_id = ANY(news_participants)) THEN
      UPDATE public.conversations 
      SET participants = array_append(participants, user_record.user_id)
      WHERE id = '00000000-0000-0000-0000-000000000001';
    END IF;
    
    -- Add to Community
    IF community_participants IS NOT NULL AND NOT (user_record.user_id = ANY(community_participants)) THEN
      UPDATE public.conversations 
      SET participants = array_append(participants, user_record.user_id)
      WHERE id = '00000000-0000-0000-0000-000000000002';
    END IF;
  END LOOP;
END $$;

-- Add active item tracking to purchased_items
ALTER TABLE public.purchased_items ADD COLUMN IF NOT EXISTS equipped_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchased_items_active ON public.purchased_items(user_id, is_active) WHERE is_active = true;