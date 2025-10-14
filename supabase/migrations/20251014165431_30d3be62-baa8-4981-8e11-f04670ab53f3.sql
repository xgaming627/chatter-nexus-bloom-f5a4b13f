-- Add some initial shop items
INSERT INTO public.shop_items (name, description, price, item_type, item_data) VALUES
('Sparkle Effect', 'Add a magical sparkle animation to your profile', 500, 'profile_effect', '{"effect": "sparkles", "color": "gold"}'),
('Rainbow Frame', 'Colorful rainbow border for your avatar', 800, 'avatar_frame', '{"style": "rainbow", "thickness": 3}'),
('Golden Crown Badge', 'Display a golden crown on your profile', 1200, 'badge', '{"icon": "crown", "color": "gold"}'),
('Purple Glow', 'Purple glow effect around your avatar', 600, 'profile_effect', '{"effect": "glow", "color": "purple"}'),
('Diamond Frame', 'Exclusive diamond-studded avatar frame', 1500, 'avatar_frame', '{"style": "diamond", "thickness": 4}'),
('Fire Effect', 'Fiery animation behind your profile', 1000, 'profile_effect', '{"effect": "fire", "intensity": "high"}')
ON CONFLICT DO NOTHING;

-- Remove duplicates from reported_messages first
DELETE FROM public.reported_messages a
USING public.reported_messages b
WHERE a.id > b.id 
  AND a.message_id = b.message_id 
  AND a.reported_by = b.reported_by;

-- Add unique constraint using standard SQL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_message_report'
  ) THEN
    ALTER TABLE public.reported_messages 
    ADD CONSTRAINT unique_message_report UNIQUE (message_id, reported_by);
  END IF;
END $$;

-- Remove duplicates from reported_profiles
DELETE FROM public.reported_profiles a
USING public.reported_profiles b
WHERE a.id > b.id 
  AND a.reported_user_id = b.reported_user_id 
  AND a.reported_by = b.reported_by;

-- Add unique constraint for profile reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_profile_report'
  ) THEN
    ALTER TABLE public.reported_profiles 
    ADD CONSTRAINT unique_profile_report UNIQUE (reported_user_id, reported_by);
  END IF;
END $$;