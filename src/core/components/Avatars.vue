<script setup lang="ts">
import { computed } from 'vue'
import { useProfilesStore } from '@/core/stores/profiles'
import Avatar from './Avatar.vue'

const props = withDefaults(defineProps<{ ids: string[]; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const profiles = useProfilesStore()
// Ordre stable (Baptiste puis Alix), quel que soit l'ordre d'enregistrement.
const sorted = computed(() =>
  [...props.ids].sort((a, b) => profiles.allIds.indexOf(a) - profiles.allIds.indexOf(b)),
)
</script>

<template>
  <span v-if="ids.length" class="inline-flex shrink-0 items-center">
    <Avatar v-for="(id, i) in sorted" :key="id" :profile-id="id" :size="size" :class="i > 0 && '-ml-2'" />
  </span>
</template>
