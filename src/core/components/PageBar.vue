<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue'
import { useRouter } from 'vue-router'

const props = defineProps<{ back?: string | false }>()
const router = useRouter()

function goBack() {
  // Retour dans l'historique si possible, sinon vers la page parente.
  if (window.history.state?.back) router.back()
  else if (props.back) router.replace(props.back)
}
</script>

<template>
  <div class="flex h-11 items-center justify-between">
    <button
      v-if="back !== false"
      type="button"
      class="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-sunken"
      aria-label="Retour"
      @click="goBack"
    >
      <ChevronLeft :size="24" />
    </button>
    <span v-else />
    <div class="-mr-2 flex items-center">
      <slot />
    </div>
  </div>
</template>
