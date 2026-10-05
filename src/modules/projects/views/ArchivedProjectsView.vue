<script setup lang="ts">
import { Archive, RotateCcw } from '@lucide/vue'
import EmojiTile from '@/core/components/EmojiTile.vue'
import EmptyState from '@/core/components/EmptyState.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import PageBar from '@/core/components/PageBar.vue'
import PageShell from '@/core/components/PageShell.vue'
import { formatShortDate } from '@/core/format'
import { useProjectsStore } from '../stores/projects'

const store = useProjectsStore()

function summary(projectId: string, archivedAt: string) {
  const tasks = store.allTasksOf(projectId)
  const done = tasks.filter((t) => t.status === 'done').length
  return `${done} ${done > 1 ? 'tâches' : 'tâche'} sur ${tasks.length} · archivé le ${formatShortDate(archivedAt)}`
}
</script>

<template>
  <PageShell>
    <PageBar back="/projets" />
    <h1 class="mt-2 text-[32px] leading-tight font-extrabold tracking-tight">Projets archivés</h1>
    <p class="text-ink-soft">Un projet restauré retrouve sa place dans la liste.</p>

    <OfflineNotice class="mt-4" />

    <EmptyState
      v-if="!store.archivedProjects.length"
      :icon="Archive"
      title="Aucun projet archivé"
      text="Archivez un projet depuis son menu quand il est terminé."
    />

    <div class="mt-5 space-y-3">
      <div
        v-for="project in store.archivedProjects"
        :key="project.id"
        class="card flex items-center gap-3 p-4"
      >
        <RouterLink
          :to="{ name: 'project', params: { projectId: project.id } }"
          class="flex min-w-0 flex-1 items-center gap-3"
        >
          <EmojiTile :emoji="project.icon" :color="project.color" />
          <span class="min-w-0">
            <span class="block truncate font-display text-lg font-bold">{{ project.name }}</span>
            <span class="text-sm text-ink-soft">{{ summary(project.id, project.archived_at!) }}</span>
          </span>
        </RouterLink>
        <button type="button" class="btn-secondary shrink-0" @click="store.restoreProject(project.id)">
          <RotateCcw :size="16" /> Restaurer
        </button>
      </div>
    </div>
  </PageShell>
</template>
