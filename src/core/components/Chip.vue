<script setup lang="ts">
defineProps<{ active?: boolean }>()
</script>

<template>
  <button
    type="button"
    class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors"
    :class="active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-card text-ink'"
    :aria-pressed="active"
  >
    <slot />
  </button>
</template>
