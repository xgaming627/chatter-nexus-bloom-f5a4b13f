
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
  
  // Aliases for camelCase compatibility
  get senderId(): string {
    return this.sender_id;
  }
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
  isStored?: boolean;
  participantsInfo?: {
    uid: string;
    displayName: string;
    username: string;
    photoURL?: string;
    email?: string;
    description?: string;
    onlineStatus?: 'online' | 'away' | 'offline';
  }[];
  
  // Aliases for camelCase compatibility
  get isGroupChat(): boolean {
    return this.is_group_chat;
  }
  
  get groupName(): string | undefined {
    return this.group_name;
  }
  
  get groupPhotoURL(): string | undefined {
    return this.group_photo_url;
  }
  
  get lastMessage(): any {
    return this.last_message;
  }
}

export interface UserMessageCooldown {
  user_id: string;
  last_message_time: Date;
}
