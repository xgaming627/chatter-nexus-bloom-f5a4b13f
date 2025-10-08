export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_notifications: {
        Row: {
          caller_id: string
          caller_name: string
          caller_photo: string | null
          created_at: string
          id: string
          is_video_call: boolean
          receiver_id: string
          receiver_name: string
          receiver_photo: string | null
          room_name: string
          status: string
          updated_at: string
        }
        Insert: {
          caller_id: string
          caller_name: string
          caller_photo?: string | null
          created_at?: string
          id?: string
          is_video_call?: boolean
          receiver_id: string
          receiver_name: string
          receiver_photo?: string | null
          room_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          caller_id?: string
          caller_name?: string
          caller_photo?: string | null
          created_at?: string
          id?: string
          is_video_call?: boolean
          receiver_id?: string
          receiver_name?: string
          receiver_photo?: string | null
          room_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_rooms: {
        Row: {
          answer: Json | null
          call_type: string
          callee_id: string | null
          caller_id: string
          conversation_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          offer: Json | null
          participant_ids: string[] | null
          room_id: string
          status: string
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          call_type: string
          callee_id?: string | null
          caller_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          offer?: Json | null
          participant_ids?: string[] | null
          room_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          call_type?: string
          callee_id?: string | null
          caller_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          offer?: Json | null
          participant_ids?: string[] | null
          room_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          auto_delete_after: string | null
          created_at: string
          created_by: string
          created_by_role: string | null
          group_name: string | null
          group_photo_url: string | null
          id: string
          is_group_chat: boolean
          max_participants: number | null
          participants: string[]
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          auto_delete_after?: string | null
          created_at?: string
          created_by: string
          created_by_role?: string | null
          group_name?: string | null
          group_photo_url?: string | null
          id?: string
          is_group_chat?: boolean
          max_participants?: number | null
          participants: string[]
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          auto_delete_after?: string | null
          created_at?: string
          created_by?: string
          created_by_role?: string | null
          group_name?: string | null
          group_photo_url?: string | null
          id?: string
          is_group_chat?: boolean
          max_participants?: number | null
          participants?: string[]
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      favorite_gifs: {
        Row: {
          added_at: string | null
          gif_title: string | null
          gif_url: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          gif_title?: string | null
          gif_url: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          gif_title?: string | null
          gif_url?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ice_candidates: {
        Row: {
          candidate: Json
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          candidate: Json
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          candidate?: Json
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: []
      }
      license_keys: {
        Row: {
          activated_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_code: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_code: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
      login_sessions: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          location: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          deleted: boolean
          deleted_by: string | null
          delivered: boolean
          file_name: string | null
          file_type: string | null
          file_url: string | null
          flagged_for_moderation: boolean
          id: string
          is_system_message: boolean
          read: boolean
          reply_to_content: string | null
          reply_to_message_id: string | null
          reported: boolean
          sender_id: string
          timestamp: string
        }
        Insert: {
          content: string
          conversation_id: string
          deleted?: boolean
          deleted_by?: string | null
          delivered?: boolean
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          flagged_for_moderation?: boolean
          id?: string
          is_system_message?: boolean
          read?: boolean
          reply_to_content?: string | null
          reply_to_message_id?: string | null
          reported?: boolean
          sender_id: string
          timestamp?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          deleted?: boolean
          deleted_by?: string | null
          delivered?: boolean
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          flagged_for_moderation?: boolean
          id?: string
          is_system_message?: boolean
          read?: boolean
          reply_to_content?: string | null
          reply_to_message_id?: string | null
          reported?: boolean
          sender_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          created_at: string
          details: Json
          id: string
          log_type: string
          moderator_id: string
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          log_type: string
          moderator_id: string
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          log_type?: string
          moderator_id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          is_sound_enabled: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          is_sound_enabled?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          is_sound_enabled?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pinned_conversations: {
        Row: {
          conversation_id: string
          id: string
          pinned_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          pinned_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          pinned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_messages: {
        Row: {
          conversation_id: string
          id: string
          message_id: string
          pinned_at: string | null
          pinned_by: string
        }
        Insert: {
          conversation_id: string
          id?: string
          message_id: string
          pinned_at?: string | null
          pinned_by: string
        }
        Update: {
          conversation_id?: string
          id?: string
          message_id?: string
          pinned_at?: string | null
          pinned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string | null
          do_not_disturb: boolean | null
          free_trial_claimed: boolean | null
          id: string
          nexus_plus_active: boolean | null
          nexus_plus_expires_at: string | null
          nexus_plus_reminder_shown: boolean | null
          online_status: string | null
          photo_url: string | null
          show_moderator_badge: boolean | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          do_not_disturb?: boolean | null
          free_trial_claimed?: boolean | null
          id?: string
          nexus_plus_active?: boolean | null
          nexus_plus_expires_at?: string | null
          nexus_plus_reminder_shown?: boolean | null
          online_status?: string | null
          photo_url?: string | null
          show_moderator_badge?: boolean | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          do_not_disturb?: boolean | null
          free_trial_claimed?: boolean | null
          id?: string
          nexus_plus_active?: boolean | null
          nexus_plus_expires_at?: string | null
          nexus_plus_reminder_shown?: boolean | null
          online_status?: string | null
          photo_url?: string | null
          show_moderator_badge?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reported_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason: string
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          id: string
          read: boolean
          sender_id: string | null
          sender_role: string
          session_id: string
          timestamp: string
        }
        Insert: {
          content: string
          id?: string
          read?: boolean
          sender_id?: string | null
          sender_role: string
          session_id: string
          timestamp?: string
        }
        Update: {
          content?: string
          id?: string
          read?: boolean
          sender_id?: string | null
          sender_role?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          feedback: string | null
          id: string
          ipv4_address: string | null
          ipv6_address: string | null
          last_activity: string | null
          last_read_by_moderator: boolean
          rating: number | null
          status: string
          updated_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string
          vpn_detected: boolean | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          ipv4_address?: string | null
          ipv6_address?: string | null
          last_activity?: string | null
          last_read_by_moderator?: boolean
          rating?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          vpn_detected?: boolean | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          ipv4_address?: string | null
          ipv6_address?: string | null
          last_activity?: string | null
          last_read_by_moderator?: boolean
          rating?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          vpn_detected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          active: boolean
          created_at: string
          duration: string
          expires_at: string | null
          id: string
          issued_at: string
          issued_by: string
          reason: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by: string
          reason: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_close_inactive_support_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      auto_delete_old_conversations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_view_profile_for_search: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      cleanup_old_call_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_active_warnings: {
        Args: { target_user_id: string }
        Returns: {
          duration: string
          expires_at: string
          id: string
          issued_at: string
          issued_by_name: string
          reason: string
        }[]
      }
      get_user_email_by_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_users_for_moderators: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          description: string
          display_name: string
          email: string
          online_status: string
          photo_url: string
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_moderator: {
        Args: { _user_id: string }
        Returns: boolean
      }
      reset_unread_count: {
        Args: { conversation_id: string; user_id: string }
        Returns: undefined
      }
      send_mention_notification: {
        Args: {
          conversation_id: string
          message_content: string
          sender_name: string
          target_user_id: string
        }
        Returns: undefined
      }
      users_share_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
