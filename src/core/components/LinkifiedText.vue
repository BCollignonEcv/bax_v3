<script setup lang="ts">
import { computed } from 'vue'
import { splitLinks } from '@/core/url'
import ExternalLink from './ExternalLink.vue'

/**
 * Affiche un texte en rendant ses URL cliquables (domaine affiché).
 * Le texte passe par l'interpolation de Vue : il est toujours échappé.
 */
const props = defineProps<{ text: string; tag?: string }>()
const parts = computed(() => splitLinks(props.text))
</script>

<template>
  <component :is="tag ?? 'span'" class="whitespace-pre-line">
    <template v-for="(part, i) in parts" :key="i">
      <ExternalLink v-if="part.type === 'link'" :href="part.href">{{ part.value }}</ExternalLink>
      <template v-else>{{ part.value }}</template>
    </template>
  </component>
</template>
