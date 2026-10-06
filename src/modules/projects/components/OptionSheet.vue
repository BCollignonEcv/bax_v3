<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { Check, ImageDown, LoaderCircle, Trash2, X } from '@lucide/vue'
import BottomSheet from '@/core/components/BottomSheet.vue'
import { useNetworkStore } from '@/core/stores/network'
import { displayDomain, parseWebUrl } from '@/core/url'
import { parsePrice } from '../composables/itemName'
import { useOptionsStore, type OptionImageChange, type OptionInput } from '../stores/options'
import { usePhotosStore } from '../stores/photos'
import type { ItemOption } from '../types'

/** Ajout (option = null) ou modification d'une option. */
const props = defineProps<{ open: boolean; option: ItemOption | null }>()
const emit = defineEmits<{
  close: []
  save: [values: OptionInput, image: OptionImageChange]
  remove: []
}>()

/** 279.9 → « 279,90 », 249 → « 249 » (saisie française). */
function priceInput(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',')
}

const optionsStore = useOptionsStore()
const photos = usePhotosStore()
const network = useNetworkStore()

const form = reactive({ url: '', label: '', price: '', note: '' })
const touched = ref(false)
/** Aperçu du lien (image et prix lus sur la page). */
const preview = reactive({ status: 'idle' as 'idle' | 'loading' | 'done' | 'none', priceFound: false })
let requestId = 0
let debounce: ReturnType<typeof setTimeout> | undefined

// ---------- Image : celle déjà enregistrée, une nouvelle (aperçu), ou aucune ----------
const newImage = ref<{ blob: Blob; src: string } | null>(null)
const imageRemoved = ref(false)
const imageSrc = computed(() => {
  if (newImage.value) return newImage.value.src
  if (imageRemoved.value || !props.option?.image_path) return null
  return photos.url(props.option.image_path) ?? null
})

function setNewImage(blob: Blob | null) {
  if (newImage.value) URL.revokeObjectURL(newImage.value.src)
  newImage.value = blob ? { blob, src: URL.createObjectURL(blob) } : null
}

function removeImage() {
  setNewImage(null)
  imageRemoved.value = true
}

/** undefined : inchangée ; null : retirée ; Blob : nouvelle miniature. */
const imageChange = computed<OptionImageChange>(() => {
  if (newImage.value) return newImage.value.blob
  if (imageRemoved.value && props.option?.image_path) return null
  return undefined
})

watch(
  () => [props.open, props.option] as const,
  ([open, option]) => {
    if (!open) return
    touched.value = false
    form.url = option?.url ?? ''
    form.label = option?.label ?? ''
    form.price = option?.price != null ? priceInput(option.price) : ''
    form.note = option?.note ?? ''
    requestId++
    setNewImage(null)
    imageRemoved.value = false
    preview.status = 'idle'
    preview.priceFound = false
  },
  { immediate: true },
)

onBeforeUnmount(() => setNewImage(null))

const url = computed(() => parseWebUrl(form.url))
const showError = computed(() => touched.value && form.url.trim() !== '' && !url.value)

// ---------- Aperçu du lien : image et prix lus sur la page ----------

async function lookup(target: string) {
  const id = ++requestId
  preview.status = 'loading'
  const result = await optionsStore.fetchPreview(target)
  if (id !== requestId) return // un autre lien a été saisi entre-temps
  if (!result || (!result.image && result.price == null)) {
    preview.status = 'none'
    return
  }
  if (result.image) {
    setNewImage(result.image)
    imageRemoved.value = false
  }
  // Le prix trouvé ne remplace jamais un prix déjà saisi.
  if (result.price != null && !form.price.trim()) {
    form.price = priceInput(result.price)
    preview.priceFound = true
  }
  preview.status = 'done'
}

// Ajout : recherche automatique peu après la saisie d'un lien valide.
watch(url, (value) => {
  clearTimeout(debounce)
  requestId++
  if (!props.open || props.option || !value || !network.online) {
    preview.status = 'idle'
    return
  }
  debounce = setTimeout(() => void lookup(value), 600)
})

function lookupNow() {
  if (url.value && network.requireOnline()) void lookup(url.value)
}

function submit() {
  touched.value = true
  if (!url.value) return
  requestId++ // une recherche encore en cours est abandonnée
  emit(
    'save',
    {
      url: url.value,
      label: form.label.trim() || null,
      price: parsePrice(form.price),
      note: form.note.trim() || null,
    },
    imageChange.value,
  )
}
</script>

<template>
  <BottomSheet
    :open="open"
    :title="option ? 'Modifier l\'option' : 'Ajouter une option'"
    @close="emit('close')"
  >
    <form class="space-y-4" novalidate @submit.prevent="submit">
      <div>
        <label class="label" for="option-url">Lien</label>
        <input
          id="option-url"
          v-model="form.url"
          type="url"
          inputmode="url"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          class="field"
          :class="showError && 'border-prio-high'"
          placeholder="https://…"
          required
          @blur="touched = true"
        />
        <div v-if="url" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            class="inline-flex items-center gap-1 rounded-lg bg-done-soft px-2 py-1 text-sm font-semibold text-done"
          >
            <Check :size="14" :stroke-width="3" /> {{ displayDomain(url) }}
          </span>
          <span
            v-if="preview.status === 'loading'"
            class="inline-flex items-center gap-1.5 text-sm text-ink-soft"
          >
            <LoaderCircle :size="14" class="animate-spin" /> Recherche de l'aperçu…
          </span>
          <span v-else-if="preview.status === 'none'" class="text-sm text-ink-soft">
            Aucune image ni prix trouvés sur la page.
          </span>
        </div>
        <p v-else-if="showError" class="mt-2 text-sm font-medium text-prio-high" role="alert">
          Adresse web invalide : elle doit commencer par http:// ou https://.
        </p>
      </div>

      <div v-if="imageSrc" class="flex items-center gap-3">
        <div class="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-white">
          <img :src="imageSrc" alt="Aperçu de l'option" class="size-full object-contain" />
          <button
            type="button"
            class="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-ink/70 text-white"
            aria-label="Retirer l'image"
            @click="removeImage"
          >
            <X :size="14" />
          </button>
        </div>
        <p class="text-sm text-ink-soft">Image trouvée sur la page.</p>
      </div>
      <button
        v-if="url && preview.status !== 'loading' && (option || preview.status === 'none')"
        type="button"
        class="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4 disabled:opacity-40"
        :disabled="!network.online"
        @click="lookupNow"
      >
        <ImageDown :size="16" /> Récupérer l'image et le prix
      </button>

      <div>
        <label class="label" for="option-label">Libellé <span class="label-hint">· facultatif</span></label>
        <input id="option-label" v-model="form.label" class="field" placeholder="Ex. Modèle blanc 60 cm" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="option-price">Prix <span class="label-hint">· facultatif</span></label>
          <input
            id="option-price"
            v-model="form.price"
            class="field"
            inputmode="decimal"
            placeholder="0,00 €"
            @input="preview.priceFound = false"
          />
          <p v-if="preview.priceFound" class="mt-1 text-xs text-ink-soft">Prix trouvé sur la page</p>
        </div>
        <div>
          <label class="label" for="option-note">Note <span class="label-hint">· facultative</span></label>
          <input id="option-note" v-model="form.note" class="field" placeholder="Ex. coloris" />
        </div>
      </div>
      <button type="submit" class="btn-primary w-full" :disabled="!url">
        {{ option ? 'Enregistrer' : "Ajouter l'option" }}
      </button>
      <button
        v-if="option"
        type="button"
        class="flex w-full items-center justify-center gap-2 py-3 font-semibold text-ink-soft"
        @click="emit('remove')"
      >
        <Trash2 :size="18" /> Supprimer l'option
      </button>
    </form>
  </BottomSheet>
</template>
