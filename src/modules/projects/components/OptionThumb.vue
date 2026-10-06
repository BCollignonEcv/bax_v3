<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePhotosStore } from '../stores/photos'

/** Miniature d'une option (image récupérée depuis son lien), fond blanc comme sur les sites marchands. */
const props = defineProps<{ path: string }>()

const photos = usePhotosStore()
const failed = ref(false)
const src = computed(() => photos.url(props.path))
watch(src, () => (failed.value = false))
</script>

<template>
  <!-- Image en position absolue : la taille vient du conteneur, jamais de l'image. -->
  <span class="relative block shrink-0 overflow-hidden rounded-xl border border-line bg-white">
    <img
      v-if="src && !failed"
      :src="src"
      alt=""
      class="absolute inset-0 size-full object-contain"
      loading="lazy"
      draggable="false"
      @error="failed = true"
    />
  </span>
</template>
