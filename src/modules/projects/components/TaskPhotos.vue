<script setup lang="ts">
import { computed, ref } from 'vue'
import { Camera, Plus } from '@lucide/vue'
import { useNetworkStore } from '@/core/stores/network'
import { usePhotosStore } from '../stores/photos'
import AddPhotoSheet from './AddPhotoSheet.vue'
import PhotoThumb from './PhotoThumb.vue'
import PhotoViewer from './PhotoViewer.vue'

const props = defineProps<{ taskId: string }>()

const store = usePhotosStore()
const network = useNetworkStore()

const photos = computed(() => store.photosOf(props.taskId))
const uploads = computed(() => store.uploadsOf(props.taskId))
const sheetOpen = ref(false)
const viewerIndex = ref<number | null>(null)

function openSheet() {
  if (network.requireOnline()) sheetOpen.value = true
}
</script>

<template>
  <section>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-xl font-bold">
        Photos<span v-if="photos.length" class="font-sans text-base font-semibold text-ink-soft">
          · {{ photos.length }}</span
        >
      </h2>
    </div>

    <div v-if="photos.length || uploads.length" class="grid grid-cols-3 gap-2">
      <button
        v-for="(photo, i) in photos"
        :key="photo.id"
        type="button"
        class="text-left"
        :aria-label="photo.caption ?? `Photo ${i + 1}`"
        @click="viewerIndex = i"
      >
        <PhotoThumb :path="photo.storage_path" :caption="photo.caption" />
      </button>
      <PhotoThumb v-for="upload in uploads" :key="upload.id" :src="upload.preview">
        <div
          class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/55 text-sm font-semibold text-white"
        >
          <svg class="size-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              stroke-opacity="0.3"
              stroke-width="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="94.25"
              :stroke-dashoffset="94.25 * (1 - upload.progress)"
            />
          </svg>
          Envoi… {{ Math.round(upload.progress * 100) }} %
        </div>
      </PhotoThumb>
      <button
        type="button"
        class="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-muted/50 text-sm font-semibold text-ink-soft"
        @click="openSheet"
      >
        <Camera :size="20" /> Ajouter
      </button>
    </div>

    <div
      v-else
      class="flex flex-col items-center rounded-3xl border-[1.5px] border-dashed border-muted/50 px-6 py-8 text-center"
    >
      <span class="flex size-14 items-center justify-center rounded-2xl bg-sunken text-ink-soft"
        ><Camera :size="24"
      /></span>
      <p class="mt-3 font-bold">Aucune photo</p>
      <p class="mt-1 text-sm text-ink-soft">
        Mesures, emplacement, avant / après : gardez une trace en images.
      </p>
      <button type="button" class="btn-primary mt-4 h-11 rounded-2xl" @click="openSheet">
        <Plus :size="18" /> Ajouter une photo
      </button>
    </div>

    <AddPhotoSheet :open="sheetOpen" @close="sheetOpen = false" @files="store.addPhotos(taskId, $event)" />
    <PhotoViewer
      v-if="viewerIndex !== null"
      :photos="photos"
      :start-index="viewerIndex"
      @close="viewerIndex = null"
    />
  </section>
</template>
