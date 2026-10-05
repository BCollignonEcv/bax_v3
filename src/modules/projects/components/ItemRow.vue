<script setup lang="ts">
import { Link } from '@lucide/vue'
import CheckBox from '@/core/components/CheckBox.vue'
import { formatMoney } from '@/core/format'

defineProps<{
  name: string
  quantity: number | null
  price: number | null
  note: string | null
  purchased: boolean
  /** Autres tâches qui utilisent cet article. */
  alsoFor?: string[]
  disabledCheck?: boolean
}>()
const emit = defineEmits<{ toggle: []; open: [] }>()
</script>

<template>
  <div class="flex items-start gap-1 py-2 pr-4 pl-1">
    <CheckBox
      :checked="purchased"
      :label="`Acheté : ${name}`"
      :disabled="disabledCheck"
      class="disabled:opacity-40"
      @click="emit('toggle')"
    />
    <button
      type="button"
      class="flex min-w-0 flex-1 items-start gap-3 pt-2.5 text-left"
      @click="emit('open')"
    >
      <span class="min-w-0 flex-1">
        <span class="block font-semibold" :class="purchased && 'text-ink-soft line-through'">
          {{ name }}<span v-if="quantity" class="font-normal"> ×{{ quantity }}</span>
        </span>
        <span v-if="note" class="block text-sm text-ink-soft">{{ note }}</span>
        <span
          v-if="alsoFor?.length"
          class="mt-1.5 flex w-fit items-start gap-1.5 rounded-lg bg-doing-soft px-2 py-1 text-xs font-semibold text-doing"
        >
          <Link :size="12" class="mt-0.5 shrink-0" />
          <span>Aussi pour : {{ alsoFor.join(' · ') }}</span>
        </span>
      </span>
      <span v-if="price != null" class="font-bold whitespace-nowrap">{{ formatMoney(Number(price)) }}</span>
    </button>
  </div>
</template>
