-- Communities System
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_link TEXT UNIQUE NOT NULL,
  is_nexus_plus_exclusive BOOLEAN DEFAULT true,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Community members tracking (for ownership transfer and permissions)
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Friends System
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Feed System
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'text')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Feed likes and comments
CREATE TABLE IF NOT EXISTS public.feed_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT CHECK (interaction_type IN ('like', 'comment')),
  comment_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id, interaction_type)
);

-- Blocked words filter
CREATE TABLE IF NOT EXISTS public.blocked_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily login streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  streak_rewards JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User levels and XP
CREATE TABLE IF NOT EXISTS public.user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  titles JSONB DEFAULT '[]'::jsonb,
  equipped_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Message threads (Discord-style)
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  name TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Thread messages
CREATE TABLE IF NOT EXISTS public.thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Polls
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  votes JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily/Weekly challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT CHECK (challenge_type IN ('daily', 'weekly')),
  requirement JSONB NOT NULL,
  reward JSONB NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, challenge_id)
);

-- User inventory for cosmetics/items
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT CHECK (item_type IN ('title', 'decoration', 'theme', 'emoji', 'border', 'background')),
  item_data JSONB NOT NULL,
  equipped BOOLEAN DEFAULT false,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add messages_sent counter to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0;

-- Enable RLS on all new tables
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Communities
CREATE POLICY "Users can view communities they're members of"
  ON public.communities FOR SELECT
  USING (
    id IN (
      SELECT community_id FROM public.community_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Nexus Plus users can create communities"
  ON public.communities FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND nexus_plus_active = true
    )
  );

CREATE POLICY "Community owners can update their communities"
  ON public.communities FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Community owners can delete their communities"
  ON public.communities FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for Community Members
CREATE POLICY "Users can view community members"
  ON public.community_members FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM public.community_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Community owners can manage members"
  ON public.community_members FOR ALL
  USING (
    community_id IN (
      SELECT id FROM public.communities
      WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for Friend Requests
CREATE POLICY "Users can view their friend requests"
  ON public.friend_requests FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their received requests"
  ON public.friend_requests FOR UPDATE
  USING (receiver_id = auth.uid());

-- RLS Policies for Feed
CREATE POLICY "Users can view approved feed posts"
  ON public.feed_posts FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Users can create feed posts"
  ON public.feed_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Moderators can review feed posts"
  ON public.feed_posts FOR UPDATE
  USING (public.is_moderator(auth.uid()));

-- RLS Policies for User Streaks
CREATE POLICY "Users can view their own streak"
  ON public.user_streaks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own streak"
  ON public.user_streaks FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for User Levels
CREATE POLICY "Users can view all levels"
  ON public.user_levels FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own level"
  ON public.user_levels FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for Inventory
CREATE POLICY "Users can view their own inventory"
  ON public.user_inventory FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own inventory"
  ON public.user_inventory FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for Polls
CREATE POLICY "Users can view polls in their conversations"
  ON public.polls FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can create polls in their conversations"
  ON public.polls FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE auth.uid() = ANY(participants)
    ) AND creator_id = auth.uid()
  );

-- Function to update message counter
CREATE OR REPLACE FUNCTION update_message_counter()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET messages_sent = messages_sent + 1
  WHERE user_id = NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment message counter
CREATE TRIGGER increment_message_counter
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_counter();

-- Function to calculate XP required for next level
CREATE OR REPLACE FUNCTION calculate_xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN 100 * level * level;
END;
$$ LANGUAGE plpgsql;