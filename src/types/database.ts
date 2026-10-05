// Fichier généré par `npm run types:supabase` (supabase gen types typescript).
// Ne pas modifier à la main : régénérer après chaque migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          color: string
          first_name: string
          id: string
        }
        Insert: {
          color: string
          first_name: string
          id: string
        }
        Update: {
          color?: string
          first_name?: string
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          color: string
          created_at: string
          created_by: string
          description: string | null
          icon: string
          id: string
          name: string
          position: number
          target_date: string | null
        }
        Insert: {
          archived_at?: string | null
          color: string
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          position?: number
          target_date?: string | null
        }
        Update: {
          archived_at?: string | null
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          position?: number
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'projects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      shopping_items: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
          price: number | null
          purchased: boolean
          quantity: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note?: string | null
          price?: number | null
          purchased?: boolean
          quantity?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          price?: number | null
          purchased?: boolean
          quantity?: number | null
        }
        Relationships: []
      }
      task_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          id: string
          position: number
          storage_path: string
          task_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string
          id?: string
          position?: number
          storage_path: string
          task_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          id?: string
          position?: number
          storage_path?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_photos_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      task_shopping_items: {
        Row: {
          item_id: string
          position: number
          task_id: string
        }
        Insert: {
          item_id: string
          position?: number
          task_id: string
        }
        Update: {
          item_id?: string
          position?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_shopping_items_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'shopping_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_shopping_items_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          assignee_ids: string[]
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: Database['public']['Enums']['task_priority']
          project_id: string
          status: Database['public']['Enums']['task_status']
          target_date: string | null
          title: string
        }
        Insert: {
          archived_at?: string | null
          assignee_ids?: string[]
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: Database['public']['Enums']['task_priority']
          project_id: string
          status?: Database['public']['Enums']['task_status']
          target_date?: string | null
          title: string
        }
        Update: {
          archived_at?: string | null
          assignee_ids?: string[]
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: Database['public']['Enums']['task_priority']
          project_id?: string
          status?: Database['public']['Enums']['task_status']
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reorder_projects: {
        Args: { ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      task_priority: 'high' | 'medium' | 'low'
      task_status: 'todo' | 'in_progress' | 'done'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
