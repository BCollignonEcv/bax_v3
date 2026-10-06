<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'

defineProps<{ href: string; iconBefore?: boolean }>()
</script>

<template>
  <!-- Élément « inline » : la ponctuation qui suit reste collée au lien.
       @click.stop : un lien dans une ligne cliquable n'ouvre pas aussi la ligne. -->
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="font-semibold break-words text-ink underline decoration-ink/40 underline-offset-3"
    @click.stop
  >
    <ExternalLink
      v-if="iconBefore"
      :size="13"
      class="mr-1 inline-block align-[-2px] no-underline"
      aria-hidden="true"
    /><slot /><ExternalLink
      v-if="!iconBefore"
      :size="12"
      class="ml-0.5 inline-block align-[-1px] opacity-60"
      aria-hidden="true"
    />
  </a>
</template>
