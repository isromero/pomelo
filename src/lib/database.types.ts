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
          pair_id: string
          prompt_concept_key: string
          ready_at: string | null
          revealed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          format: string
          id?: string
          is_free?: boolean
          local_date: string
          pair_id: string
          prompt_concept_key: string
          ready_at?: string | null
          revealed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          is_free?: boolean
          local_date?: string
          pair_id?: string
          prompt_concept_key?: string
          ready_at?: string | null
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
      pairs: {
        Row: {
          activated_at: string | null
          anniversary: string
          created_at: string
          created_by: string
          dissolved_at: string | null
          id: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          anniversary: string
          created_at?: string
          created_by: string
          dissolved_at?: string | null
          id?: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          anniversary?: string
          created_at?: string
          created_by?: string
          dissolved_at?: string | null
          id?: string
          status?: string
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
      create_pair_invitation: { Args: never; Returns: Json }
      create_pair_invitation_record: {
        Args: { target_creator_id: string; target_pair_id: string }
        Returns: string
      }
      create_pair_with_invitation: {
        Args: { pair_anniversary: string }
        Returns: Json
      }
      dissolve_pair: { Args: never; Returns: Json }
      get_daily_moment: { Args: never; Returns: Json }
      get_memory_history: { Args: never; Returns: Json }
      get_pair_state: { Args: never; Returns: Json }
      list_memories: { Args: never; Returns: Json }
      memory_payload_for_user: {
        Args: { target_memory_id: string; target_user_id: string }
        Returns: Json
      }
      moment_payload_for_user: {
        Args: { target_moment_id: string; target_user_id: string }
        Returns: Json
      }
      pair_state_for_user: { Args: { target_user_id: string }; Returns: Json }
      preview_pair_invitation: {
        Args: { invitation_credential: string }
        Returns: Json
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

