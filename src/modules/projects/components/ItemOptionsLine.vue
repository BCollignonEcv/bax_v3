<script setup lang="ts">
import { computed } from 'vue'
import { Layers } from '@lucide/vue'
import ExternalLink from '@/core/components/ExternalLink.vue'
import { formatMoney } from '@/core/format'
import { displayDomain } from '@/core/url'
import { useItemsStore } from '../stores/items'
import OptionThumb from './OptionThumb.vue'

/** Ligne « option retenue » ou « N options · de X à Y » sous le nom d'un article. */
const props = defineProps<{ itemId: string }>()

const items = useItemsStore()
const item = computed(() => items.item(props.itemId))
const chosen = computed(() => (item.value ? items.chosenOption(item.value) : undefined))
const summary = computed(() => items.optionsSummary(props.itemId))

const range = computed(() => {
  const { min, max } = summary.value
  if (min == null || max == null) return ''
  return min === max ? formatMoney(min) : `de ${formatMoney(min)} à ${formatMoney(max)}`
})
</script>

<template>
  <span v-if="chosen" class="flex items-center gap-2 text-sm text-ink-soft">
    <OptionThumb v-if="chosen.image_path" :path="chosen.image_path" class="size-7 rounded-md" />
    <span class="min-w-0">
      <template v-if="chosen.label?.trim()">{{ chosen.label }} · </template>
      <ExternalLink :href="chosen.url">{{ displayDomain(chosen.url) }}</ExternalLink>
    </span>
  </span>
  <span v-else-if="summary.count" class="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
    <Layers :size="14" class="shrink-0" />
    {{ summary.count }} {{ summary.count > 1 ? 'options' : 'option' }}
    <template v-if="range"> · {{ range }}</template>
  </span>
</template>
