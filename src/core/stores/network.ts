import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToastStore } from './toast'

export const OFFLINE_MESSAGE = 'Hors connexion : les modifications reviendront avec le réseau.'

export const useNetworkStore = defineStore('network', () => {
  const online = ref(navigator.onLine)

  window.addEventListener('online', () => (online.value = true))
  window.addEventListener('offline', () => (online.value = false))

  /** À appeler avant toute modification : bloque et prévient si l'appareil est hors connexion. */
  function requireOnline(): boolean {
    if (online.value) return true
    useToastStore().show({ message: OFFLINE_MESSAGE, icon: 'offline' })
    return false
  }

  return { online, requireOnline }
})
