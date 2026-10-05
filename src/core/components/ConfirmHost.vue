<script setup lang="ts">
import { useConfirmStore } from '@/core/stores/confirm'

const confirm = useConfirmStore()
</script>

<template>
  <Teleport to="body">
    <Transition name="pop">
      <div
        v-if="confirm.pending"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-scrim px-6"
        @click.self="confirm.answer(false)"
      >
        <div class="w-full max-w-sm rounded-[28px] bg-card p-5" role="alertdialog" aria-modal="true">
          <span
            v-if="confirm.pending.icon"
            class="mb-4 flex size-12 items-center justify-center rounded-2xl bg-done-soft text-done"
          >
            <component :is="confirm.pending.icon" :size="22" />
          </span>
          <h2 class="text-xl leading-tight font-bold">{{ confirm.pending.title }}</h2>
          <p v-if="confirm.pending.message" class="mt-2 text-ink-soft">{{ confirm.pending.message }}</p>
          <div class="mt-5 grid grid-cols-2 gap-3">
            <button type="button" class="btn-soft" @click="confirm.answer(false)">
              {{ confirm.pending.cancelLabel ?? 'Annuler' }}
            </button>
            <button type="button" class="btn-primary" @click="confirm.answer(true)">
              {{ confirm.pending.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.2s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
}
</style>
