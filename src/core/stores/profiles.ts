import { defineStore } from 'pinia'
import { computed } from 'vue'
import { supabase } from '@/core/supabase'
import { createCollection } from '@/core/collection'
import { persist, restore } from '@/core/persist'
import { onTableChange, registerSync } from '@/core/sync'
import type { Tables } from '@/types/database'
import { useAuthStore } from './auth'

export type Profile = Tables<'profiles'>

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = createCollection<Profile>((p) => p.id!)
  const auth = useAuthStore()

  /** Ordre d'affichage stable : soi-même d'abord, puis par prénom. */
  const list = computed(() =>
    [...profiles.all.value].sort(
      (a, b) =>
        Number(b.id === auth.userId) - Number(a.id === auth.userId) ||
        a.first_name.localeCompare(b.first_name, 'fr'),
    ),
  )
  const me = computed(() => (auth.userId ? profiles.get(auth.userId) : undefined))
  const allIds = computed(() => list.value.map((p) => p.id))

  function byId(id: string | null | undefined) {
    return id ? profiles.get(id) : undefined
  }

  async function fetch() {
    const { data, error } = await supabase.from('profiles').select('*')
    if (!error && data) profiles.replaceAll(data)
  }

  async function start() {
    const cached = await restore<Profile[]>('profiles')
    if (cached && profiles.all.value.length === 0) profiles.replaceAll(cached)
    persist('profiles', () => profiles.all.value)
    onTableChange('profiles', profiles.applyChange)
    registerSync(fetch)
  }

  return { byKey: profiles.byKey, list, me, allIds, byId, start }
})
