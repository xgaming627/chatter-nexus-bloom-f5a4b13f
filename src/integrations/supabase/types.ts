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
      badge_definitions: {
        Row: {
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          color: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
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
      blocked_words: {
        Row: {
          added_by: string | null
          created_at: string | null
          id: string
          word: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          word: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          word?: string
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
      challenges: {
        Row: {
          challenge_type: string | null
          created_at: string | null
          description: string
          ends_at: string
          id: string
          requirement: Json
          reward: Json
          starts_at: string | null
          title: string
        }
        Insert: {
          challenge_type?: string | null
          created_at?: string | null
          description: string
          ends_at: string
          id?: string
          requirement: Json
          reward: Json
          starts_at?: string | null
          title: string
        }
        Update: {
          challenge_type?: string | null
          created_at?: string | null
          description?: string
          ends_at?: string
          id?: string
          requirement?: Json
          reward?: Json
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          custom_link: string
          description: string | null
          id: string
          is_nexus_plus_exclusive: boolean | null
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          custom_link: string
          description?: string | null
          id?: string
          is_nexus_plus_exclusive?: boolean | null
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          custom_link?: string
          description?: string | null
          id?: string
          is_nexus_plus_exclusive?: boolean | null
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
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
          is_system_conversation: boolean | null
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
          is_system_conversation?: boolean | null
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
          is_system_conversation?: boolean | null
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
      feed_interactions: {
        Row: {
          comment_text: string | null
          created_at: string | null
          id: string
          interaction_type: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          comment_text?: string | null
          created_at?: string | null
          id?: string
          interaction_type?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          comment_text?: string | null
          created_at?: string | null
          id?: string
          interaction_type?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_interactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
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
      ignored_users: {
        Row: {
          created_at: string
          id: string
          ignored_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ignored_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ignored_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      license_keys: {
        Row: {
          activated_at: string | null
          created_at: string | null
          duration_months: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_code: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          duration_months?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_code: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          duration_months?: number | null
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
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          conversation_id: string
          created_at: string | null
          created_by: string
          id: string
          name: string | null
          parent_message_id: string
          updated_at: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          created_by: string
          id?: string
          name?: string | null
          parent_message_id: string
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string | null
          parent_message_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          deleted: boolean
          deleted_by: string | null
          delivered: boolean
          delivered_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          flagged_for_moderation: boolean
          id: string
          is_system_message: boolean
          read: boolean
          read_at: string | null
          reply_to_content: string | null
          reply_to_message_id: string | null
          reported: boolean
          sender_id: string
          system_message_type: string | null
          timestamp: string
        }
        Insert: {
          content: string
          conversation_id: string
          deleted?: boolean
          deleted_by?: string | null
          delivered?: boolean
          delivered_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          flagged_for_moderation?: boolean
          id?: string
          is_system_message?: boolean
          read?: boolean
          read_at?: string | null
          reply_to_content?: string | null
          reply_to_message_id?: string | null
          reported?: boolean
          sender_id: string
          system_message_type?: string | null
          timestamp?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          deleted?: boolean
          deleted_by?: string | null
          delivered?: boolean
          delivered_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          flagged_for_moderation?: boolean
          id?: string
          is_system_message?: boolean
          read?: boolean
          read_at?: string | null
          reply_to_content?: string | null
          reply_to_message_id?: string | null
          reported?: boolean
          sender_id?: string
          system_message_type?: string | null
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
      polls: {
        Row: {
          conversation_id: string
          created_at: string | null
          creator_id: string
          expires_at: string | null
          id: string
          options: Json
          question: string
          votes: Json | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          creator_id: string
          expires_at?: string | null
          id?: string
          options: Json
          question: string
          votes?: Json | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          creator_id?: string
          expires_at?: string | null
          id?: string
          options?: Json
          question?: string
          votes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          banner_color: string | null
          banner_image_url: string | null
          created_at: string
          custom_name_color: string | null
          description: string | null
          display_name: string | null
          do_not_disturb: boolean | null
          free_trial_claimed: boolean | null
          id: string
          messages_sent: number | null
          nexus_plus_active: boolean | null
          nexus_plus_expires_at: string | null
          nexus_plus_reminder_shown: boolean | null
          online_status: string | null
          photo_url: string | null
          read_receipts_enabled: boolean | null
          show_moderator_badge: boolean | null
          status: string | null
          theme_accent_color: string | null
          theme_background_color: string | null
          theme_primary_color: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          banner_color?: string | null
          banner_image_url?: string | null
          created_at?: string
          custom_name_color?: string | null
          description?: string | null
          display_name?: string | null
          do_not_disturb?: boolean | null
          free_trial_claimed?: boolean | null
          id?: string
          messages_sent?: number | null
          nexus_plus_active?: boolean | null
          nexus_plus_expires_at?: string | null
          nexus_plus_reminder_shown?: boolean | null
          online_status?: string | null
          photo_url?: string | null
          read_receipts_enabled?: boolean | null
          show_moderator_badge?: boolean | null
          status?: string | null
          theme_accent_color?: string | null
          theme_background_color?: string | null
          theme_primary_color?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          banner_color?: string | null
          banner_image_url?: string | null
          created_at?: string
          custom_name_color?: string | null
          description?: string | null
          display_name?: string | null
          do_not_disturb?: boolean | null
          free_trial_claimed?: boolean | null
          id?: string
          messages_sent?: number | null
          nexus_plus_active?: boolean | null
          nexus_plus_expires_at?: string | null
          nexus_plus_reminder_shown?: boolean | null
          online_status?: string | null
          photo_url?: string | null
          read_receipts_enabled?: boolean | null
          show_moderator_badge?: boolean | null
          status?: string | null
          theme_accent_color?: string | null
          theme_background_color?: string | null
          theme_primary_color?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      purchased_items: {
        Row: {
          equipped_at: string | null
          equipped_slot: string | null
          id: string
          is_active: boolean
          purchased_at: string
          shop_item_id: string
          user_id: string
        }
        Insert: {
          equipped_at?: string | null
          equipped_slot?: string | null
          id?: string
          is_active?: boolean
          purchased_at?: string
          shop_item_id: string
          user_id: string
        }
        Update: {
          equipped_at?: string | null
          equipped_slot?: string | null
          id?: string
          is_active?: boolean
          purchased_at?: string
          shop_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchased_items_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
          uses?: number
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          points_awarded: number
          referral_code_id: string
          referred_user_id: string
          referrer_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          points_awarded?: number
          referral_code_id: string
          referred_user_id: string
          referrer_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          points_awarded?: number
          referral_code_id?: string
          referred_user_id?: string
          referrer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
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
      reported_profiles: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_by: string
          reported_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          saved_banner_color: string | null
          saved_banner_image_url: string | null
          saved_description: string | null
          saved_display_name: string | null
          saved_photo_url: string | null
          saved_username: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_by: string
          reported_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          saved_banner_color?: string | null
          saved_banner_image_url?: string | null
          saved_description?: string | null
          saved_display_name?: string | null
          saved_photo_url?: string | null
          saved_username?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_by?: string
          reported_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          saved_banner_color?: string | null
          saved_banner_image_url?: string | null
          saved_description?: string | null
          saved_display_name?: string | null
          saved_photo_url?: string | null
          saved_username?: string | null
          status?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          item_data: Json
          item_type: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          item_data: Json
          item_type: string
          name: string
          price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          item_data?: Json
          item_type?: string
          name?: string
          price?: number
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
          last_warning_at: string | null
          message_count: number | null
          rating: number | null
          status: string
          updated_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string
          vpn_detected: boolean | null
          warnings_count: number | null
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
          last_warning_at?: string | null
          message_count?: number | null
          rating?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          vpn_detected?: boolean | null
          warnings_count?: number | null
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
          last_warning_at?: string | null
          message_count?: number | null
          rating?: number | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          vpn_detected?: boolean | null
          warnings_count?: number | null
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
      thread_messages: {
        Row: {
          content: string
          id: string
          sender_id: string
          thread_id: string
          timestamp: string | null
        }
        Insert: {
          content: string
          id?: string
          sender_id: string
          thread_id: string
          timestamp?: string | null
        }
        Update: {
          content?: string
          id?: string
          sender_id?: string
          thread_id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
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
      user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          id: string
          progress: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          progress?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          acquired_at: string | null
          equipped: boolean | null
          id: string
          item_data: Json
          item_type: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          equipped?: boolean | null
          id?: string
          item_data: Json
          item_type?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          equipped?: boolean | null
          id?: string
          item_data?: Json
          item_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_levels: {
        Row: {
          created_at: string | null
          equipped_title: string | null
          id: string
          level: number | null
          titles: Json | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          created_at?: string | null
          equipped_title?: string | null
          id?: string
          level?: number | null
          titles?: Json | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          created_at?: string | null
          equipped_title?: string | null
          id?: string
          level?: number | null
          titles?: Json | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string
          id: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          updated_at?: string
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
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_login_date: string | null
          longest_streak: number | null
          streak_rewards: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          streak_rewards?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          streak_rewards?: Json | null
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
      calculate_xp_for_level: {
        Args: { level: number }
        Returns: number
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
