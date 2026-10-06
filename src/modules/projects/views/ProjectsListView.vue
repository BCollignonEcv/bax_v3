<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Archive, ChevronRight, ListChecks, Plus } from '@lucide/vue'
import EmptyState from '@/core/components/EmptyState.vue'
import Fab from '@/core/components/Fab.vue'
import IconButton from '@/core/components/IconButton.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import PageBar from '@/core/components/PageBar.vue'
import PageShell from '@/core/components/PageShell.vue'
import { useNetworkStore } from '@/core/stores/network'
import { useDragReorder } from '@/core/composables/useDragReorder'
import ProjectCard from '../components/ProjectCard.vue'
import { useProjectsStore } from '../stores/projects'
import { PROJECT_TEMPLATES } from '../types'

const store = useProjectsStore()
const network = useNetworkStore()
const router = useRouter()

const projects = computed(() => store.activeProjects)

// ---------- Réorganisation : appui long puis glisser ----------
const { drag, onPointerDown, onPointerMove, onPointerUp, onClickCapture, shift } = useDragReorder({
  refKey: 'cards',
  ids: () => projects.value.map((p) => p.id),
  onReorder: (ids) => void store.reorderProjects(ids),
  canStart: () => network.requireOnline(),
})
</script>

<template>
  <PageShell>
    <PageBar back="/">
      <IconButton label="Projets archivés" @click="router.push({ name: 'projects-archived' })">
        <Archive :size="22" />
      </IconButton>
    </PageBar>
    <h1 class="mt-2 text-[32px] font-extrabold tracking-tight">Projets</h1>

    <OfflineNotice class="mt-4" />

    <EmptyState
      v-if="!projects.length"
      :icon="ListChecks"
      title="Aucun projet pour l'instant"
      text="Un projet, c'est une liste de tâches à deux : des travaux, un mariage, un voyage…"
    >
      <RouterLink :to="{ name: 'project-new' }" class="btn-primary"
        ><Plus :size="20" /> Créer un projet</RouterLink
      >
      <p class="mt-2 text-sm font-semibold text-ink-soft">Ou commencer avec</p>
      <div class="flex flex-wrap justify-center gap-2">
        <RouterLink
          v-for="template in PROJECT_TEMPLATES"
          :key="template.id"
          :to="{ name: 'project-new', query: { modele: template.id } }"
          class="btn-secondary rounded-full"
        >
          {{ template.icon }} {{ template.name }}
        </RouterLink>
      </div>
    </EmptyState>

    <div v-else class="mt-5 space-y-3" @click.capture="onClickCapture">
      <div
        v-for="(project, index) in projects"
        :key="project.id"
        ref="cards"
        class="select-none [-webkit-touch-callout:none]"
        :class="[
          drag.id === project.id
            ? 'relative z-10 scale-[1.02] shadow-xl'
            : 'transition-transform duration-200',
          'rounded-3xl',
        ]"
        :style="{ transform: `translateY(${shift(index)}px)` }"
        @pointerdown="onPointerDown($event, index)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @contextmenu.prevent
      >
        <RouterLink :to="{ name: 'project', params: { projectId: project.id } }" draggable="false">
          <ProjectCard :project="project" />
        </RouterLink>
      </div>
    </div>

    <RouterLink
      v-if="store.archivedProjects.length"
      :to="{ name: 'projects-archived' }"
      class="mt-4 flex items-center gap-3 px-2 py-3 text-ink-soft"
    >
      <Archive :size="20" />
      <span class="flex-1 font-semibold">Projets archivés ({{ store.archivedProjects.length }})</span>
      <ChevronRight :size="20" />
    </RouterLink>

    <Fab v-if="projects.length" label="Nouveau projet" @click="router.push({ name: 'project-new' })" />
  </PageShell>
</template>
