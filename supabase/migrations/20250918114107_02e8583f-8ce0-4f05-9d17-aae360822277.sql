-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  description TEXT,
  online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'away', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participants UUID[] NOT NULL,
  is_group_chat BOOLEAN NOT NULL DEFAULT false,
  group_name TEXT,
  group_photo_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  delivered BOOLEAN NOT NULL DEFAULT true,
  reported BOOLEAN NOT NULL DEFAULT false,
  flagged_for_moderation BOOLEAN NOT NULL DEFAULT false,
  deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  is_system_message BOOLEAN NOT NULL DEFAULT false
);

-- Create support_sessions table
CREATE TABLE public.support_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'requested-end')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  last_read_by_moderator BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support_messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'moderator', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_support_sessions_user_id ON support_sessions(user_id);
CREATE INDEX idx_support_sessions_status ON support_sessions(status);
CREATE INDEX idx_support_messages_session_id ON support_messages(session_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON public.conversations 
FOR SELECT USING (auth.uid() = ANY(participants));
CREATE POLICY "Users can create conversations" ON public.conversations 
FOR INSERT WITH CHECK (auth.uid() = created_by AND auth.uid() = ANY(participants));
CREATE POLICY "Users can update conversations they participate in" ON public.conversations 
FOR UPDATE USING (auth.uid() = ANY(participants));

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages 
FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE auth.uid() = ANY(participants)
  )
);
CREATE POLICY "Users can create messages in their conversations" ON public.messages 
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  conversation_id IN (
    SELECT id FROM conversations WHERE auth.uid() = ANY(participants)
  )
);
CREATE POLICY "Users can update their own messages" ON public.messages 
FOR UPDATE USING (auth.uid() = sender_id);

-- RLS Policies for support_sessions  
CREATE POLICY "Users can view their own support sessions" ON public.support_sessions 
FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own support sessions" ON public.support_sessions 
FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own support sessions" ON public.support_sessions 
FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages in their support sessions" ON public.support_messages 
FOR SELECT USING (
  session_id IN (
    SELECT id FROM support_sessions WHERE auth.uid() = user_id
  )
);
CREATE POLICY "Users can create messages in their support sessions" ON public.support_messages 
FOR INSERT WITH CHECK (
  session_id IN (
    SELECT id FROM support_sessions WHERE auth.uid() = user_id
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_sessions_updated_at BEFORE UPDATE ON public.support_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();