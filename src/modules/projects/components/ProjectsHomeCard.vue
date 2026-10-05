<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, ListChecks } from '@lucide/vue'
import { plural } from '@/core/format'
import { useProjectsStore } from '../stores/projects'

const store = useProjectsStore()

const projects = computed(() =>
  store.activeProjects.map((p) => ({ project: p, progress: store.progress(p.id) })),
)

/** Tâches terminées des projets non archivés, archivées comprises. */
const doneTogether = computed(() =>
  store.activeProjects.reduce(
    (sum, p) => sum + store.allTasksOf(p.id).filter((t) => t.status === 'done').length,
    0,
  ),
)
</script>

<template>
  <RouterLink :to="{ name: 'projects' }" class="card block p-4">
    <div class="flex items-center gap-4">
      <span class="flex size-12 items-center justify-center rounded-2xl bg-ink text-on-ink">
        <ListChecks :size="22" />
      </span>
      <span class="flex-1">
        <span class="block font-display text-xl font-bold">Projets</span>
        <span class="text-sm text-ink-soft">
          {{
            projects.length ? plural(projects.length, 'projet en cours', 'projets en cours') : 'Aucun projet'
          }}
        </span>
      </span>
      <ChevronRight :size="20" class="text-ink-soft" />
    </div>

    <template v-if="projects.length">
      <p class="mt-4 text-ink-soft">
        <strong class="text-ink">{{ plural(doneTogether, 'tâche', 'tâches') }}</strong>
        {{ doneTogether > 1 ? 'faites' : 'faite' }} ensemble
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="{ project, progress } in projects"
          :key="project.id"
          class="inline-flex items-center gap-2 rounded-xl bg-sunken px-3 py-2 text-sm font-bold"
          :aria-label="`${project.name} : ${progress.done} sur ${progress.total}`"
        >
          <span>{{ project.icon }}</span>
          {{ progress.done }}/{{ progress.total }}
        </span>
      </div>
    </template>
  </RouterLink>
</template>
