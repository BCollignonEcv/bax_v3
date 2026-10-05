<script setup lang="ts">
withDefaults(defineProps<{ emoji: string; color: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
</script>

<template>
  <span
    class="tile inline-flex shrink-0 items-center justify-center"
    :class="{
      'size-7 rounded-lg text-base': size === 'sm',
      'size-12 rounded-2xl text-2xl': size === 'md',
      'size-[72px] rounded-3xl text-4xl': size === 'lg',
    }"
    :style="{ '--tile': color }"
  >
    {{ emoji }}
  </span>
</template>

<style scoped>
.tile {
  background: color-mix(in srgb, var(--tile) 18%, var(--card));
}
</style>
