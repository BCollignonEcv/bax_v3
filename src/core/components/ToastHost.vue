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
        class="bottom-safe fixed inset-x-4 z-[60] mx-auto flex max-w-lg items-center gap-3 overflow-hidden rounded-2xl bg-ink py-2 pr-2 pl-4 text-on-ink shadow-xl"
        role="status"
      >
        <component :is="icons[toast.current.icon ?? 'info']" :size="18" class="shrink-0 opacity-80" />
        <span class="line-clamp-2 min-w-0 flex-1 py-2 text-sm font-medium">{{ toast.current.message }}</span>
        <button
          v-if="toast.current.undo"
          type="button"
          class="shrink-0 rounded-xl bg-canvas px-4 py-2.5 text-sm font-bold text-ink active:opacity-80"
          @click="toast.undo()"
        >
          Annuler
        </button>
        <!-- Décompte avant l'application de l'action (fin du « Annuler ») -->
        <span
          class="toast-countdown absolute bottom-0 left-0 h-[3px] bg-on-ink/35"
          :style="{ animationDuration: `${toast.current.duration ?? 5000}ms` }"
          aria-hidden="true"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-countdown {
  width: 100%;
  animation: toast-countdown linear forwards;
}
@keyframes toast-countdown {
  to {
    width: 0;
  }
}
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
