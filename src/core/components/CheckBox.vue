<script setup lang="ts">
import { Check } from '@lucide/vue'

defineProps<{ checked: boolean; label: string }>()
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="checked"
    :aria-label="label"
    class="flex size-11 shrink-0 items-center justify-center"
  >
    <span
      class="flex size-6 items-center justify-center rounded-md border-2 transition-colors"
      :class="checked ? 'border-done bg-done text-white' : 'border-muted/70'"
    >
      <Check v-if="checked" :size="16" :stroke-width="3" />
    </span>
  </button>
</template>
