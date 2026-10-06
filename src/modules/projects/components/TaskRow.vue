<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Image, ListChecks, RotateCcw, ShoppingCart } from '@lucide/vue'
import Avatars from '@/core/components/Avatars.vue'
import { useProjectsStore } from '../stores/projects'
import { usePhotosStore } from '../stores/photos'
import { useItemsStore } from '../stores/items'
import { useSubtasksStore } from '../stores/subtasks'
import type { Task } from '../types'
import PriorityBadge from './PriorityBadge.vue'
import StatusToggle from './StatusToggle.vue'
import TaskDate from './TaskDate.vue'

const props = defineProps<{ task: Task }>()

const projects = useProjectsStore()
const photos = usePhotosStore()
const items = useItemsStore()

const done = computed(() => props.task.status === 'done')
const purchases = computed(() => items.purchaseProgress(props.task.id))
const steps = computed(() => useSubtasksStore().progress(props.task.id))
const photoCount = computed(() => photos.countOf(props.task.id))

// ---------- Balayage vers la droite pour terminer ----------
const row = ref<HTMLElement>()
const offset = ref(0)
const dragging = ref(false)
let startX = 0
let startY = 0
let tracking = false
let horizontal: boolean | null = null
let swiped = false

const threshold = () => (row.value?.offsetWidth ?? 320) * 0.32

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  startX = event.clientX
  startY = event.clientY
  tracking = true
  horizontal = null
  swiped = false
}

function onPointerMove(event: PointerEvent) {
  if (!tracking) return
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (horizontal === null) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    horizontal = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2
    if (!horizontal) {
      tracking = false
      return
    }
    row.value?.setPointerCapture(event.pointerId)
    dragging.value = true
  }
  const limit = threshold() * 1.6
  offset.value = Math.max(0, dx > limit ? limit + (dx - limit) * 0.2 : dx)
}

function onPointerUp() {
  if (!tracking) return
  tracking = false
  if (horizontal) {
    swiped = true
    if (offset.value > threshold()) void projects.toggleDone(props.task.id)
  }
  dragging.value = false
  offset.value = 0
}

/** Empêche l'ouverture de la tâche à la fin d'un balayage. */
function onClickCapture(event: MouseEvent) {
  if (swiped) {
    event.preventDefault()
    event.stopPropagation()
    swiped = false
  }
}
</script>

<template>
  <div class="relative overflow-hidden rounded-3xl">
    <div
      class="absolute inset-0 flex items-center gap-2 rounded-3xl pl-6 font-bold"
      :class="done ? 'bg-sunken text-ink' : 'bg-done text-white'"
      :style="{ opacity: offset > 4 ? 1 : 0 }"
      aria-hidden="true"
    >
      <component :is="done ? RotateCcw : Check" :size="20" :stroke-width="2.5" />
      {{ done ? 'À faire' : 'Terminer' }}
    </div>

    <div
      ref="row"
      class="relative touch-pan-y select-none"
      :class="!dragging && 'transition-transform duration-200'"
      :style="{ transform: `translateX(${offset}px)` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.capture="onClickCapture"
    >
      <RouterLink
        :to="{ name: 'task', params: { projectId: task.project_id, taskId: task.id } }"
        class="flex items-start gap-3 rounded-3xl border p-4"
        :class="done ? 'border-done-line bg-done-soft' : 'border-line bg-card'"
        draggable="false"
      >
        <StatusToggle
          :status="task.status"
          class="mt-px"
          @click.prevent.stop="projects.toggleDone(task.id)"
        />
        <div class="min-w-0 flex-1">
          <p class="font-semibold" :class="done && 'text-ink-soft line-through decoration-ink-soft/70'">
            {{ task.title }}
          </p>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <PriorityBadge :priority="task.priority" />
            <span
              v-if="task.status === 'in_progress'"
              class="rounded-md bg-doing-soft px-2 py-0.5 text-xs font-semibold text-doing"
            >
              En cours
            </span>
            <TaskDate v-if="task.target_date" :date="task.target_date" :done="done" />
            <span v-if="steps.total" class="inline-flex items-center gap-1 text-[13px] text-ink-soft">
              <ListChecks :size="14" />
              {{ steps.done }}/{{ steps.total }} {{ steps.total > 1 ? 'étapes' : 'étape' }}
            </span>
            <span v-if="purchases.total" class="inline-flex items-center gap-1 text-[13px] text-ink-soft">
              <ShoppingCart :size="14" />
              {{ purchases.done }}/{{ purchases.total }} {{ purchases.done > 1 ? 'achetés' : 'acheté' }}
            </span>
            <span v-if="photoCount" class="inline-flex items-center gap-1 text-[13px] text-ink-soft">
              <Image :size="14" />
              {{ photoCount }}
            </span>
          </div>
        </div>
        <Avatars :ids="task.assignee_ids" />
      </RouterLink>
    </div>
  </div>
</template>
