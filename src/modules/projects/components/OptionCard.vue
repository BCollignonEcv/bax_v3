<script setup lang="ts">
import { computed } from 'vue'
import { Check } from '@lucide/vue'
import ExternalLink from '@/core/components/ExternalLink.vue'
import LinkifiedText from '@/core/components/LinkifiedText.vue'
import { formatMoney } from '@/core/format'
import { displayDomain } from '@/core/url'
import { optionTitle } from '../stores/options'
import type { ItemOption } from '../types'
import OptionActions from './OptionActions.vue'
import OptionThumb from './OptionThumb.vue'

const props = defineProps<{ option: ItemOption; chosen?: boolean }>()
const emit = defineEmits<{ choose: []; unchoose: []; edit: [] }>()

/** Sans libellé, le titre est le lien lui-même (pas de domaine affiché deux fois). */
const hasLabel = computed(() => !!props.option.label?.trim())
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="block cursor-pointer rounded-3xl bg-card p-4 text-left"
    :class="chosen ? 'border-2 border-ink' : 'border border-line'"
    :aria-label="`Modifier l'option ${optionTitle(option)}`"
    @click="emit('edit')"
    @keydown.enter.self="emit('edit')"
  >
    <span
      v-if="chosen"
      class="mb-3 inline-flex items-center gap-1 rounded-md bg-done-soft px-2 py-0.5 text-xs font-semibold text-done"
    >
      <Check :size="12" :stroke-width="3" /> Option retenue
    </span>

    <!-- Trois colonnes centrées verticalement : vignette, textes, prix + bouton. -->
    <div class="flex items-center gap-3">
      <OptionThumb v-if="option.image_path" :path="option.image_path" class="size-16" />

      <div class="min-w-0 flex-1">
        <p class="font-bold break-words">
          <template v-if="hasLabel">{{ option.label }}</template>
          <ExternalLink v-else :href="option.url" icon-before>{{ displayDomain(option.url) }}</ExternalLink>
        </p>
        <p v-if="hasLabel" class="mt-1 text-sm">
          <ExternalLink :href="option.url" icon-before>{{ displayDomain(option.url) }}</ExternalLink>
        </p>
        <LinkifiedText v-if="option.note" :text="option.note" tag="p" class="mt-1 text-sm text-ink-soft" />
      </div>

      <div class="flex shrink-0 flex-col items-end gap-2">
        <p v-if="option.price != null" class="font-bold whitespace-nowrap">
          {{ formatMoney(Number(option.price)) }}
        </p>
        <OptionActions :chosen="chosen" @choose="emit('choose')" @unchoose="emit('unchoose')" />
      </div>
    </div>
  </div>
</template>
