<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; title: string; text?: string }>()
</script>

<template>
  <div class="flex flex-col items-center px-6 py-16 text-center">
    <span class="mb-6 flex size-24 items-center justify-center rounded-[28px] bg-sunken text-ink-soft">
      <component :is="icon" :size="34" :stroke-width="1.75" />
    </span>
    <h2 class="text-xl font-bold">{{ title }}</h2>
    <p v-if="text" class="mt-2 max-w-xs text-muted">{{ text }}</p>
    <div class="mt-6 flex flex-col items-center gap-4">
      <slot />
    </div>
  </div>
</template>
