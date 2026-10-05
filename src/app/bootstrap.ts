import { modules } from './modules'
import { useProfilesStore } from '@/core/stores/profiles'
import { startRealtime, syncAll } from '@/core/sync'

let started = false

/** Après la connexion : cache local, puis Realtime, puis chargement complet. */
export async function startApp() {
  if (started) return
  started = true
  await useProfilesStore().start()
  for (const module of modules) await module.start?.()
  startRealtime()
  void syncAll()
}
