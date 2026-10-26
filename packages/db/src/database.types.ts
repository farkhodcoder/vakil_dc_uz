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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      payment_events: {
        Row: {
          action: number
          click_error: number | null
          click_trans_id: number | null
          created_at: string
          id: number
          payment_id: string | null
          response_error: number
        }
        Insert: {
          action: number
          click_error?: number | null
          click_trans_id?: number | null
          created_at?: string
          id?: never
          payment_id?: string | null
          response_error: number
        }
        Update: {
          action?: number
          click_error?: number | null
          click_trans_id?: number | null
          created_at?: string
          id?: never
          payment_id?: string | null
          response_error?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_tiyin: number
          cancelled_at: string | null
          click_error: number | null
          click_paydoc_id: number | null
          click_trans_id: number | null
          confirm_id: number | null
          created_at: string
          id: string
          paid_at: string | null
          prepare_id: number | null
          prepared_at: string | null
          provider: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_tiyin: number
          cancelled_at?: string | null
          click_error?: number | null
          click_paydoc_id?: number | null
          click_trans_id?: number | null
          confirm_id?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          prepare_id?: number | null
          prepared_at?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_tiyin?: number
          cancelled_at?: string | null
          click_error?: number | null
          click_paydoc_id?: number | null
          click_trans_id?: number | null
          confirm_id?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          prepare_id?: number | null
          prepared_at?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          payment_id: string
          status: Database["public"]["Enums"]["practice_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          payment_id: string
          status?: Database["public"]["Enums"]["practice_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          payment_id?: string
          status?: Database["public"]["Enums"]["practice_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      click_complete: { Args: { p_form: Json }; Returns: Json }
      click_prepare: { Args: { p_form: Json }; Returns: Json }
      complete_practice: { Args: { p_session_id: string }; Returns: Json }
      create_practice_payment: { Args: never; Returns: Json }
      my_practice: { Args: never; Returns: Json }
    }
    Enums: {
      payment_status: "created" | "prepared" | "paid" | "cancelled"
      practice_status: "available" | "completed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      payment_status: ["created", "prepared", "paid", "cancelled"],
      practice_status: ["available", "completed"],
    },
  },
} as const
