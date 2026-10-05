<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Image } from '@lucide/vue'
import { usePhotosStore } from '../stores/photos'
import { thumbPath } from '../types'

const props = defineProps<{ path?: string; src?: string; caption?: string | null }>()

const photos = usePhotosStore()
const failed = ref(false)
const url = computed(() => props.src ?? (props.path ? photos.url(thumbPath(props.path)) : undefined))
watch(url, () => (failed.value = false))
</script>

<template>
  <div class="relative aspect-square overflow-hidden rounded-2xl bg-sunken">
    <img
      v-if="url && !failed"
      :src="url"
      alt=""
      class="size-full object-cover"
      loading="lazy"
      draggable="false"
      @error="failed = true"
    />
    <span v-else class="flex size-full items-center justify-center text-ink-soft"><Image :size="22" /></span>
    <span
      v-if="caption"
      class="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-md bg-card/90 px-1.5 py-0.5 text-[11px] font-semibold"
    >
      {{ caption }}
    </span>
    <slot />
  </div>
</template>
