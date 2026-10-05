<script setup lang="ts">
import { Archive, Check, Info, Trash2, WifiOff } from '@lucide/vue'
import { useToastStore } from '@/core/stores/toast'

const toast = useToastStore()
const icons = { check: Check, archive: Archive, trash: Trash2, info: Info, offline: WifiOff }
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="toast.current"
        :key="toast.current.id"
        class="bottom-safe fixed inset-x-4 z-[60] mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-on-ink shadow-xl"
        role="status"
      >
        <component :is="icons[toast.current.icon ?? 'info']" :size="18" class="shrink-0 opacity-80" />
        <span class="min-w-0 flex-1 truncate py-2 text-sm font-medium">{{ toast.current.message }}</span>
        <button
          v-if="toast.current.undo"
          type="button"
          class="shrink-0 rounded-xl bg-canvas px-4 py-2.5 text-sm font-bold text-ink active:opacity-80"
          @click="toast.undo()"
        >
          Annuler
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  transform: translateY(24px);
  opacity: 0;
}
</style>
