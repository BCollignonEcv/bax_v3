<script setup lang="ts">
defineProps<{ chosen?: boolean }>()
const emit = defineEmits<{ choose: []; unchoose: [] }>()
</script>

<template>
  <button
    v-if="chosen"
    type="button"
    class="shrink-0 py-1 text-sm font-semibold underline underline-offset-4"
    @click.stop="emit('unchoose')"
  >
    Ne plus retenir
  </button>
  <button
    v-else
    type="button"
    class="h-11 shrink-0 rounded-2xl bg-sunken px-5 text-sm font-bold active:opacity-80"
    @click.stop="emit('choose')"
  >
    Choisir
  </button>
</template>
