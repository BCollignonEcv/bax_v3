<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Archive, Check, ChevronLeft, ChevronRight, Ellipsis, Pencil, RotateCcw, Trash2 } from '@lucide/vue'
import AutoTextarea from '@/core/components/AutoTextarea.vue'
import Avatars from '@/core/components/Avatars.vue'
import BottomSheet from '@/core/components/BottomSheet.vue'
import EmptyState from '@/core/components/EmptyState.vue'
import IconButton from '@/core/components/IconButton.vue'
import LinkifiedText from '@/core/components/LinkifiedText.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import SegmentedControl from '@/core/components/SegmentedControl.vue'
import SheetAction from '@/core/components/SheetAction.vue'
import { formatDayDate, formatShortDate, isOverdue } from '@/core/format'
import { useConfirmStore } from '@/core/stores/confirm'
import { useNetworkStore } from '@/core/stores/network'
import { useProfilesStore } from '@/core/stores/profiles'
import PriorityBadge from '../components/PriorityBadge.vue'
import TaskItems from '../components/TaskItems.vue'
import TaskPhotos from '../components/TaskPhotos.vue'
import { useAssignees, type AssigneeChoice } from '../composables/useAssignees'
import { useProjectsStore } from '../stores/projects'
import { PRIORITIES, STATUSES, type Priority, type Status } from '../types'

const props = defineProps<{ projectId: string; taskId: string }>()

const store = useProjectsStore()
const profiles = useProfilesStore()
const network = useNetworkStore()
const confirm = useConfirmStore()
const assignees = useAssignees()
const router = useRouter()

const task = computed(() => store.task(props.taskId))
const project = computed(() => store.project(props.projectId))

const title = ref('')
const description = ref('')
watch(
  () => [task.value?.title, task.value?.description],
  () => {
    // Ne pas écraser une saisie en cours si l'autre téléphone modifie la tâche.
    const active = document.activeElement
    if (!(active instanceof HTMLTextAreaElement)) {
      title.value = task.value?.title ?? ''
      description.value = task.value?.description ?? ''
    }
  },
  { immediate: true },
)

const sheet = ref<'priority' | 'assignee' | 'menu' | null>(null)
const dateInput = ref<HTMLInputElement>()

const status = computed({
  get: () => task.value?.status ?? null,
  set: (value: Status | null) => value && void store.setStatus(props.taskId, value),
})

function saveTitle() {
  const value = title.value.trim()
  if (!value) title.value = task.value?.title ?? ''
  else if (value !== task.value?.title) void store.updateTask(props.taskId, { title: value })
}

// Description : affichée avec ses liens cliquables, modifiable en la touchant.
const editingDescription = ref(false)
const descriptionInput = ref<{ $el: HTMLTextAreaElement }>()

async function editDescription() {
  if (!network.requireOnline()) return
  editingDescription.value = true
  await nextTick()
  descriptionInput.value?.$el.focus()
}

function saveDescription() {
  editingDescription.value = false
  const value = description.value.trim() || null
  if (value !== (task.value?.description ?? null)) void store.updateTask(props.taskId, { description: value })
}

function setPriority(priority: Priority) {
  sheet.value = null
  void store.updateTask(props.taskId, { priority })
}

function setAssignee(choice: AssigneeChoice) {
  sheet.value = null
  void store.updateTask(props.taskId, { assignee_ids: assignees.toIds(choice) })
}

function openDate() {
  if (!network.requireOnline()) return
  try {
    dateInput.value?.showPicker()
  } catch {
    dateInput.value?.click()
  }
}

function setDate(value: string | null) {
  void store.updateTask(props.taskId, { target_date: value || null })
}

function back() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'project', params: { projectId: props.projectId } })
}

async function archive() {
  sheet.value = null
  if (await store.archiveTask(props.taskId)) back()
}

async function remove() {
  sheet.value = null
  const ok = await confirm.ask({
    title: 'Supprimer cette tâche ?',
    message: 'Ses photos et le lien avec ses articles seront supprimés.',
    confirmLabel: 'Supprimer',
    icon: Trash2,
  })
  if (ok && store.deleteTask(props.taskId)) back()
}
</script>

<template>
  <main class="pt-safe mx-auto min-h-dvh max-w-xl px-4 pb-16">
    <header class="grid h-11 grid-cols-[44px_1fr_44px] items-center">
      <button
        type="button"
        class="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-sunken"
        aria-label="Retour"
        @click="back"
      >
        <ChevronLeft :size="24" />
      </button>
      <RouterLink
        v-if="project"
        :to="{ name: 'project', params: { projectId } }"
        class="project-chip mx-auto max-w-full truncate rounded-full px-3 py-1.5 text-sm font-semibold"
        :style="{ '--chip': project.color }"
      >
        {{ project.icon }} {{ project.name }}
      </RouterLink>
      <span v-else />
      <IconButton v-if="task" label="Plus d'actions" class="-mr-2" @click="sheet = 'menu'">
        <Ellipsis :size="22" />
      </IconButton>
    </header>

    <template v-if="task">
      <AutoTextarea
        v-model="title"
        class="mt-3 w-full bg-transparent font-display text-[30px] leading-tight font-extrabold tracking-tight outline-none"
        aria-label="Titre de la tâche"
        enterkeyhint="done"
        :readonly="!network.online"
        @blur="saveTitle"
        @keydown.enter.prevent="($event.target as HTMLTextAreaElement).blur()"
      />

      <div
        v-if="task.archived_at"
        class="mt-3 flex items-center gap-3 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-soft"
      >
        <Archive :size="18" class="shrink-0" />
        <span class="flex-1">Tâche archivée le {{ formatShortDate(task.archived_at) }}.</span>
      </div>

      <OfflineNotice class="mt-3" />

      <SegmentedControl v-model="status" :options="STATUSES" class="mt-4" />

      <div class="card mt-4 divide-y divide-line">
        <button
          type="button"
          class="flex min-h-14 w-full items-center gap-3 px-4 text-left"
          @click="network.requireOnline() && (sheet = 'priority')"
        >
          <span class="w-28 shrink-0 text-ink-soft">Priorité</span>
          <PriorityBadge :priority="task.priority" class="flex-1 text-[15px]" />
          <ChevronRight :size="18" class="text-ink-soft" />
        </button>
        <button
          type="button"
          class="relative flex min-h-14 w-full items-center gap-3 px-4 text-left"
          @click="openDate"
        >
          <span class="w-28 shrink-0 text-ink-soft">Date cible</span>
          <span v-if="task.target_date" class="flex-1 font-semibold">
            {{ formatDayDate(task.target_date) }}
            <span
              v-if="isOverdue(task.target_date) && task.status !== 'done'"
              class="font-normal text-ink-soft"
            >
              · passée</span
            >
          </span>
          <span v-else class="flex-1 text-ink-soft">Ajouter une date</span>
          <ChevronRight :size="18" class="text-ink-soft" />
          <input
            ref="dateInput"
            type="date"
            class="pointer-events-none absolute inset-0 opacity-0"
            tabindex="-1"
            aria-hidden="true"
            :value="task.target_date ?? ''"
            @change="setDate(($event.target as HTMLInputElement).value)"
          />
        </button>
        <button
          type="button"
          class="flex min-h-14 w-full items-center gap-3 px-4 text-left"
          @click="network.requireOnline() && (sheet = 'assignee')"
        >
          <span class="w-28 shrink-0 text-ink-soft">Assignée à</span>
          <span class="flex flex-1 items-center gap-2 font-semibold">
            <Avatars :ids="task.assignee_ids" />
            {{ assignees.label(task.assignee_ids) }}
          </span>
          <ChevronRight :size="18" class="text-ink-soft" />
        </button>
      </div>

      <section class="mt-7">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">Description</h2>
          <!-- Toujours accessible, même si la description n'est qu'un lien -->
          <IconButton
            v-if="!editingDescription && description.trim()"
            label="Modifier la description"
            class="-my-2 -mr-2 text-ink-soft"
            @click="editDescription"
          >
            <Pencil :size="18" />
          </IconButton>
        </div>
        <AutoTextarea
          v-if="editingDescription"
          ref="descriptionInput"
          v-model="description"
          class="mt-2 w-full bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-muted"
          placeholder="Ajouter une description…"
          aria-label="Description"
          @blur="saveDescription"
        />
        <div
          v-else
          role="button"
          tabindex="0"
          class="mt-2 min-h-7 cursor-text text-[16px] leading-relaxed"
          aria-label="Modifier la description"
          @click="editDescription"
          @keydown.enter.self="editDescription"
        >
          <LinkifiedText v-if="description.trim()" :text="description" />
          <span v-else class="text-muted">Ajouter une description…</span>
        </div>
      </section>

      <TaskPhotos class="mt-7" :task-id="taskId" />
      <TaskItems class="mt-7" :task-id="taskId" />

      <button
        v-if="task.archived_at"
        type="button"
        class="btn-secondary mt-8 h-13 w-full"
        @click="store.restoreTask(taskId)"
      >
        <RotateCcw :size="18" /> Restaurer la tâche
      </button>
      <button v-else type="button" class="btn-secondary mt-8 h-13 w-full" @click="archive">
        <Archive :size="18" /> Archiver la tâche
      </button>
      <p class="mt-3 text-center text-sm text-ink-soft">
        Créée par {{ profiles.byId(task.created_by)?.first_name ?? '—' }} le
        {{ formatShortDate(task.created_at) }}
      </p>

      <BottomSheet :open="sheet === 'priority'" title="Priorité" @close="sheet = null">
        <button
          v-for="p in PRIORITIES"
          :key="p.value"
          type="button"
          class="flex min-h-13 w-full items-center gap-3 text-left"
          @click="setPriority(p.value)"
        >
          <PriorityBadge :priority="p.value" class="flex-1 text-base" />
          <Check v-if="task.priority === p.value" :size="20" />
        </button>
      </BottomSheet>

      <BottomSheet :open="sheet === 'assignee'" title="Assignée à" @close="sheet = null">
        <button
          type="button"
          class="flex min-h-13 w-full items-center gap-3 text-left font-semibold"
          @click="setAssignee(null)"
        >
          <span class="flex-1 text-ink-soft">Personne</span>
          <Check v-if="!task.assignee_ids.length" :size="20" />
        </button>
        <button
          v-for="option in assignees.options.value"
          :key="option.value"
          type="button"
          class="flex min-h-13 w-full items-center gap-3 text-left font-semibold"
          @click="setAssignee(option.value)"
        >
          <Avatars :ids="option.ids" />
          <span class="flex-1">{{ option.label }}</span>
          <Check v-if="assignees.toChoice(task.assignee_ids) === option.value" :size="20" />
        </button>
      </BottomSheet>

      <BottomSheet :open="sheet === 'menu'" :title="task.title" @close="sheet = null">
        <SheetAction
          v-if="task.archived_at"
          :icon="RotateCcw"
          label="Restaurer la tâche"
          @click="(store.restoreTask(taskId), (sheet = null))"
        />
        <SheetAction v-else :icon="Archive" label="Archiver la tâche" @click="archive" />
        <SheetAction :icon="Trash2" label="Supprimer la tâche" @click="remove" />
      </BottomSheet>
    </template>

    <EmptyState
      v-else-if="store.loaded"
      :icon="Archive"
      title="Tâche introuvable"
      text="Elle a peut-être été supprimée."
    >
      <RouterLink :to="{ name: 'project', params: { projectId } }" class="btn-primary"
        >Retour au projet</RouterLink
      >
    </EmptyState>
  </main>
</template>

<style scoped>
.project-chip {
  background: color-mix(in srgb, var(--chip) 18%, var(--card));
}
</style>
