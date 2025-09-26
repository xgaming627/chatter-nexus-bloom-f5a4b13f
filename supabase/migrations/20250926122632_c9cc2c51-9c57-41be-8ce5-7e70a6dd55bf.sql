-- Fix the function search path security warning
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;