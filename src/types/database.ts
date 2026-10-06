export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
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
      shopping_item_options: {
        Row: {
          created_at: string
          created_by: string
          id: string
          image_path: string | null
          item_id: string
          label: string | null
          note: string | null
          position: number
          price: number | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          image_path?: string | null
          item_id: string
          label?: string | null
          note?: string | null
          position?: number
          price?: number | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          image_path?: string | null
          item_id?: string
          label?: string | null
          note?: string | null
          position?: number
          price?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shopping_item_options_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shopping_item_options_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'shopping_items'
            referencedColumns: ['id']
          },
        ]
      }
      shopping_items: {
        Row: {
          chosen_option_id: string | null
          created_at: string
          id: string
          name: string
          note: string | null
          price: number | null
          purchased: boolean
          quantity: number | null
        }
        Insert: {
          chosen_option_id?: string | null
          created_at?: string
          id?: string
          name: string
          note?: string | null
          price?: number | null
          purchased?: boolean
          quantity?: number | null
        }
        Update: {
          chosen_option_id?: string | null
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          price?: number | null
          purchased?: boolean
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'shopping_items_chosen_option_fkey'
            columns: ['chosen_option_id', 'id']
            isOneToOne: false
            referencedRelation: 'shopping_item_options'
            referencedColumns: ['id', 'item_id']
          },
        ]
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
            foreignKeyName: 'task_photos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
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
            foreignKeyName: 'tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
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
      reorder_projects: { Args: { ids: string[] }; Returns: undefined }
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      task_priority: ['high', 'medium', 'low'],
      task_status: ['todo', 'in_progress', 'done'],
    },
  },
} as const
