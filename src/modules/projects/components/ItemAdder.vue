<script setup lang="ts">
import { computed, ref } from 'vue'
import { Link, Plus } from '@lucide/vue'
import { useItemsStore } from '../stores/items'
import { useProjectsStore } from '../stores/projects'

const props = defineProps<{ taskId?: string; excludeIds?: string[]; disabled?: boolean }>()
const emit = defineEmits<{ link: [itemId: string]; create: [text: string] }>()

const items = useItemsStore()
const projects = useProjectsStore()
const query = ref('')
const focused = ref(false)

const suggestions = computed(() =>
  items.suggestions(query.value, props.taskId).filter((i) => !props.excludeIds?.includes(i.id)),
)

function usedBy(itemId: string) {
  return items
    .taskIdsOfItem(itemId)
    .map((id) => projects.task(id))
    .filter((t) => !!t)
    .map((t) => `${projects.project(t!.project_id)?.icon ?? ''} ${t!.title}`)
    .join(' · ')
}

function link(itemId: string) {
  emit('link', itemId)
  query.value = ''
}

function create() {
  if (!query.value.trim()) return
  emit('create', query.value)
  query.value = ''
}

// Laisse le temps au clic sur une suggestion d'aboutir avant de fermer la liste.
function onBlur() {
  setTimeout(() => (focused.value = false), 150)
}
</script>

<template>
  <div>
    <div class="flex items-center gap-3 px-4">
      <Plus :size="20" class="shrink-0 text-ink-soft" />
      <input
        v-model="query"
        class="h-13 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted disabled:opacity-50"
        placeholder="Ajouter un article…"
        enterkeyhint="done"
        :disabled="disabled"
        @focus="focused = true"
        @blur="onBlur"
        @keydown.enter.prevent="create"
      />
    </div>
    <div
      v-if="focused && query.trim()"
      class="mx-2 mb-2 overflow-hidden rounded-2xl border border-line bg-card shadow-lg"
    >
      <template v-if="suggestions.length">
        <p class="section-title px-3 pt-3 pb-1">Déjà à acheter</p>
        <div v-for="item in suggestions" :key="item.id" class="flex items-center gap-3 px-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="font-semibold">
              {{ item.name
              }}<span v-if="item.quantity && item.quantity > 1" class="font-normal text-ink-soft">
                ×{{ item.quantity }}</span
              >
            </p>
            <p class="text-xs text-ink-soft">{{ usedBy(item.id) }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-doing-soft px-3 text-sm font-bold text-doing"
            @mousedown.prevent
            @click="link(item.id)"
          >
            <Link :size="14" /> Relier
          </button>
        </div>
        <hr class="border-line" />
      </template>
      <button
        type="button"
        class="flex w-full items-center gap-3 px-3 py-3 text-left font-semibold"
        @mousedown.prevent
        @click="create"
      >
        <Plus :size="18" class="shrink-0" /> Créer « {{ query.trim() }} » comme nouvel article
      </button>
    </div>
  </div>
</template>
