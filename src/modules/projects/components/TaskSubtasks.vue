<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from '@lucide/vue'
import { useDragReorder } from '@/core/composables/useDragReorder'
import { useNetworkStore } from '@/core/stores/network'
import { useSubtasksStore } from '../stores/subtasks'
import SubtaskRow from './SubtaskRow.vue'

const props = defineProps<{ taskId: string }>()

const store = useSubtasksStore()
const network = useNetworkStore()

const list = computed(() => store.subtasksOf(props.taskId))
const progress = computed(() => store.progress(props.taskId))

// ---------- Ajout rapide : Entrée crée l'étape et garde le focus ----------
const draft = ref('')
async function add() {
  const title = draft.value.trim()
  if (!title) return
  draft.value = '' // champ vidé tout de suite : on peut enchaîner la suivante
  if (!(await store.addSubtask(props.taskId, title))) draft.value = title
}

// ---------- Réorganisation par la poignée (tactile compris) ----------
const { drag, onPointerDown, onPointerMove, onPointerUp, onClickCapture, shift } = useDragReorder({
  refKey: 'rows',
  ids: () => list.value.map((s) => s.id),
  onReorder: (ids) => void store.reorder(ids),
  canStart: () => network.requireOnline(),
  delay: 0,
})
</script>

<template>
  <section>
    <h2 class="mb-3 text-xl font-bold">
      Sous-tâches<span v-if="progress.total" class="ml-2 font-sans text-sm font-semibold text-ink-soft">
        {{ progress.done }}/{{ progress.total }}</span
      >
    </h2>

    <div class="card overflow-hidden">
      <div class="divide-y divide-line" @click.capture="onClickCapture">
        <div
          v-for="(subtask, index) in list"
          :key="subtask.id"
          ref="rows"
          class="relative bg-card"
          :class="
            drag.id === subtask.id
              ? 'z-10 rounded-2xl shadow-xl'
              : drag.settling
                ? ''
                : 'transition-transform duration-200'
          "
          :style="{ transform: `translateY(${shift(index)}px)` }"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <SubtaskRow
            :subtask="subtask"
            :dragging="drag.id === subtask.id"
            @toggle="store.toggle(subtask.id)"
            @rename="store.rename(subtask.id, $event)"
            @remove="store.remove(subtask.id)"
            @grab="onPointerDown($event, index)"
          />
        </div>
      </div>

      <p v-if="!list.length" class="px-4 py-3 text-sm text-ink-soft">
        Pas de sous-tâches. Découpez la tâche en petites étapes si ça aide.
      </p>

      <label class="flex items-center gap-3 border-t border-line px-4">
        <Plus :size="20" class="shrink-0 text-ink-soft" />
        <input
          v-model="draft"
          class="h-13 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted disabled:opacity-50"
          placeholder="Ajouter une sous-tâche"
          enterkeyhint="enter"
          :disabled="!network.online"
          @keydown.enter.prevent="add"
        />
      </label>
    </div>
  </section>
</template>
