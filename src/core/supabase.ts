import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies (voir .env.example).')
}

// Uniquement la clé publique (anon) : les droits sont portés par les politiques RLS.
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'bax-auth',
  },
})

export const SUPABASE_URL = url
export const SUPABASE_ANON_KEY = anonKey
