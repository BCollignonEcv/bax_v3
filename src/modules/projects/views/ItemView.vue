<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDown, Ellipsis, Pencil, Plus, ShoppingCart, Unlink } from '@lucide/vue'
import BottomSheet from '@/core/components/BottomSheet.vue'
import CheckBox from '@/core/components/CheckBox.vue'
import EmptyState from '@/core/components/EmptyState.vue'
import IconButton from '@/core/components/IconButton.vue'
import LinkifiedText from '@/core/components/LinkifiedText.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import PageBar from '@/core/components/PageBar.vue'
import PageShell from '@/core/components/PageShell.vue'
import SheetAction from '@/core/components/SheetAction.vue'
import { useDragReorder } from '@/core/composables/useDragReorder'
import { formatMoney } from '@/core/format'
import { useNetworkStore } from '@/core/stores/network'
import ItemSheet from '../components/ItemSheet.vue'
import OptionCard from '../components/OptionCard.vue'
import OptionSheet from '../components/OptionSheet.vue'
import { useItemsStore, type ItemInput } from '../stores/items'
import { useOptionsStore, type OptionImageChange, type OptionInput } from '../stores/options'
import { useProjectsStore } from '../stores/projects'
import type { ItemOption } from '../types'

const props = defineProps<{ projectId: string; itemId: string; tache?: string }>()

const items = useItemsStore()
const optionsStore = useOptionsStore()
const projects = useProjectsStore()
const network = useNetworkStore()
const router = useRouter()

const item = computed(() => items.item(props.itemId))
const fromTask = computed(() => (props.tache ? projects.task(props.tache) : undefined))
const tasks = computed(() =>
  items
    .taskIdsOfItem(props.itemId)
    .map((id) => projects.task(id))
    .filter((t) => !!t),
)
const back = computed(() =>
  props.tache ? `/projets/${props.projectId}/taches/${props.tache}` : `/projets/${props.projectId}/courses`,
)

const options = computed(() => optionsStore.optionsOf(props.itemId))
const chosen = computed(() => (item.value ? items.chosenOption(item.value) : undefined))
const others = computed(() => options.value.filter((o) => o.id !== chosen.value?.id))
const summary = computed(() => items.optionsSummary(props.itemId))
const price = computed(() => (item.value ? items.displayPrice(item.value) : { amount: null, from: false }))
const range = computed(() => {
  const { min, max } = summary.value
  if (chosen.value || summary.value.count < 2 || min == null || max == null || min === max) return ''
  return `de ${formatMoney(min)} à ${formatMoney(max)}`
})

const showOthers = ref(false)
const menuOpen = ref(false)
const editingItem = ref(false)
/** null : fermé ; 'new' : ajout ; sinon l'option modifiée. */
const editingOption = ref<ItemOption | 'new' | null>(null)

// ---------- Réorganisation des options (appui long puis glisser) ----------
const { drag, onPointerDown, onPointerMove, onPointerUp, onClickCapture, shift } = useDragReorder({
  refKey: 'cards',
  ids: () => others.value.map((o) => o.id),
  onReorder: (ids) => {
    // L'option retenue garde sa place ; seules les autres sont réordonnées.
    const next = ids[Symbol.iterator]()
    const full = options.value.map((o) => (o.id === chosen.value?.id ? o.id : next.next().value!))
    void optionsStore.reorderOptions(full)
  },
  canStart: () => network.requireOnline(),
})

function openAdd() {
  if (network.requireOnline()) editingOption.value = 'new'
}

function openEdit(option: ItemOption) {
  if (network.requireOnline()) editingOption.value = option
}

async function saveOption(values: OptionInput, image: OptionImageChange) {
  const target = editingOption.value
  if (!target) return
  const ok =
    target === 'new'
      ? !!(await optionsStore.addOption(props.itemId, values, image))
      : await optionsStore.updateOption(target.id, values, image)
  if (ok) editingOption.value = null
}

function removeOption() {
  const target = editingOption.value
  if (!target || target === 'new') return
  optionsStore.deleteOption(target.id)
  editingOption.value = null
}

function choose(optionId: string | null) {
  void items.chooseOption(props.itemId, optionId)
  showOthers.value = false
}

async function saveItem(values: ItemInput) {
  if (await items.updateItem(props.itemId, values)) editingItem.value = false
}

function editItem() {
  menuOpen.value = false
  if (network.requireOnline()) editingItem.value = true
}

function unlink() {
  menuOpen.value = false
  if (!props.tache) return
  items.unlinkItem(props.tache, props.itemId)
  router.replace(back.value)
}
</script>

<template>
  <PageShell>
    <PageBar :back="back">
      <IconButton v-if="item" label="Plus d'actions" @click="menuOpen = true">
        <Ellipsis :size="22" />
      </IconButton>
    </PageBar>

    <template v-if="item">
      <h1 class="mt-2 text-[30px] leading-tight font-extrabold tracking-tight break-words">
        {{ item.name }}
      </h1>

      <div v-if="tasks.length" class="mt-3 flex flex-wrap gap-2">
        <RouterLink
          v-for="task in tasks"
          :key="task!.id"
          :to="{ name: 'task', params: { projectId: task!.project_id, taskId: task!.id } }"
          class="task-chip rounded-full px-3 py-1.5 text-sm font-semibold"
          :style="{ '--chip': projects.project(task!.project_id)?.color ?? '#7a7067' }"
        >
          {{ projects.project(task!.project_id)?.icon }} Pour : {{ task!.title }}
        </RouterLink>
      </div>

      <OfflineNotice class="mt-4" />

      <div class="card mt-4 divide-y divide-line">
        <div class="flex min-h-14 items-center gap-1 pr-4 pl-1">
          <CheckBox
            :checked="item.purchased"
            :label="item.purchased ? 'Marquer comme non acheté' : 'Marquer comme acheté'"
            @click="items.togglePurchased(item.id)"
          />
          <span class="font-semibold">{{ item.purchased ? 'Acheté' : 'Marquer comme acheté' }}</span>
        </div>
        <div class="flex min-h-14 items-center gap-3 px-4">
          <span class="w-24 shrink-0 text-ink-soft">Quantité</span>
          <span class="font-semibold">{{ item.quantity ?? '—' }}</span>
        </div>
        <div class="flex min-h-14 items-center gap-3 px-4">
          <span class="w-24 shrink-0 text-ink-soft">Budget</span>
          <span v-if="price.amount != null">
            <span v-if="price.from" class="text-sm text-ink-soft">à partir de </span>
            <strong>{{ formatMoney(price.amount) }}</strong>
          </span>
          <span v-else class="text-ink-soft">—</span>
        </div>
      </div>

      <section class="mt-7">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">Note</h2>
          <!-- Toujours accessible, même si la note n'est qu'un lien -->
          <IconButton label="Modifier la note" class="-my-2 -mr-2 text-ink-soft" @click="editItem">
            <Pencil :size="18" />
          </IconButton>
        </div>
        <LinkifiedText v-if="item.note" :text="item.note" tag="p" class="mt-2 leading-relaxed" />
        <button v-else type="button" class="mt-2 text-muted" @click="editItem">Ajouter une note…</button>
      </section>

      <section class="mt-7">
        <div class="mb-3 flex items-baseline justify-between">
          <h2 class="text-xl font-bold">
            Options<span v-if="options.length" class="font-sans text-base font-semibold text-ink-soft">
              · {{ options.length }}</span
            >
          </h2>
          <span v-if="range" class="text-sm text-ink-soft">{{ range }}</span>
        </div>

        <OptionCard v-if="chosen" :option="chosen" chosen @unchoose="choose(null)" @edit="openEdit(chosen)" />

        <button
          v-if="chosen && others.length"
          type="button"
          class="mt-3 flex w-full items-center justify-between px-1 py-2 font-semibold"
          :aria-expanded="showOthers"
          @click="showOthers = !showOthers"
        >
          Autres options ({{ others.length }})
          <ChevronDown :size="20" class="transition-transform" :class="showOthers && 'rotate-180'" />
        </button>

        <div
          v-if="!chosen || showOthers"
          class="space-y-3"
          :class="chosen && 'mt-1'"
          @click.capture="onClickCapture"
        >
          <div
            v-for="(option, index) in others"
            :key="option.id"
            ref="cards"
            class="rounded-3xl select-none [-webkit-touch-callout:none]"
            :class="
              drag.id === option.id
                ? 'relative z-10 scale-[1.02] shadow-xl'
                : 'transition-transform duration-200'
            "
            :style="{ transform: `translateY(${shift(index)}px)` }"
            @pointerdown="onPointerDown($event, index)"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @contextmenu.prevent
          >
            <OptionCard :option="option" @choose="choose(option.id)" @edit="openEdit(option)" />
          </div>
        </div>

        <button
          type="button"
          class="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-muted/50 font-semibold disabled:opacity-40"
          :disabled="!network.online"
          @click="openAdd"
        >
          <Plus :size="18" /> Ajouter une option
        </button>
      </section>

      <BottomSheet :open="menuOpen" :title="item.name" @close="menuOpen = false">
        <SheetAction :icon="Pencil" label="Modifier l'article" @click="editItem" />
        <SheetAction
          :icon="ShoppingCart"
          label="Liste de courses du projet"
          @click="((menuOpen = false), router.push({ name: 'project-shopping', params: { projectId } }))"
        />
        <SheetAction
          v-if="fromTask"
          :icon="Unlink"
          :label="`Retirer de « ${fromTask.title} »`"
          @click="unlink"
        />
      </BottomSheet>

      <ItemSheet
        :open="editingItem"
        :item="item"
        :shared-count="tasks.length"
        hide-remove
        @close="editingItem = false"
        @save="saveItem"
      />
      <OptionSheet
        :open="editingOption !== null"
        :option="editingOption === 'new' ? null : editingOption"
        @close="editingOption = null"
        @save="saveOption"
        @remove="removeOption"
      />
    </template>

    <EmptyState
      v-else-if="projects.loaded"
      :icon="ShoppingCart"
      title="Article introuvable"
      text="Il a peut-être été retiré de toutes ses tâches."
    >
      <RouterLink :to="back" class="btn-primary">Retour</RouterLink>
    </EmptyState>
  </PageShell>
</template>

<style scoped>
.task-chip {
  background: color-mix(in srgb, var(--chip) 18%, var(--card));
}
</style>
