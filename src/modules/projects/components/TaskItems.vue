<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatMoney } from '@/core/format'
import { useNetworkStore } from '@/core/stores/network'
import { parseItemName } from '../composables/itemName'
import { useItemsStore, type ItemInput } from '../stores/items'
import { useProjectsStore } from '../stores/projects'
import ItemAdder from './ItemAdder.vue'
import ItemRow from './ItemRow.vue'
import ItemSheet from './ItemSheet.vue'

const props = defineProps<{ taskId: string }>()

const items = useItemsStore()
const projects = useProjectsStore()
const network = useNetworkStore()

const list = computed(() => items.itemsOfTask(props.taskId))
const progress = computed(() => items.purchaseProgress(props.taskId))
const totals = computed(() => items.totalsOfTask(props.taskId))

const editingId = ref<string | null>(null)
const editing = computed(() => (editingId.value ? (items.item(editingId.value) ?? null) : null))

function alsoFor(itemId: string) {
  return items
    .taskIdsOfItem(itemId)
    .filter((id) => id !== props.taskId)
    .map((id) => projects.task(id)?.title ?? '')
    .filter(Boolean)
}

async function create(text: string) {
  const item = await items.createItemForTask(props.taskId, {
    ...parseItemName(text),
    price: null,
    note: null,
  })
  // Ouvre la fiche pour saisir le prix tout de suite.
  if (item) editingId.value = item.id
}

async function save(values: ItemInput) {
  if (!editingId.value) return
  if (await items.updateItem(editingId.value, values)) editingId.value = null
}

function remove() {
  if (!editingId.value) return
  items.unlinkItem(props.taskId, editingId.value)
  editingId.value = null
}
</script>

<template>
  <section>
    <div class="mb-3 flex items-baseline justify-between">
      <h2 class="text-xl font-bold">Liste d'achats</h2>
      <span v-if="progress.total" class="text-sm font-semibold text-ink-soft">
        {{ progress.done }}/{{ progress.total }} {{ progress.done > 1 ? 'achetés' : 'acheté' }}
      </span>
    </div>
    <div class="card divide-y divide-line">
      <ItemRow
        v-for="item in list"
        :key="item.id"
        :name="item.name"
        :quantity="item.quantity"
        :price="item.price"
        :note="item.note"
        :purchased="item.purchased"
        :also-for="alsoFor(item.id)"
        @toggle="items.togglePurchased(item.id)"
        @open="editingId = item.id"
      />
      <ItemAdder
        :task-id="taskId"
        :disabled="!network.online"
        @link="items.linkItem(taskId, $event)"
        @create="create"
      />
    </div>
    <div v-if="totals.estimated > 0" class="mt-3 flex justify-between px-1 text-[15px] text-ink-soft">
      <span
        >Total estimé <strong class="text-ink">{{ formatMoney(totals.estimated) }}</strong></span
      >
      <span
        >Dépensé <strong class="text-ink">{{ formatMoney(totals.spent) }}</strong></span
      >
    </div>

    <ItemSheet
      :open="!!editing"
      :item="editing"
      :shared-count="editing ? items.taskIdsOfItem(editing.id).length : 0"
      @close="editingId = null"
      @save="save"
      @remove="remove"
    />
  </section>
</template>
