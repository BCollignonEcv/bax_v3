<script setup lang="ts">
import { Plus } from '@lucide/vue'

defineProps<{ label: string }>()
</script>

<template>
  <button
    type="button"
    class="bottom-safe fixed right-5 z-20 flex size-16 items-center justify-center rounded-[22px] bg-ink text-on-ink shadow-xl active:scale-95"
    :aria-label="label"
  >
    <Plus :size="28" />
  </button>
</template>
