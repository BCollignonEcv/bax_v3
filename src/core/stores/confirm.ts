import { defineStore } from 'pinia'
import { ref, type Component } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  icon?: Component
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

/** Boîte de confirmation centrée, appelée comme une promesse : `if (await ask({...}))`. */
export const useConfirmStore = defineStore('confirm', () => {
  const pending = ref<PendingConfirm | null>(null)

  function ask(options: ConfirmOptions): Promise<boolean> {
    pending.value?.resolve(false)
    return new Promise((resolve) => {
      pending.value = { ...options, resolve }
    })
  }

  function answer(ok: boolean) {
    pending.value?.resolve(ok)
    pending.value = null
  }

  return { pending, ask, answer }
})
