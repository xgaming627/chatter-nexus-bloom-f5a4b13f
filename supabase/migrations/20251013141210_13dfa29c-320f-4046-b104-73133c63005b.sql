-- Add points system
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can update points"
  ON public.user_points FOR UPDATE
  USING (public.is_moderator(auth.uid()));

CREATE POLICY "System can insert points"
  ON public.user_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add referral codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Track referral usage
CREATE TABLE IF NOT EXISTS public.referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 400,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their referrals"
  ON public.referral_uses FOR SELECT
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- Badge definitions
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badge definitions"
  ON public.badge_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage badge definitions"
  ON public.badge_definitions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- User badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  awarded_by UUID REFERENCES auth.users(id),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "Admins can award badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can remove badges"
  ON public.user_badges FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Shop items
CREATE TABLE IF NOT EXISTS public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  item_type TEXT NOT NULL, -- 'avatar_frame', 'profile_effect', 'badge', etc.
  item_data JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shop items"
  ON public.shop_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage shop items"
  ON public.shop_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Purchased items
CREATE TABLE IF NOT EXISTS public.purchased_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, shop_item_id)
);

ALTER TABLE public.purchased_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their purchases"
  ON public.purchased_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase items"
  ON public.purchased_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can activate/deactivate items"
  ON public.purchased_items FOR UPDATE
  USING (auth.uid() = user_id);

-- Add status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online';

-- Add blocking enforcement through better queries (RLS on messages)
-- Update message policies to prevent blocked users from messaging
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;

CREATE POLICY "Users can create messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id 
    AND (
      (conversation_id IN (
        SELECT conversations.id FROM conversations
        WHERE auth.uid() = ANY(conversations.participants)
      ))
      OR (conversation_id = ANY(ARRAY['00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid]))
    )
    -- Prevent sending to blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.friends
      WHERE status = 'blocked'
      AND (
        (user_id = auth.uid() AND friend_id IN (
          SELECT unnest(participants) FROM conversations WHERE id = conversation_id
        ))
        OR (friend_id = auth.uid() AND user_id IN (
          SELECT unnest(participants) FROM conversations WHERE id = conversation_id
        ))
      )
    )
  );

-- Prevent viewing messages from blocked users
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversations.id FROM conversations
      WHERE auth.uid() = ANY(conversations.participants)
    )
    -- Hide messages from blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.friends
      WHERE status = 'blocked'
      AND (
        (user_id = auth.uid() AND friend_id = sender_id)
        OR (friend_id = auth.uid() AND user_id = sender_id)
      )
    )
  );

-- Add trigger for profile updates
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();