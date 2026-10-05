<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, Trash2 } from '@lucide/vue'
import DateField from '@/core/components/DateField.vue'
import EmojiTile from '@/core/components/EmojiTile.vue'
import { useConfirmStore } from '@/core/stores/confirm'
import { useNetworkStore } from '@/core/stores/network'
import { useProjectsStore } from '../stores/projects'
import { PROJECT_COLORS, PROJECT_EMOJIS, PROJECT_TEMPLATES } from '../types'

const props = defineProps<{ projectId?: string }>()

const store = useProjectsStore()
const network = useNetworkStore()
const confirm = useConfirmStore()
const route = useRoute()
const router = useRouter()

const template = PROJECT_TEMPLATES.find((t) => t.id === route.query.modele)
const form = reactive({
  name: template?.name ?? '',
  icon: template?.icon ?? PROJECT_EMOJIS[0]!,
  color: template?.color ?? PROJECT_COLORS[0]!,
  target_date: null as string | null,
  description: '',
})
const customEmoji = ref('')
const saving = ref(false)
let loaded = false

const editing = computed(() => !!props.projectId)
const project = computed(() => (props.projectId ? store.project(props.projectId) : undefined))
const canSave = computed(() => form.name.trim().length > 0 && !saving.value && network.online)

// Préremplissage en modification (les données peuvent arriver après l'ouverture).
watchEffect(() => {
  if (loaded || !project.value) return
  loaded = true
  Object.assign(form, {
    name: project.value.name,
    icon: project.value.icon,
    color: project.value.color,
    target_date: project.value.target_date,
    description: project.value.description ?? '',
  })
  if (!PROJECT_EMOJIS.includes(form.icon)) customEmoji.value = form.icon
})

function onCustomEmoji(event: Event) {
  // Garde uniquement le dernier caractère saisi (un emoji peut tenir sur plusieurs unités).
  const chars = [
    ...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(
      (event.target as HTMLInputElement).value,
    ),
  ]
  const last = chars.at(-1)?.segment ?? ''
  customEmoji.value = last
  if (last) form.icon = last
}

function close() {
  if (window.history.state?.back) router.back()
  else
    router.replace(
      project.value ? { name: 'project', params: { projectId: project.value.id } } : { name: 'projects' },
    )
}

async function submit() {
  if (!canSave.value) return
  saving.value = true
  const input = {
    name: form.name.trim(),
    icon: form.icon,
    color: form.color,
    target_date: form.target_date,
    description: form.description.trim() || null,
  }
  if (props.projectId) {
    const ok = await store.updateProject(props.projectId, input)
    saving.value = false
    if (ok) close()
  } else {
    const id = await store.createProject(input)
    saving.value = false
    if (id) router.replace({ name: 'project', params: { projectId: id } })
  }
}

async function remove() {
  if (!props.projectId) return
  const ok = await confirm.ask({
    title: `Supprimer « ${project.value?.name} » ?`,
    message: 'Ses tâches, photos et articles seront supprimés définitivement.',
    confirmLabel: 'Supprimer',
  })
  if (ok && store.deleteProject(props.projectId)) router.replace({ name: 'projects' })
}
</script>

<template>
  <main class="pt-safe pb-safe mx-auto flex min-h-dvh max-w-xl flex-col px-4">
    <header class="grid h-14 grid-cols-[1fr_auto_1fr] items-center">
      <button type="button" class="justify-self-start py-2 text-ink-soft" @click="close">Annuler</button>
      <h1 class="font-sans text-base font-bold">{{ editing ? 'Modifier le projet' : 'Nouveau projet' }}</h1>
      <button
        type="button"
        class="justify-self-end py-2 font-bold disabled:opacity-40"
        :disabled="!canSave"
        @click="submit"
      >
        OK
      </button>
    </header>

    <form class="mt-4 flex flex-1 flex-col" @submit.prevent="submit">
      <div class="flex items-end gap-4">
        <EmojiTile :emoji="form.icon" :color="form.color" size="lg" class="size-[88px]" />
        <div class="flex-1">
          <label class="label" for="name">Nom du projet</label>
          <input id="name" v-model="form.name" class="field font-semibold" maxlength="60" required />
        </div>
      </div>

      <p class="label mt-5">Emoji</p>
      <div class="grid grid-cols-6 gap-2">
        <button
          v-for="emoji in PROJECT_EMOJIS"
          :key="emoji"
          type="button"
          class="flex aspect-square items-center justify-center rounded-2xl border-2 bg-card text-2xl"
          :class="form.icon === emoji ? 'border-ink' : 'border-transparent'"
          :aria-pressed="form.icon === emoji"
          @click="form.icon = emoji"
        >
          {{ emoji }}
        </button>
        <input
          :value="customEmoji"
          class="aspect-square w-full rounded-2xl border-2 bg-card text-center text-2xl outline-none placeholder:text-muted"
          :class="customEmoji && form.icon === customEmoji ? 'border-ink' : 'border-transparent'"
          placeholder="…"
          aria-label="Autre emoji"
          @input="onCustomEmoji"
          @focus="customEmoji && (form.icon = customEmoji)"
        />
      </div>

      <p class="label mt-5">Couleur</p>
      <div class="flex justify-between gap-2">
        <button
          v-for="color in PROJECT_COLORS"
          :key="color"
          type="button"
          class="flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-white"
          :class="form.color === color && 'ring-2 ring-ink ring-offset-2 ring-offset-canvas'"
          :style="{ background: color }"
          :aria-label="`Couleur ${color}`"
          :aria-pressed="form.color === color"
          @click="form.color = color"
        >
          <Check v-if="form.color === color" :size="18" :stroke-width="3" />
        </button>
      </div>

      <p class="label mt-5">Date cible <span class="label-hint">· facultative</span></p>
      <DateField v-model="form.target_date" />

      <label class="label mt-5" for="description"
        >Description <span class="label-hint">· facultative</span></label
      >
      <textarea id="description" v-model="form.description" rows="3" class="field h-auto py-3" />

      <p class="mt-3 text-sm text-ink-soft">Le budget est calculé à partir des prix des listes d'achats.</p>

      <button
        v-if="editing"
        type="button"
        class="mt-6 inline-flex items-center gap-2 self-start py-2 text-sm font-semibold text-ink-soft"
        @click="remove"
      >
        <Trash2 :size="16" /> Supprimer le projet
      </button>

      <div class="flex-1" />
      <button type="submit" class="btn-primary mt-8 w-full" :disabled="!canSave">Enregistrer</button>
    </form>
  </main>
</template>
