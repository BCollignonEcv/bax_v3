<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps<{ open: boolean; title?: string }>()
const emit = defineEmits<{ close: [] }>()

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
)

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-40 bg-scrim" @click="emit('close')" />
    </Transition>
    <Transition name="sheet">
      <div
        v-if="open"
        class="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] max-w-xl overflow-y-auto rounded-t-[28px] bg-card px-5 pt-3"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        <slot name="header">
          <h2 v-if="title" class="mb-4 text-xl font-bold">{{ title }}</h2>
        </slot>
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}
</style>
