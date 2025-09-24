-- Create banners table for moderator announcements
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Create policies for banners
CREATE POLICY "Anyone can view active banners" 
ON public.banners 
FOR SELECT 
USING (true);

CREATE POLICY "Moderators can manage banners" 
ON public.banners 
FOR ALL 
USING (is_moderator(auth.uid()));

-- Create notifications table for @ mentions and other notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'mention' CHECK (type IN ('mention', 'warning', 'message', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_sound_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  metadata JSONB NULL
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Moderators can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (is_moderator(auth.uid()));

-- Add do not disturb status to profiles
ALTER TABLE public.profiles 
ADD COLUMN do_not_disturb BOOLEAN DEFAULT false;

-- Create trigger for updating banners timestamp
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to send mention notification
CREATE OR REPLACE FUNCTION public.send_mention_notification(
  target_user_id UUID,
  sender_name TEXT,
  message_content TEXT,
  conversation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if target user has do not disturb enabled
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = target_user_id 
    AND do_not_disturb = true
  ) THEN
    -- Still create notification but disable sound
    INSERT INTO public.notifications (
      user_id, 
      type, 
      title, 
      message, 
      is_sound_enabled,
      metadata
    ) VALUES (
      target_user_id,
      'mention',
      'You were mentioned',
      sender_name || ' mentioned you: ' || LEFT(message_content, 100) || CASE WHEN LENGTH(message_content) > 100 THEN '...' ELSE '' END,
      false,
      jsonb_build_object('conversation_id', conversation_id, 'sender_name', sender_name)
    );
  ELSE
    -- Normal notification with sound
    INSERT INTO public.notifications (
      user_id, 
      type, 
      title, 
      message, 
      is_sound_enabled,
      metadata
    ) VALUES (
      target_user_id,
      'mention',
      'You were mentioned',
      sender_name || ' mentioned you: ' || LEFT(message_content, 100) || CASE WHEN LENGTH(message_content) > 100 THEN '...' ELSE '' END,
      true,
      jsonb_build_object('conversation_id', conversation_id, 'sender_name', sender_name)
    );
  END IF;
END;
$$;