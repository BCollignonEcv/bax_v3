<script setup lang="ts">
import { computed } from 'vue'
import { Archive, RotateCcw } from '@lucide/vue'
import EmptyState from '@/core/components/EmptyState.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import PageBar from '@/core/components/PageBar.vue'
import PageShell from '@/core/components/PageShell.vue'
import { formatShortDate, plural, toDayString } from '@/core/format'
import StatusToggle from '../components/StatusToggle.vue'
import { useItemsStore } from '../stores/items'
import { usePhotosStore } from '../stores/photos'
import { useProjectsStore } from '../stores/projects'
import { STATUS_LABEL, type Task } from '../types'

const props = defineProps<{ projectId: string }>()

const store = useProjectsStore()
const photos = usePhotosStore()
const items = useItemsStore()

const project = computed(() => store.project(props.projectId))

/** Regroupement par jour d'archivage, le plus récent d'abord. */
const groups = computed(() => {
  const map = new Map<string, Task[]>()
  for (const task of store.archivedTasksOf(props.projectId)) {
    const day = toDayString(new Date(task.archived_at!))
    map.set(day, [...(map.get(day) ?? []), task])
  }
  return [...map.entries()].map(([day, tasks]) => ({ day, tasks }))
})

function details(task: Task) {
  const parts = [
    task.status === 'done' && task.completed_at
      ? `Terminée le ${formatShortDate(task.completed_at)}`
      : STATUS_LABEL[task.status],
  ]
  const photoCount = photos.countOf(task.id)
  if (photoCount) parts.push(plural(photoCount, 'photo'))
  const purchases = items.purchaseProgress(task.id)
  if (purchases.total)
    parts.push(`${purchases.done}/${purchases.total} ${purchases.done > 1 ? 'achetés' : 'acheté'}`)
  return parts.join(' · ')
}
</script>

<template>
  <PageShell>
    <PageBar :back="`/projets/${projectId}`" />
    <p v-if="project" class="mt-2 text-sm font-semibold text-ink-soft">
      {{ project.icon }} {{ project.name }}
    </p>
    <h1 class="text-[32px] leading-tight font-extrabold tracking-tight">Archives</h1>
    <p v-if="groups.length" class="text-ink-soft">Une tâche restaurée retrouve sa place dans la liste.</p>

    <OfflineNotice class="mt-4" />

    <EmptyState
      v-if="!groups.length"
      :icon="Archive"
      title="Rien d'archivé pour l'instant"
      text="Les tâches terminées restent dans la liste. Archivez-les depuis le menu du projet quand vous voulez faire de la place."
    />

    <section v-for="group in groups" :key="group.day" class="mt-6">
      <h2 class="section-title mb-2 font-sans">Archivées le {{ formatShortDate(group.day) }}</h2>
      <div class="card divide-y divide-line">
        <div v-for="task in group.tasks" :key="task.id" class="flex items-center gap-3 px-4 py-3">
          <StatusToggle :status="task.status" class="pointer-events-none" tabindex="-1" aria-hidden="true" />
          <RouterLink :to="{ name: 'task', params: { projectId, taskId: task.id } }" class="min-w-0 flex-1">
            <span class="block font-semibold">{{ task.title }}</span>
            <span class="text-sm text-ink-soft">{{ details(task) }}</span>
          </RouterLink>
          <button type="button" class="btn-secondary shrink-0" @click="store.restoreTask(task.id)">
            <RotateCcw :size="16" /> Restaurer
          </button>
        </div>
      </div>
    </section>
  </PageShell>
</template>
