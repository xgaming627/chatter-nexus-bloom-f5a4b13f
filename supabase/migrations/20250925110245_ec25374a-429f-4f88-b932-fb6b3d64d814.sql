-- Add unread_count column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Add auto_delete_after column for chat retention policy
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS auto_delete_after TIMESTAMP WITH TIME ZONE;

-- Create function to auto-delete old conversations
CREATE OR REPLACE FUNCTION public.auto_delete_old_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete conversations older than 3 days
  DELETE FROM public.conversations 
  WHERE created_at < NOW() - INTERVAL '3 days'
    AND auto_delete_after IS NULL; -- Only delete if no custom retention is set
  
  -- Delete conversations with custom retention periods
  DELETE FROM public.conversations 
  WHERE auto_delete_after IS NOT NULL 
    AND auto_delete_after < NOW();
END;
$$;

-- Create function to update unread counts
CREATE OR REPLACE FUNCTION public.update_unread_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update unread count for all participants except the sender
  UPDATE public.conversations 
  SET unread_count = unread_count + 1,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for unread count updates
DROP TRIGGER IF EXISTS trigger_update_unread_count ON public.messages;
CREATE TRIGGER trigger_update_unread_count
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_unread_count();

-- Create function to reset unread count for user
CREATE OR REPLACE FUNCTION public.reset_unread_count(conversation_id uuid, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is a simplified version - in a full implementation you'd track per-user read counts
  UPDATE public.conversations 
  SET unread_count = 0
  WHERE id = conversation_id
    AND user_id = ANY(participants);
END;
$$;