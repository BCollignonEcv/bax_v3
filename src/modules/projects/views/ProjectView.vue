<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Archive,
  ArchiveRestore,
  ArrowDownUp,
  CheckCheck,
  CircleCheck,
  Ellipsis,
  Pencil,
  ShoppingCart,
  SlidersHorizontal,
} from '@lucide/vue'
import BottomSheet from '@/core/components/BottomSheet.vue'
import Chip from '@/core/components/Chip.vue'
import EmojiTile from '@/core/components/EmojiTile.vue'
import EmptyState from '@/core/components/EmptyState.vue'
import Fab from '@/core/components/Fab.vue'
import IconButton from '@/core/components/IconButton.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import PageBar from '@/core/components/PageBar.vue'
import PageShell from '@/core/components/PageShell.vue'
import ProgressBar from '@/core/components/ProgressBar.vue'
import SheetAction from '@/core/components/SheetAction.vue'
import { formatMoney, formatRelativeDay, formatShortDate } from '@/core/format'
import { useConfirmStore } from '@/core/stores/confirm'
import TaskFilterSheet from '../components/TaskFilterSheet.vue'
import TaskRow from '../components/TaskRow.vue'
import { defaultFilters, SORT_LABEL, useTaskFilters } from '../composables/useTaskFilters'
import { useItemsStore } from '../stores/items'
import { useProjectsStore } from '../stores/projects'
import type { Status } from '../types'

const props = defineProps<{ projectId: string }>()

const store = useProjectsStore()
const items = useItemsStore()
const confirm = useConfirmStore()
const router = useRouter()

const project = computed(() => store.project(props.projectId))
const tasks = computed(() => store.tasksOf(props.projectId))
const archivedCount = computed(() => store.archivedTasksOf(props.projectId).length)
const progress = computed(() => store.progress(props.projectId))
const budget = computed(() => items.projectBudget(props.projectId))
const shoppingCount = computed(() => items.shoppingList(props.projectId).length)

const { filters, visible, statusCounts, activeCount } = useTaskFilters(
  () => props.projectId,
  () => tasks.value,
)

const filterOpen = ref(false)
const menuOpen = ref(false)

const quickStatuses: { value: Status | null; label: string; count: () => number }[] = [
  { value: null, label: 'Toutes', count: () => statusCounts.value.all },
  { value: 'todo', label: 'À faire', count: () => statusCounts.value.todo },
  { value: 'in_progress', label: 'En cours', count: () => statusCounts.value.in_progress },
  { value: 'done', label: 'Terminées', count: () => statusCounts.value.done },
]

function isQuickActive(value: Status | null) {
  const current = filters.value.statuses
  return value === null ? current.length === 0 : current.length === 1 && current[0] === value
}

function setQuick(value: Status | null) {
  filters.value.statuses = value ? [value] : []
}

function resetFilters() {
  Object.assign(filters.value, defaultFilters())
}

async function archiveDone() {
  menuOpen.value = false
  const count = statusCounts.value.done
  const ok = await confirm.ask({
    title: count > 1 ? `Archiver les ${count} tâches terminées ?` : 'Archiver la tâche terminée ?',
    message:
      'Elles quitteront la liste et resteront dans les archives du projet. Vous pourrez les restaurer à tout moment.',
    confirmLabel: 'Archiver',
    icon: Archive,
  })
  if (ok) await store.archiveDoneTasks(props.projectId)
}

async function archiveProject() {
  menuOpen.value = false
  const ok = await confirm.ask({
    title: `Archiver « ${project.value?.name} » ?`,
    message:
      'Le projet quittera la liste et la liste de courses. Ses tâches sont conservées : vous pourrez le restaurer à tout moment.',
    confirmLabel: 'Archiver',
    icon: Archive,
  })
  if (ok && (await store.archiveProject(props.projectId))) router.replace({ name: 'projects' })
}

function go(name: string) {
  menuOpen.value = false
  router.push({ name, params: { projectId: props.projectId } })
}
</script>

<template>
  <PageShell>
    <PageBar back="/projets">
      <IconButton label="Liste de courses du projet" @click="go('project-shopping')">
        <ShoppingCart :size="22" />
      </IconButton>
      <IconButton label="Menu du projet" @click="menuOpen = true">
        <Ellipsis :size="22" />
      </IconButton>
    </PageBar>

    <template v-if="project">
      <div class="mt-2 flex items-center gap-4">
        <EmojiTile :emoji="project.icon" :color="project.color" />
        <h1 class="min-w-0 text-[30px] leading-tight font-extrabold tracking-tight break-words">
          {{ project.name }}
        </h1>
      </div>

      <div
        v-if="project.archived_at"
        class="mt-4 flex items-center gap-3 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-soft"
      >
        <Archive :size="18" class="shrink-0" />
        <span class="flex-1">Projet archivé le {{ formatShortDate(project.archived_at) }}.</span>
        <button type="button" class="font-bold text-ink" @click="store.restoreProject(project.id)">
          Restaurer
        </button>
      </div>

      <p class="mt-4 text-[15px] text-ink-soft">
        <template v-if="progress.total || archivedCount">
          <strong class="text-ink">
            {{ progress.done }} {{ progress.done > 1 ? 'tâches terminées' : 'tâche terminée' }}
          </strong>
          sur {{ progress.total }}
          <template v-if="archivedCount">
            · {{ archivedCount }} {{ archivedCount > 1 ? 'archivées' : 'archivée' }}</template
          >
        </template>
        <strong v-else class="text-ink">Créé {{ formatRelativeDay(project.created_at) }}</strong>
      </p>
      <ProgressBar class="mt-2" :value="progress.done" :total="progress.total" :color="project.color" />
      <p v-if="budget.estimated > 0" class="mt-3 text-[15px] text-ink-soft">
        <strong class="text-ink">{{ formatMoney(budget.spent, true) }}</strong>
        dépensés sur {{ formatMoney(budget.estimated, true) }} estimés
      </p>

      <OfflineNotice class="mt-4" />

      <EmptyState
        v-if="!tasks.length"
        :icon="CircleCheck"
        title="Aucune tâche pour l'instant"
        text="Ajoutez la première : il suffit d'un titre, le reste peut attendre."
      >
        <RouterLink :to="{ name: 'task-new', params: { projectId } }" class="btn-primary">
          + Ajouter une tâche
        </RouterLink>
      </EmptyState>

      <template v-else>
        <div class="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Chip
            v-for="quick in quickStatuses"
            :key="quick.label"
            :active="isQuickActive(quick.value)"
            @click="setQuick(quick.value)"
          >
            {{ quick.label }} · {{ quick.count() }}
          </Chip>
        </div>
        <div class="mt-2 flex gap-2">
          <Chip :active="activeCount > 0" @click="filterOpen = true">
            <SlidersHorizontal :size="16" />
            {{ activeCount ? `Filtres · ${activeCount}` : 'Priorité, personne' }}
          </Chip>
          <Chip @click="filterOpen = true">
            <ArrowDownUp :size="16" />
            Tri : {{ SORT_LABEL[filters.sort] }}
          </Chip>
        </div>

        <TransitionGroup tag="div" name="list" class="mt-4 space-y-3">
          <TaskRow v-for="task in visible" :key="task.id" :task="task" />
        </TransitionGroup>

        <div v-if="!visible.length" class="py-12 text-center text-ink-soft">
          <p>Aucune tâche ne correspond à ces filtres.</p>
          <button
            type="button"
            class="mt-3 font-semibold text-ink underline underline-offset-4"
            @click="resetFilters"
          >
            Tout afficher
          </button>
        </div>
      </template>

      <Fab
        v-if="tasks.length"
        label="Nouvelle tâche"
        @click="router.push({ name: 'task-new', params: { projectId } })"
      />

      <TaskFilterSheet
        :open="filterOpen"
        :project-id="projectId"
        :tasks="tasks"
        @close="filterOpen = false"
      />

      <BottomSheet :open="menuOpen" :title="project.name" @close="menuOpen = false">
        <template #header>
          <div class="mb-3 flex items-center gap-3">
            <EmojiTile :emoji="project.icon" :color="project.color" size="sm" class="size-10 rounded-xl" />
            <h2 class="text-xl font-bold">{{ project.name }}</h2>
          </div>
        </template>
        <SheetAction :icon="Pencil" label="Modifier le projet" @click="go('project-edit')" />
        <SheetAction
          :icon="ShoppingCart"
          label="Liste de courses du projet"
          :count="shoppingCount"
          @click="go('project-shopping')"
        />
        <hr class="my-2 border-line" />
        <SheetAction
          :icon="CheckCheck"
          label="Archiver les tâches terminées"
          :count="statusCounts.done"
          :disabled="!statusCounts.done"
          class="disabled:opacity-40"
          @click="archiveDone"
        />
        <SheetAction
          :icon="Archive"
          label="Archives du projet"
          :count="archivedCount"
          :disabled="!archivedCount"
          class="disabled:opacity-40"
          @click="go('project-archives')"
        />
        <hr class="my-2 border-line" />
        <SheetAction
          v-if="project.archived_at"
          :icon="ArchiveRestore"
          label="Restaurer le projet"
          @click="(store.restoreProject(project.id), (menuOpen = false))"
        />
        <SheetAction v-else :icon="Archive" label="Archiver le projet" @click="archiveProject" />
      </BottomSheet>
    </template>

    <EmptyState
      v-else-if="store.loaded"
      :icon="Archive"
      title="Projet introuvable"
      text="Il a peut-être été supprimé."
    >
      <RouterLink :to="{ name: 'projects' }" class="btn-primary">Voir les projets</RouterLink>
    </EmptyState>
  </PageShell>
</template>

<style scoped>
.list-move {
  transition: transform 0.25s ease;
}
</style>
