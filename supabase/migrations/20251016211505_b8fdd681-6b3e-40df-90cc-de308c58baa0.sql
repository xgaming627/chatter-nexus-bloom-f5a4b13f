-- Add custom theme columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme_primary_color text DEFAULT '#9b87f5',
ADD COLUMN IF NOT EXISTS theme_background_color text DEFAULT '#1a1b26',
ADD COLUMN IF NOT EXISTS theme_accent_color text DEFAULT '#7e69ab';

-- Remove nexus plus from all users
UPDATE public.profiles 
SET nexus_plus_active = false, 
    nexus_plus_expires_at = NULL 
WHERE nexus_plus_active = true;

-- Get or create the Nexus Plus badge
DO $$
DECLARE
  nexus_plus_badge_id UUID;
BEGIN
  -- Try to find existing Nexus Plus badge
  SELECT id INTO nexus_plus_badge_id 
  FROM public.badge_definitions 
  WHERE name = 'Nexus Plus' 
  LIMIT 1;
  
  -- If not found, create it
  IF nexus_plus_badge_id IS NULL THEN
    INSERT INTO public.badge_definitions (name, description, icon, color)
    VALUES ('Nexus Plus', 'Premium subscriber', '👑', '#FFD700')
    RETURNING id INTO nexus_plus_badge_id;
  END IF;
END $$;

-- Create function to auto-assign Nexus Plus badge when subscription becomes active
CREATE OR REPLACE FUNCTION public.auto_assign_nexus_plus_badge()
RETURNS TRIGGER AS $$
DECLARE
  nexus_plus_badge_id UUID;
BEGIN
  -- Only proceed if nexus_plus_active changed to true
  IF NEW.nexus_plus_active = true AND (OLD.nexus_plus_active IS NULL OR OLD.nexus_plus_active = false) THEN
    -- Get Nexus Plus badge ID
    SELECT id INTO nexus_plus_badge_id 
    FROM public.badge_definitions 
    WHERE name = 'Nexus Plus' 
    LIMIT 1;
    
    IF nexus_plus_badge_id IS NOT NULL THEN
      -- Award badge if not already awarded
      INSERT INTO public.user_badges (user_id, badge_id, awarded_by)
      VALUES (NEW.user_id, nexus_plus_badge_id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Remove badge when subscription expires
  IF NEW.nexus_plus_active = false AND OLD.nexus_plus_active = true THEN
    SELECT id INTO nexus_plus_badge_id 
    FROM public.badge_definitions 
    WHERE name = 'Nexus Plus' 
    LIMIT 1;
    
    IF nexus_plus_badge_id IS NOT NULL THEN
      DELETE FROM public.user_badges 
      WHERE user_id = NEW.user_id AND badge_id = nexus_plus_badge_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-assigning Nexus Plus badge
DROP TRIGGER IF EXISTS auto_assign_nexus_plus_badge_trigger ON public.profiles;
CREATE TRIGGER auto_assign_nexus_plus_badge_trigger
  AFTER UPDATE OF nexus_plus_active ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_nexus_plus_badge();

-- Create Gemini AI bot user profile (system user)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  'gemini@nexuschat.ai',
  crypt('gemini-bot-no-login', gen_salt('bf')),
  now(),
  '{"username": "Gemini", "display_name": "Gemini AI", "is_bot": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (user_id, username, display_name, description, online_status, photo_url)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  'gemini',
  'Gemini AI',
  '🤖 AI Assistant powered by Google Gemini - Nexus Plus exclusive',
  'online',
  'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg'
)
ON CONFLICT (user_id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  online_status = EXCLUDED.online_status;