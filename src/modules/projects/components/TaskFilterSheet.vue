<script setup lang="ts">
import { computed } from 'vue'
import Avatars from '@/core/components/Avatars.vue'
import BottomSheet from '@/core/components/BottomSheet.vue'
import Chip from '@/core/components/Chip.vue'
import { plural } from '@/core/format'
import { defaultFilters, SORT_LABEL, useTaskFilters, type SortKey } from '../composables/useTaskFilters'
import { useAssignees } from '../composables/useAssignees'
import { PRIORITIES, STATUSES, type Task } from '../types'
import PriorityBadge from './PriorityBadge.vue'

const props = defineProps<{ open: boolean; projectId: string; tasks: Task[] }>()
const emit = defineEmits<{ close: [] }>()

const assignees = useAssignees()
// Même état que l'écran du projet : les filtres sont partagés par projet.
const { filters, visible } = useTaskFilters(
  () => props.projectId,
  () => props.tasks,
)
const count = computed(() => visible.value.length)
const sorts: SortKey[] = ['created', 'priority', 'target']

function toggle<T>(list: T[], value: T) {
  const index = list.indexOf(value)
  if (index >= 0) list.splice(index, 1)
  else list.push(value)
}

function reset() {
  Object.assign(filters.value, defaultFilters())
}
</script>

<template>
  <BottomSheet :open="open" title="Filtrer et trier" @close="emit('close')">
    <template #header>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-bold">Filtrer et trier</h2>
        <button type="button" class="text-sm font-semibold underline underline-offset-4" @click="reset">
          Réinitialiser
        </button>
      </div>
    </template>

    <p class="section-title mb-2">Statut</p>
    <div class="flex flex-wrap gap-2">
      <Chip
        v-for="s in STATUSES"
        :key="s.value"
        :active="filters.statuses.includes(s.value)"
        @click="toggle(filters.statuses, s.value)"
      >
        {{ s.label }}
      </Chip>
    </div>

    <p class="section-title mt-5 mb-2">Priorité</p>
    <div class="flex flex-wrap gap-2">
      <Chip
        v-for="p in PRIORITIES"
        :key="p.value"
        :active="filters.priorities.includes(p.value)"
        @click="toggle(filters.priorities, p.value)"
      >
        <PriorityBadge
          :priority="p.value"
          hide-label
          :class="filters.priorities.includes(p.value) && '!text-on-ink'"
        />
        {{ p.label }}
      </Chip>
    </div>

    <p class="section-title mt-5 mb-2">Personne assignée</p>
    <div class="flex flex-wrap gap-2">
      <Chip
        v-for="option in assignees.options.value"
        :key="option.value"
        :active="filters.person === option.value"
        class="pl-2"
        @click="filters.person = filters.person === option.value ? null : option.value"
      >
        <Avatars :ids="option.ids" size="sm" />
        {{ option.label }}
      </Chip>
    </div>

    <p class="section-title mt-5 mb-1">Trier par</p>
    <div role="radiogroup">
      <label v-for="sort in sorts" :key="sort" class="flex min-h-12 cursor-pointer items-center gap-3">
        <input
          v-model="filters.sort"
          type="radio"
          name="sort"
          :value="sort"
          class="size-5 accent-[var(--ink)]"
        />
        <span class="flex-1 font-semibold">{{
          sort === 'created' ? 'Date de création' : SORT_LABEL[sort]
        }}</span>
        <span v-if="sort === 'created'" class="text-sm text-muted">Par défaut</span>
      </label>
    </div>

    <button type="button" class="btn-primary mt-5 w-full" @click="emit('close')">
      Afficher {{ plural(count, 'tâche') }}
    </button>
  </BottomSheet>
</template>
