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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          ai_relevance_score: number | null
          ai_relevance_tags: string[] | null
          ai_review_status: string | null
          created_at: string
          description: string | null
          feed_id: string | null
          fetched_at: string
          id: string
          is_deleted: boolean
          link: string
          published_at: string | null
          recommendation_score: number | null
          relevance_score: number
          sent_to_newsletter: boolean
          source_name: string | null
          summary: string | null
          title: string
        }
        Insert: {
          ai_relevance_score?: number | null
          ai_relevance_tags?: string[] | null
          ai_review_status?: string | null
          created_at?: string
          description?: string | null
          feed_id?: string | null
          fetched_at?: string
          id?: string
          is_deleted?: boolean
          link: string
          published_at?: string | null
          recommendation_score?: number | null
          relevance_score?: number
          sent_to_newsletter?: boolean
          source_name?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          ai_relevance_score?: number | null
          ai_relevance_tags?: string[] | null
          ai_review_status?: string | null
          created_at?: string
          description?: string | null
          feed_id?: string | null
          fetched_at?: string
          id?: string
          is_deleted?: boolean
          link?: string
          published_at?: string | null
          recommendation_score?: number | null
          relevance_score?: number
          sent_to_newsletter?: boolean
          source_name?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      feeds: {
        Row: {
          approval_rate: number | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          topic_id: string | null
          total_articles: number | null
          updated_at: string
          url: string
        }
        Insert: {
          approval_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          topic_id?: string | null
          total_articles?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          approval_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          topic_id?: string | null
          total_articles?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "feeds_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      filter_terms: {
        Row: {
          created_at: string
          id: string
          term: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          term: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          term?: string
          type?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          id: string
          keywords: string[]
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          keywords?: string[]
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: string[]
          name?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          article_id: string
          created_at: string
          id: string
          vote: number
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          vote: number
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          vote?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_recommendation_score: {
        Args: {
          p_ai_relevance_score: number
          p_ai_review_status: string
          p_published_at: string
          p_relevance_score: number
          p_source_approval_rate: number
        }
        Returns: number
      }
      recalculate_source_reputation: { Args: never; Returns: undefined }
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
