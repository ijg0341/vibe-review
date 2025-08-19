import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (will be generated from Supabase)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          path: string
          description: string | null
          created_at: string
          updated_at: string
          last_synced_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          path: string
          description?: string | null
          created_at?: string
          updated_at?: string
          last_synced_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          path?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          last_synced_at?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          project_id: string
          session_id: string
          file_type: 'jsonl' | 'html'
          file_path: string
          content: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          session_id: string
          file_type: 'jsonl' | 'html'
          file_path: string
          content: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          session_id?: string
          file_type?: 'jsonl' | 'html'
          file_path?: string
          content?: any
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          session_id: string
          reviewer_id: string
          content: string
          line_number: number | null
          status: 'pending' | 'resolved'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          reviewer_id: string
          content: string
          line_number?: number | null
          status?: 'pending' | 'resolved'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          reviewer_id?: string
          content?: string
          line_number?: number | null
          status?: 'pending' | 'resolved'
          created_at?: string
          updated_at?: string
        }
      }
      review_threads: {
        Row: {
          id: string
          review_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
    }
  }
}