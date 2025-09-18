
export interface ExtendedUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  username?: string;
  photoURL: string | null;
}

export class Message {
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
  is_system_message?: boolean;
  
  constructor(data: any) {
    this.id = data.id;
    this.conversation_id = data.conversation_id;
    this.sender_id = data.sender_id;
    this.content = data.content;
    this.timestamp = data.timestamp ? new Date(data.timestamp.toDate?.() || data.timestamp) : new Date();
    this.read = !!data.read;
    this.delivered = !!data.delivered;
    this.reported = !!data.reported;
    this.flagged_for_moderation = !!data.flagged_for_moderation;
    this.deleted = !!data.deleted;
    this.deleted_by = data.deleted_by;
    this.file_url = data.file_url;
    this.file_name = data.file_name;
    this.file_type = data.file_type;
    this.is_system_message = !!data.is_system_message;
  }

  get senderId(): string {
    return this.sender_id;
  }

  get deletedBy(): string | undefined {
    return this.deleted_by;
  }

  get fileURL(): string | undefined {
    return this.file_url;
  }

  get fileName(): string | undefined {
    return this.file_name;
  }

  get fileType(): string | undefined {
    return this.file_type;
  }
}

export class Conversation {
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
  
  constructor(data: any) {
    this.id = data.id;
    this.participants = data.participants || [];
    this.is_group_chat = !!data.is_group_chat;
    this.group_name = data.group_name;
    this.group_photo_url = data.group_photo_url;
    this.created_by = data.created_by;
    this.created_at = data.created_at ? new Date(data.created_at.toDate?.() || data.created_at) : new Date();
    
    if (data.last_message) {
      this.last_message = {
        content: data.last_message.content,
        timestamp: data.last_message.timestamp ? new Date(data.last_message.timestamp.toDate?.() || data.last_message.timestamp) : new Date(),
        sender_id: data.last_message.sender_id
      };
    }
    
    this.isStored = data.isStored;
    this.participantsInfo = data.participantsInfo;
  }
  
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

// Define a User type for other components to use
export interface User {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string;
  email?: string;
  description?: string;
}
