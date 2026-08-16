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
          response_choice: string | null
          response_text: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          id?: string
          moment_id: string
          response_choice?: string | null
          response_text?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          id?: string
          moment_id?: string
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
      important_dates: {
        Row: {
          created_at: string
          created_by: string
          date: string
          id: string
          kind: string
          name: string
          pair_id: string
          recurrence: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          id?: string
          kind: string
          name: string
          pair_id: string
          recurrence?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          kind?: string
          name?: string
          pair_id?: string
          recurrence?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "important_dates_pair_id_fkey"
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
          id: string
          local_date: string
          moment_id: string
          pair_id: string
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
          id?: string
          local_date: string
          moment_id: string
          pair_id: string
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
          id?: string
          local_date?: string
          moment_id?: string
          pair_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_pair_invitation: {
        Args: { invitation_credential: string }
        Returns: Json
      }
      cancel_pair_invitation: { Args: { invitation_id: string }; Returns: Json }
      contribution_payload: {
        Args: {
          target_contribution: Database["public"]["Tables"]["contributions"]["Row"]
        }
        Returns: Json
      }
      create_important_date: {
        Args: {
          date_kind: string
          date_name: string
          date_recurrence?: string
          date_value: string
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
      delete_important_date: { Args: { target_date_id: string }; Returns: Json }
      dissolve_pair: { Args: never; Returns: Json }
      get_daily_moment: { Args: never; Returns: Json }
      get_important_date_widget: { Args: never; Returns: Json }
      get_memory_history: { Args: never; Returns: Json }
      get_pair_state: { Args: never; Returns: Json }
      get_premium_state: { Args: never; Returns: Json }
      important_date_for_year: {
        Args: { target_date: string; target_year: number }
        Returns: string
      }
      important_date_payload: {
        Args: {
          target_date: Database["public"]["Tables"]["important_dates"]["Row"]
        }
        Returns: Json
      }
      important_dates_for_pair: {
        Args: { target_pair_id: string }
        Returns: Json
      }
      list_memories: { Args: never; Returns: Json }
      memory_payload_for_user: {
        Args: { target_memory_id: string; target_user_id: string }
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
      reveal_moment: { Args: { target_moment_id: string }; Returns: Json }
      submit_question_contribution: {
        Args: {
          response_choice?: string
          response_text?: string
          target_moment_id: string
        }
        Returns: Json
      }
      update_important_date: {
        Args: {
          date_kind: string
          date_name: string
          date_recurrence?: string
          date_value: string
          target_date_id: string
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

