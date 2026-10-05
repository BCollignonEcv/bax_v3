<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { Status } from '../types'

defineProps<{ status: Status }>()
</script>

<template>
  <button
    type="button"
    class="-m-2 flex size-11 shrink-0 items-center justify-center"
    :aria-label="status === 'done' ? 'Remettre à faire' : 'Terminer'"
  >
    <span
      class="flex size-7 items-center justify-center rounded-full border-2 transition-colors"
      :class="{
        'border-muted/60': status === 'todo',
        'border-doing': status === 'in_progress',
        'border-done bg-done text-white': status === 'done',
      }"
    >
      <span v-if="status === 'in_progress'" class="size-3 rounded-full bg-doing" />
      <Check v-else-if="status === 'done'" :size="16" :stroke-width="3" />
    </span>
  </button>
</template>
