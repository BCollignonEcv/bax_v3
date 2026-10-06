<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Check, GripVertical, Trash2 } from '@lucide/vue'
import { useNetworkStore } from '@/core/stores/network'
import type { Subtask } from '../types'

const props = defineProps<{ subtask: Subtask; dragging?: boolean }>()
const emit = defineEmits<{
  toggle: []
  rename: [title: string]
  remove: []
  /** Appui sur la poignée : début du glisser-déposer (géré par la liste). */
  grab: [event: PointerEvent]
}>()

const network = useNetworkStore()

// ---------- Modification du texte en ligne ----------
const editing = ref(false)
const draft = ref('')
const input = ref<HTMLInputElement>()

async function startEdit() {
  if (!network.requireOnline()) return
  draft.value = props.subtask.title
  editing.value = true
  await nextTick()
  input.value?.focus()
}

function commit() {
  if (!editing.value) return
  editing.value = false
  if (draft.value.trim() && draft.value.trim() !== props.subtask.title) emit('rename', draft.value)
}

function cancel() {
  editing.value = false
}

// ---------- Balayage vers la gauche pour supprimer ----------
const row = ref<HTMLElement>()
const offset = ref(0)
const swiping = ref(false)
let startX = 0
let startY = 0
let tracking = false
let horizontal: boolean | null = null
let swiped = false

const threshold = () => (row.value?.offsetWidth ?? 320) * 0.3

function onPointerDown(event: PointerEvent) {
  if (editing.value || (event.pointerType === 'mouse' && event.button !== 0)) return
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
    horizontal = dx < 0 && Math.abs(dx) > Math.abs(dy) * 1.2
    if (!horizontal) {
      tracking = false
      return
    }
    row.value?.setPointerCapture(event.pointerId)
    swiping.value = true
  }
  const limit = threshold() * 1.6
  const distance = Math.max(0, -dx)
  offset.value = -(distance > limit ? limit + (distance - limit) * 0.2 : distance)
}

function onPointerUp() {
  if (!tracking) return
  tracking = false
  if (horizontal) {
    swiped = true
    if (-offset.value > threshold()) emit('remove')
  }
  swiping.value = false
  offset.value = 0
}

/** Un balayage ne doit pas aussi cocher ou passer en modification. */
function onClickCapture(event: MouseEvent) {
  if (swiped) {
    event.preventDefault()
    event.stopPropagation()
    swiped = false
  }
}
</script>

<template>
  <div class="relative overflow-hidden">
    <div
      class="absolute inset-y-0 right-0 flex items-center gap-2 bg-sunken px-4 font-bold"
      :style="{ opacity: offset < -4 ? 1 : 0 }"
      aria-hidden="true"
    >
      <Trash2 :size="18" /> Supprimer
    </div>

    <div
      ref="row"
      class="relative flex min-h-13 touch-pan-y items-center gap-3 bg-card py-2 pr-2 pl-4"
      :class="!swiping && 'transition-transform duration-200'"
      :style="{ transform: `translateX(${offset}px)` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.capture="onClickCapture"
    >
      <button
        type="button"
        class="-m-2 flex size-10 shrink-0 items-center justify-center"
        :aria-label="subtask.done ? `Décocher « ${subtask.title} »` : `Cocher « ${subtask.title} »`"
        :aria-pressed="subtask.done"
        @click="emit('toggle')"
      >
        <span
          class="flex size-6 items-center justify-center rounded-full border-2 transition-colors"
          :class="subtask.done ? 'border-done bg-done text-white' : 'border-muted/60'"
        >
          <Check v-if="subtask.done" :size="14" :stroke-width="3" />
        </span>
      </button>

      <input
        v-if="editing"
        ref="input"
        v-model="draft"
        class="h-10 min-w-0 flex-1 rounded-xl border-2 border-ink bg-card px-3 outline-none"
        enterkeyhint="done"
        aria-label="Texte de la sous-tâche"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="cancel"
        @blur="commit"
      />
      <button
        v-else
        type="button"
        class="min-w-0 flex-1 py-1.5 text-left break-words"
        :class="subtask.done && 'text-ink-soft line-through decoration-ink-soft/70'"
        @click="startEdit"
      >
        {{ subtask.title }}
      </button>

      <button
        type="button"
        class="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center text-ink-soft active:cursor-grabbing"
        :class="dragging && 'text-ink'"
        :aria-label="`Déplacer « ${subtask.title} »`"
        @pointerdown.stop="emit('grab', $event)"
        @click.prevent
      >
        <GripVertical :size="18" />
      </button>
    </div>
  </div>
</template>
