-- Create notifications for messages and calls
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_info RECORD;
    recipient_id UUID;
BEGIN
    -- Only create notifications for direct messages (not group chats for now)
    IF NEW.conversation_id IS NOT NULL THEN
        -- Get sender info
        SELECT display_name, username INTO sender_info
        FROM profiles
        WHERE user_id = NEW.sender_id;
        
        -- Get the recipient (the other participant in the conversation)
        SELECT DISTINCT participant_id INTO recipient_id
        FROM conversation_participants cp
        WHERE cp.conversation_id = NEW.conversation_id
        AND cp.participant_id != NEW.sender_id
        LIMIT 1;
        
        -- Create notification for the recipient
        IF recipient_id IS NOT NULL AND recipient_id != NEW.sender_id THEN
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                is_sound_enabled,
                metadata
            ) VALUES (
                recipient_id,
                'message',
                COALESCE(sender_info.display_name, sender_info.username, 'Someone') || ' sent you a message',
                CASE 
                    WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
                    ELSE NEW.content
                END,
                true,
                jsonb_build_object(
                    'conversationId', NEW.conversation_id,
                    'messageId', NEW.id,
                    'senderId', NEW.sender_id
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message notifications
DROP TRIGGER IF EXISTS message_notification_trigger ON messages;
CREATE TRIGGER message_notification_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_notification();

-- Add metadata column to call_rooms for group calls
ALTER TABLE call_rooms ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update call rooms table to support group calls
ALTER TABLE call_rooms ADD COLUMN IF NOT EXISTS participant_ids UUID[] DEFAULT '{}';

-- Create index for better performance on call room lookups
CREATE INDEX IF NOT EXISTS idx_call_rooms_participants ON call_rooms USING GIN(participant_ids);

-- Add RLS policy for call rooms to support group calls
DROP POLICY IF EXISTS "Users can see call rooms they participate in" ON call_rooms;
CREATE POLICY "Users can see call rooms they participate in"
ON call_rooms
FOR SELECT
USING (
    auth.uid() = caller_id OR 
    auth.uid() = callee_id OR 
    auth.uid() = ANY(participant_ids)
);

-- Update call rooms insert policy
DROP POLICY IF EXISTS "Users can create call rooms" ON call_rooms;
CREATE POLICY "Users can create call rooms"
ON call_rooms
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Update call rooms update policy
DROP POLICY IF EXISTS "Users can update call rooms they participate in" ON call_rooms;
CREATE POLICY "Users can update call rooms they participate in"
ON call_rooms
FOR UPDATE
USING (
    auth.uid() = caller_id OR 
    auth.uid() = callee_id OR 
    auth.uid() = ANY(participant_ids)
);