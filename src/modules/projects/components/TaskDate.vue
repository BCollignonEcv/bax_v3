<script setup lang="ts">
import { computed } from 'vue'
import { Calendar, CalendarClock } from '@lucide/vue'
import { formatShortDate, isOverdue } from '@/core/format'

const props = defineProps<{ date: string; done?: boolean }>()
// Date dépassée : simple icône différente, couleur neutre, aucune alerte.
const overdue = computed(() => !props.done && isOverdue(props.date))
</script>

<template>
  <span
    class="inline-flex items-center gap-1 text-[13px] text-ink-soft"
    :title="overdue ? 'Date cible dépassée' : undefined"
  >
    <component :is="overdue ? CalendarClock : Calendar" :size="14" />
    {{ formatShortDate(date) }}
  </span>
</template>
