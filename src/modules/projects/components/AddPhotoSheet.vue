<script setup lang="ts">
import { ref } from 'vue'
import { Camera, Image } from '@lucide/vue'
import BottomSheet from '@/core/components/BottomSheet.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; files: [files: File[]] }>()

const camera = ref<HTMLInputElement>()
const gallery = ref<HTMLInputElement>()

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  emit('close')
  if (files.length) emit('files', files)
}
</script>

<template>
  <BottomSheet :open="open" title="Ajouter des photos" @close="emit('close')">
    <div class="space-y-2">
      <button
        type="button"
        class="flex w-full items-center gap-4 rounded-2xl bg-canvas p-3 text-left"
        @click="camera?.click()"
      >
        <span class="flex size-12 items-center justify-center rounded-xl bg-ink text-on-ink"
          ><Camera :size="20"
        /></span>
        <span>
          <span class="block font-bold">Prendre une photo</span>
          <span class="text-sm text-ink-soft">Ouvre l'appareil photo</span>
        </span>
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-4 rounded-2xl bg-canvas p-3 text-left"
        @click="gallery?.click()"
      >
        <span class="flex size-12 items-center justify-center rounded-xl bg-ink text-on-ink"
          ><Image :size="20"
        /></span>
        <span>
          <span class="block font-bold">Choisir dans la galerie</span>
          <span class="text-sm text-ink-soft">Vous pouvez en sélectionner plusieurs</span>
        </span>
      </button>
      <button type="button" class="btn-soft mt-2 w-full" @click="emit('close')">Annuler</button>
    </div>
    <input
      ref="camera"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onChange"
    />
    <input ref="gallery" type="file" accept="image/*" multiple class="hidden" @change="onChange" />
  </BottomSheet>
</template>
