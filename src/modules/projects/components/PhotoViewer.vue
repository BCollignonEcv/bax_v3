<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Pencil, Trash2, X } from '@lucide/vue'
import { formatShortDate } from '@/core/format'
import { useNetworkStore } from '@/core/stores/network'
import { useProfilesStore } from '@/core/stores/profiles'
import { usePhotosStore } from '../stores/photos'
import type { TaskPhoto } from '../types'

const props = defineProps<{ photos: TaskPhoto[]; startIndex: number }>()
const emit = defineEmits<{ close: [] }>()

const store = usePhotosStore()
const profiles = useProfilesStore()
const network = useNetworkStore()

const track = ref<HTMLElement>()
const index = ref(props.startIndex)
const caption = ref('')
const current = computed(() => props.photos[index.value])

watch(
  current,
  (photo) => {
    caption.value = photo?.caption ?? ''
    // Après une suppression, on reste sur la photo voisine.
    if (!photo) {
      if (props.photos.length) index.value = props.photos.length - 1
      else emit('close')
    }
  },
  { immediate: true },
)

// Balayage natif : défilement horizontal avec aimantation.
function onScroll() {
  const el = track.value
  if (!el) return
  const next = Math.round(el.scrollLeft / el.clientWidth)
  if (next !== index.value && next >= 0 && next < props.photos.length) index.value = next
}

function saveCaption() {
  const photo = current.value
  if (!photo) return
  const value = caption.value.trim() || null
  if (value !== photo.caption) void store.updateCaption(photo.id, value)
}

function remove() {
  const photo = current.value
  if (!photo) return
  store.deletePhoto(photo.id)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(async () => {
  document.documentElement.style.overflow = 'hidden'
  window.addEventListener('keydown', onKey)
  await nextTick()
  if (track.value) track.value.scrollLeft = track.value.clientWidth * props.startIndex
})

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-[#0f0c0a] text-white"
      role="dialog"
      aria-modal="true"
    >
      <header class="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-full bg-white/10"
          aria-label="Fermer"
          @click="emit('close')"
        >
          <X :size="22" />
        </button>
        <span class="font-semibold">{{ index + 1 }} sur {{ photos.length }}</span>
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-full bg-white/10 disabled:opacity-40"
          aria-label="Supprimer la photo"
          :disabled="!network.online"
          @click="remove"
        >
          <Trash2 :size="20" />
        </button>
      </header>

      <div
        ref="track"
        class="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        @scroll.passive="onScroll"
      >
        <div
          v-for="photo in photos"
          :key="photo.id"
          class="flex w-full shrink-0 snap-center items-center justify-center px-4"
        >
          <img
            v-if="store.url(photo.storage_path)"
            :src="store.url(photo.storage_path)"
            :alt="photo.caption ?? ''"
            class="max-h-full max-w-full rounded-2xl object-contain"
            draggable="false"
          />
        </div>
      </div>

      <div v-if="photos.length > 1" class="mt-3 flex justify-center gap-1.5">
        <span
          v-for="(photo, i) in photos"
          :key="photo.id"
          class="h-1.5 rounded-full transition-all"
          :class="i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'"
        />
      </div>

      <div class="px-4 pt-4">
        <label class="flex items-center gap-3 rounded-2xl bg-white/10 px-4">
          <input
            v-model="caption"
            class="h-13 min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-white/50"
            placeholder="Ajouter une légende"
            enterkeyhint="done"
            :readonly="!network.online"
            @blur="saveCaption"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
          <Pencil :size="16" class="shrink-0 opacity-60" />
        </label>
        <p v-if="current" class="mt-3 text-center text-sm text-white/60">
          Ajoutée par {{ profiles.byId(current.created_by)?.first_name ?? '—' }} ·
          {{ formatShortDate(current.created_at) }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
