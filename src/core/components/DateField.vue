<script setup lang="ts">
import { ref } from 'vue'
import { Calendar, X } from '@lucide/vue'
import { formatLongDate } from '@/core/format'

withDefaults(defineProps<{ placeholder?: string; compact?: boolean }>(), { placeholder: 'Aucune' })
const model = defineModel<string | null>({ required: true })
const input = ref<HTMLInputElement>()

function open() {
  const el = input.value
  if (!el) return
  try {
    el.showPicker()
  } catch {
    el.focus()
    el.click()
  }
}
</script>

<template>
  <div class="field relative flex items-center gap-3 px-0 pl-4">
    <Calendar :size="20" class="shrink-0 text-ink-soft" />
    <button type="button" class="h-full min-w-0 flex-1 truncate text-left font-semibold" @click="open">
      <span v-if="model">{{ formatLongDate(model) }}</span>
      <span v-else class="font-normal text-muted">{{ placeholder }}</span>
    </button>
    <button
      v-if="model && !compact"
      type="button"
      class="flex size-12 shrink-0 items-center justify-center text-ink-soft"
      aria-label="Retirer la date"
      @click="model = null"
    >
      <X :size="20" />
    </button>
    <!-- Sélecteur natif (iOS / Android), invisible -->
    <input
      ref="input"
      type="date"
      class="pointer-events-none absolute inset-0 opacity-0"
      tabindex="-1"
      aria-hidden="true"
      :value="model ?? ''"
      @change="model = ($event.target as HTMLInputElement).value || null"
    />
  </div>
</template>
