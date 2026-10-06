<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { Check } from '@lucide/vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import { useNetworkStore } from '@/core/stores/network'
import { analyzeDescription, removeLines } from '../composables/descriptionLines'
import { useProjectsStore } from '../stores/projects'
import { useSubtasksStore } from '../stores/subtasks'

const props = defineProps<{ projectId: string; taskId: string }>()

const projects = useProjectsStore()
const subtasks = useSubtasksStore()
const network = useNetworkStore()
const router = useRouter()

const task = computed(() => projects.task(props.taskId))
/** Lignes analysées une fois, à l'ouverture (la description peut changer ensuite). */
const lines = ref<ReturnType<typeof analyzeDescription>>([])
const selected = reactive(new Set<number>())
const removeFromDescription = ref(true)
const saving = ref(false)
let analysed = false

watchEffect(() => {
  if (analysed || !task.value) return
  analysed = true
  lines.value = analyzeDescription(task.value.description)
  // Les lignes de liste sont cochées par défaut, les autres non.
  lines.value.filter((line) => line.isListItem).forEach((line) => selected.add(line.index))
})

const count = computed(() => selected.size)

function toggle(index: number) {
  if (selected.has(index)) selected.delete(index)
  else selected.add(index)
}

function close() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'task', params: { projectId: props.projectId, taskId: props.taskId } })
}

async function convert() {
  const current = task.value
  if (!current || !count.value || saving.value || !network.requireOnline()) return
  saving.value = true
  // Dans l'ordre de la description ; « [x] » ou « ✓ » donne une étape déjà cochée.
  const chosen = lines.value.filter((line) => selected.has(line.index))
  const ok = await subtasks.addSubtasks(
    current.id,
    chosen.map((line) => ({ title: line.text, done: line.done })),
  )
  if (ok && removeFromDescription.value) {
    const rest = removeLines(
      current.description ?? '',
      chosen.map((line) => line.index),
    )
    await projects.updateTask(current.id, { description: rest || null })
  }
  saving.value = false
  if (ok) close()
}
</script>

<template>
  <main class="pt-safe pb-safe mx-auto flex min-h-dvh max-w-xl flex-col px-4">
    <header class="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-3">
      <button type="button" class="py-2 text-ink-soft" @click="close">Annuler</button>
      <h1 class="text-center font-sans text-base leading-tight font-bold">Transformer en sous-tâches</h1>
      <span class="w-14" />
    </header>

    <template v-if="task">
      <h2 class="mt-2 text-[26px] leading-tight font-extrabold tracking-tight">{{ task.title }}</h2>
      <p class="mt-1 text-ink-soft">Choisissez les lignes qui deviennent des sous-tâches.</p>

      <OfflineNotice class="mt-4" />

      <div class="card mt-4 divide-y divide-line">
        <button
          v-for="line in lines"
          :key="line.index"
          type="button"
          role="checkbox"
          :aria-checked="selected.has(line.index)"
          class="flex w-full items-start gap-3 px-4 py-3 text-left"
          @click="toggle(line.index)"
        >
          <span
            class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
            :class="selected.has(line.index) ? 'border-ink bg-ink text-on-ink' : 'border-muted/60'"
          >
            <Check v-if="selected.has(line.index)" :size="14" :stroke-width="3" />
          </span>
          <span :class="!selected.has(line.index) && 'text-ink-soft'">{{ line.raw }}</span>
        </button>
      </div>

      <label class="mt-6 flex cursor-pointer items-center gap-4">
        <span class="flex-1">
          <span class="block font-bold">Retirer ces lignes de la description</span>
          <span class="text-sm text-ink-soft">Les autres lignes restent en place.</span>
        </span>
        <input v-model="removeFromDescription" type="checkbox" class="peer sr-only" />
        <span
          class="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-done after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
          aria-hidden="true"
        />
      </label>

      <div class="flex-1" />
      <button
        type="button"
        class="btn-primary mt-8 w-full"
        :disabled="!count || saving || !network.online"
        @click="convert"
      >
        {{
          count > 1
            ? `Créer ${count} sous-tâches`
            : count === 1
              ? 'Créer 1 sous-tâche'
              : 'Choisissez des lignes'
        }}
      </button>
    </template>
  </main>
</template>
