-- Prevent renaming of special conversations (News and Community)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS is_system_conversation BOOLEAN DEFAULT false;

UPDATE public.conversations
SET is_system_conversation = true
WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

-- Add shop badges that users can purchase (only if they don't exist)
INSERT INTO public.badge_definitions (name, description, icon, color) 
SELECT 'Premium Member', 'Exclusive premium badge', '💎', '#9333ea'
WHERE NOT EXISTS (SELECT 1 FROM public.badge_definitions WHERE name = 'Premium Member');

INSERT INTO public.badge_definitions (name, description, icon, color) 
SELECT 'Early Supporter', 'Joined in the early days', '🌟', '#0ea5e9'
WHERE NOT EXISTS (SELECT 1 FROM public.badge_definitions WHERE name = 'Early Supporter');

INSERT INTO public.badge_definitions (name, description, icon, color) 
SELECT 'Legend', 'Legendary status achieved', '👑', '#eab308'
WHERE NOT EXISTS (SELECT 1 FROM public.badge_definitions WHERE name = 'Legend');

-- Add shop items for badges (only if they don't exist)
INSERT INTO public.shop_items (name, description, price, item_type, item_data, is_active)
SELECT 'Premium Badge', 'Show off your premium status', 1000, 'badge', '{"badge_name": "Premium Member"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.shop_items WHERE name = 'Premium Badge');

INSERT INTO public.shop_items (name, description, price, item_type, item_data, is_active)
SELECT 'Early Supporter Badge', 'For early adopters', 800, 'badge', '{"badge_name": "Early Supporter"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.shop_items WHERE name = 'Early Supporter Badge');

INSERT INTO public.shop_items (name, description, price, item_type, item_data, is_active)
SELECT 'Legend Badge', 'Become a legend', 1500, 'badge', '{"badge_name": "Legend"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.shop_items WHERE name = 'Legend Badge');

-- Add equipped_slot column to purchased_items for better item management
ALTER TABLE public.purchased_items
ADD COLUMN IF NOT EXISTS equipped_slot TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchased_items_equipped
ON public.purchased_items(user_id, is_active, equipped_slot)
WHERE is_active = true;