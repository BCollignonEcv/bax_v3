<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; label: string; count?: number | null }>()
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-4 py-3.5 text-left font-semibold active:opacity-60"
  >
    <component :is="icon" :size="20" :stroke-width="1.75" class="shrink-0 text-ink-soft" />
    <span class="flex-1">{{ label }}</span>
    <span v-if="count != null" class="text-sm text-muted">{{ count }}</span>
  </button>
</template>
