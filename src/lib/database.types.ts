export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contributions: {
        Row: {
          id: string
          moment_id: string
          photo_front_height: number | null
          photo_front_path: string | null
          photo_front_width: number | null
          photo_rear_height: number | null
          photo_rear_path: string | null
          photo_rear_width: number | null
          photo_submission_id: string | null
          removed_at: string | null
          response_choice: string | null
          response_text: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          id?: string
          moment_id: string
          photo_front_height?: number | null
          photo_front_path?: string | null
          photo_front_width?: number | null
          photo_rear_height?: number | null
          photo_rear_path?: string | null
          photo_rear_width?: number | null
          photo_submission_id?: string | null
          removed_at?: string | null
          response_choice?: string | null
          response_text?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          id?: string
          moment_id?: string
          photo_front_height?: number | null
          photo_front_path?: string | null
          photo_front_width?: number | null
          photo_rear_height?: number | null
          photo_rear_path?: string | null
          photo_rear_width?: number | null
          photo_submission_id?: string | null
          removed_at?: string | null
          response_choice?: string | null
          response_text?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
        ]
      }
      doodle_completions: {
        Row: {
          client_completion_id: string
          completed_at: string
          moment_id: string
          user_id: string
        }
        Insert: {
          client_completion_id: string
          completed_at?: string
          moment_id: string
          user_id: string
        }
        Update: {
          client_completion_id?: string
          completed_at?: string
          moment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doodle_completions_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
        ]
      }
      doodle_documents: {
        Row: {
          created_at: string
          document: Json
          id: string
          moment_id: string
          pair_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          document?: Json
          id?: string
          moment_id: string
          pair_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          document?: Json
          id?: string
          moment_id?: string
          pair_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "doodle_documents_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: true
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doodle_documents_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      doodle_snapshot_operations: {
        Row: {
          client_operation_id: string
          created_at: string
          moment_id: string
          user_id: string
        }
        Insert: {
          client_operation_id: string
          created_at?: string
          moment_id: string
          user_id: string
        }
        Update: {
          client_operation_id?: string
          created_at?: string
          moment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doodle_snapshot_operations_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          body: string | null
          client_request_id: string
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          latitude: number | null
          location_city: string | null
          location_country_code: string | null
          location_label: string | null
          longitude: number | null
          pair_id: string
          recurrence: string
          start_date: string
          start_time: string | null
          time_zone: string | null
          title: string
          updated_at: string
          updated_by: string
          version: number
          widget_hidden: boolean
        }
        Insert: {
          body?: string | null
          client_request_id: string
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          latitude?: number | null
          location_city?: string | null
          location_country_code?: string | null
          location_label?: string | null
          longitude?: number | null
          pair_id: string
          recurrence?: string
          start_date: string
          start_time?: string | null
          time_zone?: string | null
          title: string
          updated_at?: string
          updated_by: string
          version?: number
          widget_hidden?: boolean
        }
        Update: {
          body?: string | null
          client_request_id?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          latitude?: number | null
          location_city?: string | null
          location_country_code?: string | null
          location_label?: string | null
          longitude?: number | null
          pair_id?: string
          recurrence?: string
          start_date?: string
          start_time?: string | null
          time_zone?: string | null
          title?: string
          updated_at?: string
          updated_by?: string
          version?: number
          widget_hidden?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_media: {
        Row: {
          client_media_id: string
          created_at: string
          created_by: string
          entry_id: string
          height: number
          id: string
          mime_type: string
          pair_id: string
          position: number
          storage_path: string
          width: number
        }
        Insert: {
          client_media_id: string
          created_at?: string
          created_by: string
          entry_id: string
          height: number
          id?: string
          mime_type?: string
          pair_id: string
          position: number
          storage_path: string
          width: number
        }
        Update: {
          client_media_id?: string
          created_at?: string
          created_by?: string
          entry_id?: string
          height?: number
          id?: string
          mime_type?: string
          pair_id?: string
          position?: number
          storage_path?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_media_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_media_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          created_at: string
          doodle_document: Json | null
          format: string
          id: string
          local_date: string
          moment_id: string
          pair_id: string
          photo_composition: Json
          pom_state: string
          prompt_concept_key: string
          prompt_en: string
          prompt_es: string
          response_options: Json
          response_type: string
          revealed_at: string
        }
        Insert: {
          created_at?: string
          doodle_document?: Json | null
          format?: string
          id?: string
          local_date: string
          moment_id: string
          pair_id: string
          photo_composition?: Json
          pom_state?: string
          prompt_concept_key: string
          prompt_en: string
          prompt_es: string
          response_options?: Json
          response_type: string
          revealed_at?: string
        }
        Update: {
          created_at?: string
          doodle_document?: Json | null
          format?: string
          id?: string
          local_date?: string
          moment_id?: string
          pair_id?: string
          photo_composition?: Json
          pom_state?: string
          prompt_concept_key?: string
          prompt_en?: string
          prompt_es?: string
          response_options?: Json
          response_type?: string
          revealed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: true
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_prompt_concept_key_fkey"
            columns: ["prompt_concept_key"]
            isOneToOne: false
            referencedRelation: "prompt_concepts"
            referencedColumns: ["concept_key"]
          },
        ]
      }
      memory_widget_preferences: {
        Row: {
          memory_id: string
          updated_at: string
          user_id: string
          visual_enabled: boolean
        }
        Insert: {
          memory_id: string
          updated_at?: string
          user_id: string
          visual_enabled?: boolean
        }
        Update: {
          memory_id?: string
          updated_at?: string
          user_id?: string
          visual_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "memory_widget_preferences_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          created_at: string
          format: string
          id: string
          is_free: boolean
          local_date: string
          normal_expires_at: string
          pair_id: string
          prompt_concept_key: string
          ready_at: string | null
          recovery_expires_at: string
          revealed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          format: string
          id?: string
          is_free?: boolean
          local_date: string
          normal_expires_at: string
          pair_id: string
          prompt_concept_key: string
          ready_at?: string | null
          recovery_expires_at: string
          revealed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          is_free?: boolean
          local_date?: string
          normal_expires_at?: string
          pair_id?: string
          prompt_concept_key?: string
          ready_at?: string | null
          recovery_expires_at?: string
          revealed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "moments_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moments_prompt_concept_key_fkey"
            columns: ["prompt_concept_key"]
            isOneToOne: false
            referencedRelation: "prompt_concepts"
            referencedColumns: ["concept_key"]
          },
        ]
      }
      pair_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          cancelled_at: string | null
          code: string
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          pair_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          cancelled_at?: string | null
          code: string
          created_at?: string
          creator_id: string
          expires_at: string
          id?: string
          pair_id: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          cancelled_at?: string | null
          code?: string
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          pair_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_invitations_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_journal_state: {
        Row: {
          consumed_at: string | null
          free_entry_consumed: boolean
          pair_id: string
        }
        Insert: {
          consumed_at?: string | null
          free_entry_consumed?: boolean
          pair_id: string
        }
        Update: {
          consumed_at?: string | null
          free_entry_consumed?: boolean
          pair_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_journal_state_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: true
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_memberships: {
        Row: {
          ended_at: string | null
          joined_at: string
          pair_id: string
          role: string
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          joined_at?: string
          pair_id: string
          role: string
          user_id: string
        }
        Update: {
          ended_at?: string | null
          joined_at?: string
          pair_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_memberships_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_progress: {
        Row: {
          equipped_accessory: string | null
          memory_count: number
          pair_id: string
          updated_at: string
        }
        Insert: {
          equipped_accessory?: string | null
          memory_count?: number
          pair_id: string
          updated_at?: string
        }
        Update: {
          equipped_accessory?: string | null
          memory_count?: number
          pair_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_progress_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: true
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_streaks: {
        Row: {
          best_count: number
          current_count: number
          last_completed_local_date: string | null
          pair_id: string
          recovery_uses: number
          updated_at: string
        }
        Insert: {
          best_count?: number
          current_count?: number
          last_completed_local_date?: string | null
          pair_id: string
          recovery_uses?: number
          updated_at?: string
        }
        Update: {
          best_count?: number
          current_count?: number
          last_completed_local_date?: string | null
          pair_id?: string
          recovery_uses?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_streaks_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: true
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      pairs: {
        Row: {
          activated_at: string | null
          anniversary: string
          created_at: string
          created_by: string
          dissolved_at: string | null
          id: string
          status: string
          time_zone: string
        }
        Insert: {
          activated_at?: string | null
          anniversary: string
          created_at?: string
          created_by: string
          dissolved_at?: string | null
          id?: string
          status?: string
          time_zone?: string
        }
        Update: {
          activated_at?: string | null
          anniversary?: string
          created_at?: string
          created_by?: string
          dissolved_at?: string | null
          id?: string
          status?: string
          time_zone?: string
        }
        Relationships: []
      }
      premium_subscriptions: {
        Row: {
          access_until: string | null
          last_event_at: string
          last_event_id: string
          product_id: string | null
          revenuecat_app_user_id: string
          status: string
          store: string | null
          subscriber_id: string
          updated_at: string
          will_renew: boolean
        }
        Insert: {
          access_until?: string | null
          last_event_at: string
          last_event_id: string
          product_id?: string | null
          revenuecat_app_user_id: string
          status: string
          store?: string | null
          subscriber_id: string
          updated_at?: string
          will_renew?: boolean
        }
        Update: {
          access_until?: string | null
          last_event_at?: string
          last_event_id?: string
          product_id?: string | null
          revenuecat_app_user_id?: string
          status?: string
          store?: string | null
          subscriber_id?: string
          updated_at?: string
          will_renew?: boolean
        }
        Relationships: []
      }
      premium_webhook_events: {
        Row: {
          app_user_id: string
          event_id: string
          event_type: string
          occurred_at: string
          payload: Json
          processed_at: string
        }
        Insert: {
          app_user_id: string
          event_id: string
          event_type: string
          occurred_at: string
          payload: Json
          processed_at?: string
        }
        Update: {
          app_user_id?: string
          event_id?: string
          event_type?: string
          occurred_at?: string
          payload?: Json
          processed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          appearance: string
          avatar_key: string | null
          birth_date: string | null
          created_at: string
          display_name: string
          id: string
          locale: string
          time_zone: string
          updated_at: string
        }
        Insert: {
          appearance?: string
          avatar_key?: string | null
          birth_date?: string | null
          created_at?: string
          display_name: string
          id: string
          locale?: string
          time_zone?: string
          updated_at?: string
        }
        Update: {
          appearance?: string
          avatar_key?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          time_zone?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompt_concepts: {
        Row: {
          active: boolean
          concept_key: string
          created_at: string
          format: string
          prompt_en: string
          prompt_es: string
          response_options: Json
          response_type: string
        }
        Insert: {
          active?: boolean
          concept_key: string
          created_at?: string
          format: string
          prompt_en: string
          prompt_es: string
          response_options?: Json
          response_type?: string
        }
        Update: {
          active?: boolean
          concept_key?: string
          created_at?: string
          format?: string
          prompt_en?: string
          prompt_es?: string
          response_options?: Json
          response_type?: string
        }
        Relationships: []
      }
      streak_completions: {
        Row: {
          completed_at: string
          local_date: string
          moment_id: string
          pair_id: string
        }
        Insert: {
          completed_at?: string
          local_date: string
          moment_id: string
          pair_id: string
        }
        Update: {
          completed_at?: string
          local_date?: string
          moment_id?: string
          pair_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_completions_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: true
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streak_completions_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_message_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          journal_entry_id: string | null
          memory_id: string | null
          message_id: string
          pair_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type?: string
          id?: string
          journal_entry_id?: string | null
          memory_id?: string | null
          message_id: string
          pair_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          journal_entry_id?: string | null
          memory_id?: string | null
          message_id?: string
          pair_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_message_events_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_message_events_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_message_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "thread_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_message_events_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_messages: {
        Row: {
          body: string
          client_message_id: string
          created_at: string
          id: string
          journal_entry_id: string | null
          memory_id: string | null
          pair_id: string
          user_id: string
        }
        Insert: {
          body: string
          client_message_id: string
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          memory_id?: string | null
          pair_id: string
          user_id: string
        }
        Update: {
          body?: string
          client_message_id?: string
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          memory_id?: string | null
          pair_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_pair_invitation: {
        Args: { invitation_credential: string }
        Returns: Json
      }
      add_journal_entry_media: {
        Args: {
          target_client_media_id: string
          target_entry_id: string
          target_height: number
          target_position: number
          target_storage_path: string
          target_width: number
        }
        Returns: Json
      }
      cancel_pair_invitation: { Args: { invitation_id: string }; Returns: Json }
      complete_doodle: {
        Args: { client_completion_id: string; target_moment_id: string }
        Returns: Json
      }
      contribution_payload: {
        Args: {
          target_contribution: Database["public"]["Tables"]["contributions"]["Row"]
        }
        Returns: Json
      }
      create_journal_entry: {
        Args: {
          target_body: string
          target_client_request_id: string
          target_end_date: string
          target_location: Json
          target_recurrence: string
          target_start_date: string
          target_start_time: string
          target_time_zone: string
          target_title: string
          target_widget_hidden: boolean
        }
        Returns: Json
      }
      create_pair_invitation: { Args: never; Returns: Json }
      create_pair_invitation_record: {
        Args: { target_creator_id: string; target_pair_id: string }
        Returns: string
      }
      create_pair_with_invitation: {
        Args: { pair_anniversary: string }
        Returns: Json
      }
      delete_journal_entry: {
        Args: { expected_version: number; target_entry_id: string }
        Returns: Json
      }
      dissolve_pair: { Args: never; Returns: Json }
      get_daily_moment: { Args: never; Returns: Json }
      get_daily_moment_legacy: { Args: never; Returns: Json }
      get_doodle_session: { Args: { target_moment_id: string }; Returns: Json }
      get_journal_access: { Args: never; Returns: Json }
      get_journal_calendar: {
        Args: { range_end: string; range_start: string }
        Returns: Json
      }
      get_journal_entries: { Args: never; Returns: Json }
      get_journal_map: { Args: never; Returns: Json }
      get_journal_page: {
        Args: {
          cursor_date?: string
          cursor_id?: string
          cursor_origin?: string
          page_size?: number
        }
        Returns: Json
      }
      get_journal_thread: { Args: { target_entry_id: string }; Returns: Json }
      get_memory_history: { Args: never; Returns: Json }
      get_memory_thread: { Args: { target_memory_id: string }; Returns: Json }
      get_pair_state: { Args: never; Returns: Json }
      get_pom_progress: { Args: never; Returns: Json }
      get_premium_state: { Args: never; Returns: Json }
      important_date_for_year: {
        Args: { target_date: string; target_year: number }
        Returns: string
      }
      important_dates_for_pair: {
        Args: { target_pair_id: string }
        Returns: Json
      }
      journal_date_in_year: {
        Args: { source_date: string; target_year: number }
        Returns: string
      }
      journal_entry_payload: {
        Args: {
          target_entry: Database["public"]["Tables"]["journal_entries"]["Row"]
        }
        Returns: Json
      }
      list_memories: { Args: never; Returns: Json }
      memory_payload_for_user: {
        Args: { target_memory_id: string; target_user_id: string }
        Returns: Json
      }
      merge_doodle_documents: {
        Args: { current_document: Json; incoming_document: Json }
        Returns: Json
      }
      moment_deadlines_for_pair: {
        Args: { target_local_date: string; target_pair_id: string }
        Returns: {
          normal_expires_at: string
          recovery_expires_at: string
        }[]
      }
      moment_payload_for_user: {
        Args: { target_moment_id: string; target_user_id: string }
        Returns: Json
      }
      next_important_date_for_pair: {
        Args: { target_pair_id: string }
        Returns: Json
      }
      next_yearly_important_date: {
        Args: { target_date: string; today: string }
        Returns: string
      }
      pair_has_premium: { Args: { target_pair_id: string }; Returns: boolean }
      pair_state_for_user: { Args: { target_user_id: string }; Returns: Json }
      pair_streak_payload: { Args: { target_pair_id: string }; Returns: Json }
      pom_progress_payload: { Args: { target_pair_id: string }; Returns: Json }
      premium_subscription_payload: {
        Args: {
          target_subscription: Database["public"]["Tables"]["premium_subscriptions"]["Row"]
        }
        Returns: Json
      }
      premium_timestamp_from_ms: { Args: { value: string }; Returns: string }
      preview_pair_invitation: {
        Args: { invitation_credential: string }
        Returns: Json
      }
      process_revenuecat_webhook: {
        Args: { target_payload: Json }
        Returns: Json
      }
      record_pair_streak_completion: {
        Args: {
          target_local_date: string
          target_moment_id: string
          target_pair_id: string
        }
        Returns: undefined
      }
      remove_journal_entry_media: {
        Args: { target_media_id: string }
        Returns: Json
      }
      remove_own_contribution: {
        Args: { target_contribution_id: string }
        Returns: Json
      }
      reveal_moment: { Args: { target_moment_id: string }; Returns: Json }
      save_doodle_snapshot: {
        Args: {
          client_operation_id: string
          target_document: Json
          target_moment_id: string
        }
        Returns: Json
      }
      send_journal_thread_message: {
        Args: {
          message_body: string
          target_client_message_id: string
          target_entry_id: string
        }
        Returns: Json
      }
      send_thread_message: {
        Args: {
          message_body: string
          target_client_message_id: string
          target_memory_id: string
        }
        Returns: Json
      }
      set_memory_widget_visibility: {
        Args: { enabled: boolean; target_memory_id: string }
        Returns: boolean
      }
      set_pom_accessory: { Args: { target_accessory?: string }; Returns: Json }
      submit_photo_contribution: {
        Args: {
          client_submission_id: string
          front_height: number
          front_path: string
          front_width: number
          rear_height: number
          rear_path: string
          rear_width: number
          target_moment_id: string
        }
        Returns: Json
      }
      submit_question_contribution: {
        Args: {
          response_choice?: string
          response_text?: string
          target_moment_id: string
        }
        Returns: Json
      }
      thread_message_payload: {
        Args: {
          target_message: Database["public"]["Tables"]["thread_messages"]["Row"]
        }
        Returns: Json
      }
      update_journal_entry: {
        Args: {
          expected_version: number
          target_body: string
          target_end_date: string
          target_entry_id: string
          target_location: Json
          target_recurrence: string
          target_start_date: string
          target_start_time: string
          target_time_zone: string
          target_title: string
          target_widget_hidden: boolean
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

