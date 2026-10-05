<script setup lang="ts">
import { PRIORITY_LABEL, type Priority } from '../types'

defineProps<{ priority: Priority; hideLabel?: boolean }>()
const bars: Record<Priority, number> = { high: 3, medium: 2, low: 1 }
</script>

<template>
  <span
    class="inline-flex items-center gap-1 text-[13px] font-semibold"
    :class="{
      'text-prio-high': priority === 'high',
      'text-prio-medium': priority === 'medium',
      'text-prio-low': priority === 'low',
    }"
  >
    <svg width="12" height="11" viewBox="0 0 12 11" aria-hidden="true">
      <rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" />
      <rect
        x="4.5"
        y="4"
        width="3"
        height="7"
        rx="1"
        fill="currentColor"
        :opacity="bars[priority] >= 2 ? 1 : 0.25"
      />
      <rect
        x="9"
        y="0"
        width="3"
        height="11"
        rx="1"
        fill="currentColor"
        :opacity="bars[priority] >= 3 ? 1 : 0.25"
      />
    </svg>
    <span v-if="!hideLabel">{{ PRIORITY_LABEL[priority] }}</span>
  </span>
</template>
