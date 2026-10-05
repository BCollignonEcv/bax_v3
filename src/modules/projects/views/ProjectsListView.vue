<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Archive, ChevronRight, ListChecks, Plus } from '@lucide/vue'
import EmptyState from '@/core/components/EmptyState.vue'
import Fab from '@/core/components/Fab.vue'
import IconButton from '@/core/components/IconButton.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import PageBar from '@/core/components/PageBar.vue'
import PageShell from '@/core/components/PageShell.vue'
import { useNetworkStore } from '@/core/stores/network'
import ProjectCard from '../components/ProjectCard.vue'
import { useProjectsStore } from '../stores/projects'
import { PROJECT_TEMPLATES } from '../types'

const store = useProjectsStore()
const network = useNetworkStore()
const router = useRouter()

const projects = computed(() => store.activeProjects)

// ---------- Réorganisation : appui long puis glisser ----------
const cards = ref<HTMLElement[]>([])
const drag = reactive({ id: null as string | null, from: 0, to: 0, dy: 0 })
let rects: DOMRect[] = []
let gap = 12
let timer: ReturnType<typeof setTimeout> | undefined
let startX = 0
let startY = 0
let suppressClick = false

function preventScroll(event: TouchEvent) {
  event.preventDefault()
}

function onPointerDown(event: PointerEvent, index: number) {
  startX = event.clientX
  startY = event.clientY
  const target = event.currentTarget as HTMLElement
  const pointerId = event.pointerId
  clearTimeout(timer)
  timer = setTimeout(() => begin(index, target, pointerId), 380)
}

function begin(index: number, target: HTMLElement, pointerId: number) {
  if (!network.requireOnline()) return
  rects = cards.value.map((el) => el.getBoundingClientRect())
  gap = rects.length > 1 ? rects[1]!.top - rects[0]!.bottom : 12
  Object.assign(drag, { id: projects.value[index]!.id, from: index, to: index, dy: 0 })
  target.setPointerCapture?.(pointerId)
  document.addEventListener('touchmove', preventScroll, { passive: false })
  navigator.vibrate?.(10)
}

function onPointerMove(event: PointerEvent) {
  if (!drag.id) {
    if (Math.abs(event.clientX - startX) > 8 || Math.abs(event.clientY - startY) > 8) clearTimeout(timer)
    return
  }
  drag.dy = event.clientY - startY
  const from = rects[drag.from]!
  const center = from.top + from.height / 2 + drag.dy
  let to = drag.from
  for (let j = drag.from + 1; j < rects.length; j++) if (center > rects[j]!.top + rects[j]!.height / 2) to = j
  for (let j = drag.from - 1; j >= 0; j--) if (center < rects[j]!.top + rects[j]!.height / 2) to = j
  drag.to = to
}

function onPointerUp() {
  clearTimeout(timer)
  if (!drag.id) return
  suppressClick = true
  document.removeEventListener('touchmove', preventScroll)
  if (drag.from !== drag.to) {
    const ids = projects.value.map((p) => p.id)
    const [moved] = ids.splice(drag.from, 1)
    ids.splice(drag.to, 0, moved!)
    void store.reorderProjects(ids)
  }
  Object.assign(drag, { id: null, from: 0, to: 0, dy: 0 })
}

function shift(index: number) {
  if (!drag.id) return 0
  if (index === drag.from) return drag.dy
  const size = rects[drag.from]!.height + gap
  if (drag.from < drag.to && index > drag.from && index <= drag.to) return -size
  if (drag.to < drag.from && index >= drag.to && index < drag.from) return size
  return 0
}

function onClickCapture(event: MouseEvent) {
  if (suppressClick) {
    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
  }
}

onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('touchmove', preventScroll)
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
