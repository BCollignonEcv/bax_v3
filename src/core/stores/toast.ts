import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastIcon = 'check' | 'archive' | 'trash' | 'info' | 'offline'

export interface ToastOptions {
  message: string
  icon?: ToastIcon
  /** Affiche « Annuler » : appelée si l'utilisateur annule avant la fin. */
  undo?: () => void
  /** Appelée à la fin du toast (ou quand un autre toast le remplace) si rien n'a été annulé. */
  commit?: () => void | Promise<void>
  duration?: number
}

interface ActiveToast extends ToastOptions {
  id: number
}

const DEFAULT_DURATION = 5000

/**
 * Un seul toast à la fois. Les suppressions sont différées : l'action réelle (commit)
 * n'est faite qu'à la fin du toast, ce qui rend « Annuler » fiable.
 */
export const useToastStore = defineStore('toast', () => {
  const current = ref<ActiveToast | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let nextId = 1

  function settle() {
    clearTimeout(timer)
    const toast = current.value
    current.value = null
    if (toast?.commit) void toast.commit()
  }

  function show(options: ToastOptions) {
    settle()
    const toast = { ...options, id: nextId++ }
    current.value = toast
    timer = setTimeout(() => {
      if (current.value?.id === toast.id) settle()
    }, options.duration ?? DEFAULT_DURATION)
  }

  function undo() {
    clearTimeout(timer)
    const toast = current.value
    current.value = null
    toast?.undo?.()
  }

  function dismiss() {
    settle()
  }

  // Si l'app passe en arrière-plan, on applique tout de suite l'action en attente.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') settle()
    })
    window.addEventListener('pagehide', settle)
  }

  return { current, show, undo, dismiss }
})
