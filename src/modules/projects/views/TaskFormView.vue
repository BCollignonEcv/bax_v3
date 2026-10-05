<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, X } from '@lucide/vue'
import Avatars from '@/core/components/Avatars.vue'
import DateField from '@/core/components/DateField.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import SegmentedControl from '@/core/components/SegmentedControl.vue'
import { useNetworkStore } from '@/core/stores/network'
import { useProfilesStore } from '@/core/stores/profiles'
import AddPhotoSheet from '../components/AddPhotoSheet.vue'
import ItemAdder from '../components/ItemAdder.vue'
import ItemRow from '../components/ItemRow.vue'
import ItemSheet from '../components/ItemSheet.vue'
import PhotoThumb from '../components/PhotoThumb.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import { parseItemName } from '../composables/itemName'
import { useAssignees, type AssigneeChoice } from '../composables/useAssignees'
import { useItemsStore, type ItemInput } from '../stores/items'
import { usePhotosStore } from '../stores/photos'
import { useProjectsStore } from '../stores/projects'
import { PRIORITIES, STATUSES, type Priority, type Status } from '../types'

const props = defineProps<{ projectId: string }>()

const store = useProjectsStore()
const items = useItemsStore()
const photos = usePhotosStore()
const profiles = useProfilesStore()
const network = useNetworkStore()
const assignees = useAssignees()
const router = useRouter()

const form = reactive({
  title: '',
  priority: 'medium' as Priority | null,
  assignee: (profiles.me?.id ?? null) as AssigneeChoice,
  status: 'todo' as Status,
  target_date: null as string | null,
  description: '',
})

/** Articles en attente : nouveaux (à créer) ou existants (à relier). */
type DraftItem = { key: string; itemId?: string; values: ItemInput }
const draftItems = ref<DraftItem[]>([])
const files = ref<{ file: File; preview: string }[]>([])
const photoSheet = ref(false)
const editingKey = ref<string | null>(null)
const saving = ref(false)

const editing = computed(() => draftItems.value.find((d) => d.key === editingKey.value) ?? null)
const canSave = computed(() => form.title.trim().length > 0 && !saving.value && network.online)

function addExisting(itemId: string) {
  const item = items.item(itemId)
  if (!item || draftItems.value.some((d) => d.itemId === itemId)) return
  draftItems.value.push({ key: itemId, itemId, values: item })
}

function addNew(text: string) {
  const key = crypto.randomUUID()
  draftItems.value.push({ key, values: { ...parseItemName(text), price: null, note: null } })
  editingKey.value = key
}

function saveDraft(values: ItemInput) {
  if (editing.value && !editing.value.itemId) editing.value.values = values
  editingKey.value = null
}

function removeDraft() {
  draftItems.value = draftItems.value.filter((d) => d.key !== editingKey.value)
  editingKey.value = null
}

function addFiles(list: File[]) {
  files.value.push(...list.map((file) => ({ file, preview: URL.createObjectURL(file) })))
}

function removeFile(index: number) {
  const [removed] = files.value.splice(index, 1)
  if (removed) URL.revokeObjectURL(removed.preview)
}

onBeforeUnmount(() => files.value.forEach((f) => URL.revokeObjectURL(f.preview)))

function close() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'project', params: { projectId: props.projectId } })
}

async function submit() {
  if (!canSave.value) return
  saving.value = true
  const task = await store.createTask({
    project_id: props.projectId,
    title: form.title.trim(),
    priority: form.priority ?? 'medium',
    status: form.status,
    target_date: form.target_date,
    assignee_ids: assignees.toIds(form.assignee),
    description: form.description.trim() || null,
  })
  if (!task) {
    saving.value = false
    return
  }
  for (const draft of draftItems.value) {
    if (draft.itemId) await items.linkItem(task.id, draft.itemId)
    else await items.createItemForTask(task.id, draft.values)
  }
  // L'envoi des photos continue en arrière-plan (progression visible dans la tâche).
  if (files.value.length)
    void photos.addPhotos(
      task.id,
      files.value.map((f) => f.file),
    )
  saving.value = false
  close()
}
</script>

<template>
  <main class="pt-safe pb-safe mx-auto min-h-dvh max-w-xl px-4">
    <header class="grid h-14 grid-cols-[1fr_auto_1fr] items-center">
      <button type="button" class="justify-self-start py-2 text-ink-soft" @click="close">Annuler</button>
      <h1 class="font-sans text-base font-bold">Nouvelle tâche</h1>
      <button
        type="button"
        class="justify-self-end py-2 font-bold disabled:opacity-40"
        :disabled="!canSave"
        @click="submit"
      >
        Ajouter
      </button>
    </header>

    <OfflineNotice class="mb-3" />

    <form class="space-y-5" @submit.prevent="submit">
      <div>
        <label class="label" for="title">Titre</label>
        <input
          id="title"
          v-model="form.title"
          class="field font-semibold"
          maxlength="120"
          required
          autofocus
          enterkeyhint="next"
        />
      </div>

      <div>
        <p class="label">Priorité</p>
        <SegmentedControl v-model="form.priority" :options="PRIORITIES">
          <template #option="{ option }">
            <PriorityBadge :priority="option.value" class="text-sm" />
          </template>
        </SegmentedControl>
      </div>

      <div>
        <p class="label">Assignée à</p>
        <SegmentedControl v-model="form.assignee" :options="assignees.options.value" allow-empty>
          <template #option="{ option }">
            <Avatars :ids="assignees.toIds(option.value)" size="sm" />
            <span class="truncate">{{ option.label }}</span>
          </template>
        </SegmentedControl>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="status">Statut</label>
          <select id="status" v-model="form.status" class="field appearance-none font-semibold">
            <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div>
          <p class="label">Date cible <span class="label-hint">· facultative</span></p>
          <DateField v-model="form.target_date" compact />
        </div>
      </div>

      <div>
        <label class="label" for="description"
          >Description <span class="label-hint">· facultative</span></label
        >
        <textarea
          id="description"
          v-model="form.description"
          rows="3"
          class="field h-auto py-3"
          placeholder="Détails, mesures, références…"
        />
      </div>

      <div>
        <p class="label">Photos</p>
        <div class="grid grid-cols-4 gap-2">
          <PhotoThumb v-for="(f, i) in files" :key="f.preview" :src="f.preview">
            <button
              type="button"
              class="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-ink/70 text-white"
              aria-label="Retirer la photo"
              @click="removeFile(i)"
            >
              <X :size="14" />
            </button>
          </PhotoThumb>
          <button
            type="button"
            class="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-muted/50 text-sm font-semibold text-ink-soft"
            @click="photoSheet = true"
          >
            <Camera :size="20" /> Ajouter
          </button>
        </div>
      </div>

      <div>
        <p class="label">Liste d'achats</p>
        <div class="card divide-y divide-line">
          <ItemRow
            v-for="draft in draftItems"
            :key="draft.key"
            :name="draft.values.name"
            :quantity="draft.values.quantity"
            :price="draft.values.price"
            :note="draft.values.note"
            :purchased="false"
            disabled-check
            @open="editingKey = draft.key"
          />
          <ItemAdder
            :exclude-ids="draftItems.flatMap((d) => (d.itemId ? [d.itemId] : []))"
            @link="addExisting"
            @create="addNew"
          />
        </div>
      </div>

      <button type="submit" class="btn-primary !mt-8 w-full" :disabled="!canSave">Ajouter la tâche</button>
    </form>

    <AddPhotoSheet :open="photoSheet" @close="photoSheet = false" @files="addFiles" />
    <ItemSheet
      :open="!!editing"
      :item="editing?.values ?? null"
      @close="editingKey = null"
      @save="saveDraft"
      @remove="removeDraft"
    />
  </main>
</template>
