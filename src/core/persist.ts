import { get, set } from 'idb-keyval'
import { watch } from 'vue'

const PREFIX = 'bax:'

/** Relit la dernière copie enregistrée (consultation hors connexion). */
export async function restore<T>(key: string): Promise<T | undefined> {
  try {
    return await get<T>(PREFIX + key)
  } catch {
    return undefined
  }
}

/** Enregistre la valeur dans IndexedDB à chaque changement (regroupé). */
export function persist(key: string, source: () => unknown, delay = 400) {
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(
    source,
    (value) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        set(PREFIX + key, JSON.parse(JSON.stringify(value))).catch(() => {})
      }, delay)
    },
    { deep: true },
  )
}
