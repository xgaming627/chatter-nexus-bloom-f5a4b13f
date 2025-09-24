-- Add RLS policy to allow deletion of conversations by participants
CREATE POLICY "Users can delete conversations they participate in" 
ON public.conversations 
FOR DELETE 
USING (auth.uid() = ANY (participants));

-- Add RLS policy to allow deletion of messages by sender or moderators  
CREATE POLICY "Users can delete their own messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id OR is_moderator(auth.uid()));

-- Update messages table to support soft deletes (already has deleted column)
-- Add trigger to update conversation updated_at when messages are added/updated
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
  AFTER INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();