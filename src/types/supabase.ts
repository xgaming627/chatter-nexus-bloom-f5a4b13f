
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  timestamp: Date;
  read: boolean;
  delivered: boolean;
  reported: boolean;
  flagged_for_moderation: boolean;
  deleted: boolean;
  deleted_by?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  is_group_chat: boolean;
  group_name?: string;
  group_photo_url?: string;
  created_by: string;
  created_at: Date;
  last_message?: {
    content: string;
    timestamp: Date;
    sender_id: string;
  };
}

export interface UserMessageCooldown {
  user_id: string;
  last_message_time: Date;
}
