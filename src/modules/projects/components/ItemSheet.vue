<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Unlink } from '@lucide/vue'
import BottomSheet from '@/core/components/BottomSheet.vue'
import { parsePrice } from '../composables/itemName'
import type { ItemInput } from '../stores/items'

const props = defineProps<{ open: boolean; item: ItemInput | null; sharedCount?: number }>()
const emit = defineEmits<{ close: []; save: [values: ItemInput]; remove: [] }>()

const form = reactive({ name: '', quantity: '', price: '', note: '' })

watch(
  () => [props.open, props.item] as const,
  ([open, item]) => {
    if (!open || !item) return
    form.name = item.name
    form.quantity = item.quantity ? String(item.quantity) : ''
    form.price = item.price != null ? String(item.price).replace('.', ',') : ''
    form.note = item.note ?? ''
  },
  { immediate: true },
)

function submit() {
  if (!form.name.trim()) return
  const quantity = parseInt(form.quantity, 10)
  emit('save', {
    name: form.name.trim(),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    price: parsePrice(form.price),
    note: form.note.trim() || null,
  })
}
</script>

<template>
  <BottomSheet :open="open" title="Article" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="label" for="item-name">Nom</label>
        <input id="item-name" v-model="form.name" class="field" required />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="item-qty">Quantité</label>
          <input id="item-qty" v-model="form.quantity" class="field" inputmode="numeric" placeholder="—" />
        </div>
        <div>
          <label class="label" for="item-price">Prix total (€)</label>
          <input id="item-price" v-model="form.price" class="field" inputmode="decimal" placeholder="—" />
        </div>
      </div>
      <div>
        <label class="label" for="item-note">Note <span class="label-hint">· facultative</span></label>
        <input id="item-note" v-model="form.note" class="field" placeholder="Magasin, référence, couleur…" />
      </div>
      <p v-if="sharedCount && sharedCount > 1" class="text-sm text-ink-soft">
        Cet article est relié à {{ sharedCount }} tâches : les modifications s'appliquent partout.
      </p>
      <button type="submit" class="btn-primary w-full">Enregistrer</button>
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 py-3 font-semibold text-ink-soft"
        @click="emit('remove')"
      >
        <Unlink :size="18" /> Retirer de la tâche
      </button>
    </form>
  </BottomSheet>
</template>
