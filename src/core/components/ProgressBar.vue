<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: number; total: number; color: string }>()
const percent = computed(() => (props.total ? Math.round((props.value / props.total) * 100) : 0))
</script>

<template>
  <div
    class="h-1.5 w-full overflow-hidden rounded-full bg-track"
    role="progressbar"
    :aria-valuenow="value"
    :aria-valuemax="total"
  >
    <div
      class="h-full rounded-full transition-[width] duration-300"
      :style="{ width: `${percent}%`, background: color }"
    />
  </div>
</template>
