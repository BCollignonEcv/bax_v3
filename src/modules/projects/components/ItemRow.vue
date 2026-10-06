<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@lucide/vue'
import CheckBox from '@/core/components/CheckBox.vue'
import LinkifiedText from '@/core/components/LinkifiedText.vue'
import { formatMoney } from '@/core/format'
import ItemOptionsLine from './ItemOptionsLine.vue'
import ItemThumb from './ItemThumb.vue'
import { useItemsStore } from '../stores/items'

const props = defineProps<{
  name: string
  quantity: number | null
  /** Prix affiché (prix effectif pour un article enregistré). */
  price: number | null
  /** Affiche « à partir de » au-dessus du prix. */
  fromPrice?: boolean
  note: string | null
  purchased: boolean
  /** Article enregistré : affiche ses options. */
  itemId?: string
  /** Autres tâches qui utilisent cet article. */
  alsoFor?: string[]
  disabledCheck?: boolean
}>()
const emit = defineEmits<{ toggle: []; open: [] }>()

const items = useItemsStore()
/** Avec vignette : texte et prix en haut, à côté de l'image ; sans : centrés sur la case. */
const align = computed(() =>
  props.itemId && items.chosenImagePath(props.itemId) ? 'self-start' : 'self-center',
)
</script>

<template>
  <div class="flex items-center gap-1 py-2 pr-4 pl-1">
    <CheckBox
      :checked="purchased"
      :label="`Acheté : ${name}`"
      :disabled="disabledCheck"
      class="disabled:opacity-40"
      @click="emit('toggle')"
    />
    <!-- Zone cliquable (pas un <button> : elle peut contenir des liens) -->
    <div
      role="button"
      tabindex="0"
      class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 self-stretch text-left"
      @click="emit('open')"
      @keydown.enter.self="emit('open')"
    >
      <ItemThumb v-if="itemId" :item-id="itemId" />
      <span class="min-w-0 flex-1 py-1" :class="align">
        <span class="block font-semibold" :class="purchased && 'text-ink-soft line-through'">
          {{ name }}<span v-if="quantity && quantity > 1" class="font-normal"> ×{{ quantity }}</span>
        </span>
        <ItemOptionsLine v-if="itemId" :item-id="itemId" />
        <LinkifiedText v-if="note" :text="note" class="block text-sm text-ink-soft" />
        <span
          v-if="alsoFor?.length"
          class="mt-1.5 flex w-fit items-start gap-1.5 rounded-lg bg-doing-soft px-2 py-1 text-xs font-semibold text-doing"
        >
          <Link :size="12" class="mt-0.5 shrink-0" />
          <span>Aussi pour : {{ alsoFor.join(' · ') }}</span>
        </span>
      </span>
      <span v-if="price != null" class="py-1 text-right font-bold whitespace-nowrap" :class="align">
        <span v-if="fromPrice" class="block text-xs font-semibold text-ink-soft">à partir de</span>
        {{ formatMoney(Number(price)) }}
      </span>
    </div>
  </div>
</template>
