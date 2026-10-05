import { computed, ref, type Ref } from 'vue'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

/**
 * Copie locale d'une table, indexée par clé. Toutes les données tiennent en mémoire
 * (deux utilisateurs) : les écrans calculent tout à partir de ces collections.
 */
export function createCollection<T extends object>(keyOf: (row: Partial<T>) => string) {
  const byKey = ref({}) as Ref<Record<string, T>>
  const all = computed(() => Object.values(byKey.value))

  function replaceAll(rows: T[]) {
    byKey.value = Object.fromEntries(rows.map((row) => [keyOf(row), row]))
  }

  function upsert(row: T) {
    byKey.value[keyOf(row)] = row
  }

  function patch(key: string, changes: Partial<T>) {
    const row = byKey.value[key]
    if (row) byKey.value[key] = { ...row, ...changes }
  }

  function remove(key: string) {
    delete byKey.value[key]
  }

  function get(key: string): T | undefined {
    return byKey.value[key]
  }

  /** Applique un événement Realtime (INSERT / UPDATE / DELETE). */
  function applyChange(payload: RealtimePostgresChangesPayload<T>) {
    if (payload.eventType === 'DELETE') remove(keyOf(payload.old))
    else upsert(payload.new as T)
  }

  return { byKey, all, replaceAll, upsert, patch, remove, get, applyChange }
}
