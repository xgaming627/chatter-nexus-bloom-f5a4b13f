-- Fix the message notification function to work with the existing schema
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_info RECORD;
    conversation_info RECORD;
    participant_id UUID;
BEGIN
    -- Only create notifications for messages (not system messages)
    IF NEW.conversation_id IS NOT NULL AND NOT NEW.is_system_message THEN
        -- Get sender info
        SELECT display_name, username INTO sender_info
        FROM profiles
        WHERE user_id = NEW.sender_id;
        
        -- Get conversation info including participants
        SELECT participants, is_group_chat, group_name INTO conversation_info
        FROM conversations
        WHERE id = NEW.conversation_id;
        
        -- Create notifications for all participants except the sender
        IF conversation_info.participants IS NOT NULL THEN
            FOREACH participant_id IN ARRAY conversation_info.participants
            LOOP
                -- Skip the sender
                IF participant_id != NEW.sender_id THEN
                    INSERT INTO notifications (
                        user_id,
                        type,
                        title,
                        message,
                        is_sound_enabled,
                        metadata
                    ) VALUES (
                        participant_id,
                        'message',
                        CASE 
                            WHEN conversation_info.is_group_chat THEN
                                COALESCE(sender_info.display_name, sender_info.username, 'Someone') || ' in ' || COALESCE(conversation_info.group_name, 'group chat')
                            ELSE
                                COALESCE(sender_info.display_name, sender_info.username, 'Someone') || ' sent you a message'
                        END,
                        CASE 
                            WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
                            ELSE NEW.content
                        END,
                        true,
                        jsonb_build_object(
                            'conversationId', NEW.conversation_id,
                            'messageId', NEW.id,
                            'senderId', NEW.sender_id,
                            'isGroupChat', conversation_info.is_group_chat
                        )
                    );
                END IF;
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;