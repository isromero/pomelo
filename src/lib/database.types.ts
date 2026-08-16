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
        }
        Insert: {
          active?: boolean
          concept_key: string
          created_at?: string
          format: string
          prompt_en: string
          prompt_es: string
        }
        Update: {
          active?: boolean
          concept_key?: string
          created_at?: string
          format?: string
          prompt_en?: string
          prompt_es?: string
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
      get_pair_state: { Args: never; Returns: Json }
      pair_state_for_user: { Args: { target_user_id: string }; Returns: Json }
      preview_pair_invitation: {
        Args: { invitation_credential: string }
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

