export interface Database {
  public: {
    Tables: {
      channels: {
        Row: {
          id: string
          name: string
          url: string
          logo: string | null
          category: string | null
          rating: number
          votes: {
            likes: number
            dislikes: number
          }
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          logo?: string | null
          category?: string | null
          rating?: number
          votes?: {
            likes: number
            dislikes: number
          }
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          logo?: string | null
          category?: string | null
          rating?: number
          votes?: {
            likes: number
            dislikes: number
          }
          created_at?: string
          updated_at?: string
        }
      }
      playlists: {
        Row: {
          id: string
          name: string
          url: string
          format: string
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          format: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          format?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          activation_code: string | null
          user_level: number
          activated_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          activation_code?: string | null
          user_level?: number
          activated_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          activation_code?: string | null
          user_level?: number
          activated_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          content: string
          type: string
          target_levels: number[]
          is_global: boolean
          schedule_time: string | null
          interval_seconds: number | null
          is_active: boolean
          expires_at: string | null
          image_url: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          type: string
          target_levels: number[]
          is_global?: boolean
          schedule_time?: string | null
          interval_seconds?: number | null
          is_active?: boolean
          expires_at?: string | null
          image_url?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          type?: string
          target_levels?: number[]
          is_global?: boolean
          schedule_time?: string | null
          interval_seconds?: number | null
          is_active?: boolean
          expires_at?: string | null
          image_url?: string | null
          created_by?: string
          created_at?: string
        }
      }
      activation_codes: {
        Row: {
          id: string
          code: string
          user_level: number
          is_used: boolean
          used_by: string | null
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          user_level: number
          is_used?: boolean
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          user_level?: number
          is_used?: boolean
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
      }
      channel_votes: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          vote_type: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          vote_type: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          vote_type?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 