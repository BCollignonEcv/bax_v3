<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <button
    type="button"
    class="flex size-11 items-center justify-center rounded-full text-ink active:bg-sunken"
    :aria-label="label"
  >
    <slot />
  </button>
</template>
