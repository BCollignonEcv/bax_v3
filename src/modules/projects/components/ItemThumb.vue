<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useItemsStore } from '../stores/items'
import OptionThumb from './OptionThumb.vue'

/**
 * Vignette carrée de l'option retenue, à la hauteur du texte qui la suit (nom, lien…).
 * On mesure le bloc de texte voisin (et non la vignette elle-même, ce qui s'emballerait :
 * une vignette plus large fait passer le texte à la ligne, donc le rend plus haut).
 * Taille bornée entre 44 et 72 px.
 */
const props = defineProps<{ itemId: string }>()

const MIN = 44
const MAX = 72

const items = useItemsStore()
const path = computed(() => items.chosenImagePath(props.itemId))

const thumb = ref<{ $el: HTMLElement } | null>(null)
const side = ref(MIN)
let observer: ResizeObserver | null = null

watch(thumb, (component) => {
  observer?.disconnect()
  const text = component?.$el.nextElementSibling
  if (!(text instanceof HTMLElement)) return
  observer = new ResizeObserver(() => {
    const next = Math.min(MAX, Math.max(MIN, text.offsetHeight))
    // Petite tolérance : évite les allers-retours d'un pixel entre deux mises en page.
    if (Math.abs(next - side.value) > 2) side.value = next
  })
  observer.observe(text)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <OptionThumb
    v-if="path"
    ref="thumb"
    :path="path"
    class="self-center"
    :style="{ width: `${side}px`, height: `${side}px` }"
  />
</template>
