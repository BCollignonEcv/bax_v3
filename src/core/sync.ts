import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/core/supabase'
import { useToastStore } from '@/core/stores/toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChangeHandler = (payload: RealtimePostgresChangesPayload<any>) => void

const tableHandlers = new Map<string, ChangeHandler>()
const syncers: Array<() => Promise<void>> = []
let channel: RealtimeChannel | null = null
let syncing: Promise<void> | null = null

/** Les stores déclarent ici comment appliquer les changements d'une table. */
export function onTableChange(table: string, handler: ChangeHandler) {
  tableHandlers.set(table, handler)
}

/** Les stores déclarent ici comment recharger leurs données depuis Supabase. */
export function registerSync(fn: () => Promise<void>) {
  syncers.push(fn)
}

/** Recharge tout. Appelé au démarrage, à la reconnexion et au retour au premier plan. */
export function syncAll(): Promise<void> {
  if (!navigator.onLine) return Promise.resolve()
  syncing ??= Promise.allSettled(syncers.map((fn) => fn())).then(() => {
    syncing = null
  })
  return syncing
}

export function startRealtime() {
  if (channel) return
  channel = supabase
    .channel('bax-db')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      tableHandlers.get(payload.table)?.(payload)
    })
    .subscribe((status) => {
      // Après une coupure, on recharge pour rattraper les changements manqués.
      if (status === 'SUBSCRIBED') void syncAll()
    })

  window.addEventListener('online', () => void syncAll())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncAll()
  })
}

const DEFAULT_ERROR = "La modification n'a pas pu être enregistrée."

/** Message discret et rechargement, pour que l'écran revienne à l'état réel de la base. */
export function reportError(error: unknown, message = DEFAULT_ERROR) {
  console.error(error)
  useToastStore().show({ message, icon: 'info' })
  void syncAll()
}

/** Exécute une écriture Supabase et signale un éventuel échec. */
export async function save(
  operation: PromiseLike<{ error: unknown }>,
  message = DEFAULT_ERROR,
): Promise<boolean> {
  try {
    const { error } = await operation
    if (!error) return true
    reportError(error, message)
  } catch (error) {
    reportError(error, message)
  }
  return false
}
