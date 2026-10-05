<script setup lang="ts">
import { computed } from 'vue'
import { Calendar, Wallet } from '@lucide/vue'
import { formatDate, formatMoney } from '@/core/format'
import EmojiTile from '@/core/components/EmojiTile.vue'
import ProgressBar from '@/core/components/ProgressBar.vue'
import { useProjectsStore } from '../stores/projects'
import { useItemsStore } from '../stores/items'
import type { Project } from '../types'

const props = defineProps<{ project: Project }>()
const projects = useProjectsStore()
const items = useItemsStore()

const progress = computed(() => projects.progress(props.project.id))
const budget = computed(() => items.projectBudget(props.project.id))
</script>

<template>
  <div class="card p-4">
    <div class="flex items-center gap-4">
      <EmojiTile :emoji="project.icon" :color="project.color" />
      <div class="min-w-0">
        <h2 class="truncate text-xl font-bold">{{ project.name }}</h2>
        <p class="text-sm text-ink-soft">
          <strong class="text-ink"
            >{{ progress.done }} {{ progress.done > 1 ? 'terminées' : 'terminée' }}</strong
          >
          sur {{ progress.total }}
        </p>
      </div>
    </div>
    <ProgressBar class="mt-4" :value="progress.done" :total="progress.total" :color="project.color" />
    <div class="mt-3 space-y-1.5 text-sm">
      <p v-if="project.target_date" class="flex items-center gap-2 font-semibold">
        <Calendar :size="15" class="text-ink-soft" />
        {{ formatDate(project.target_date) }}
      </p>
      <p v-if="budget.estimated > 0" class="flex items-center gap-2 text-ink-soft">
        <Wallet :size="15" />
        <span
          ><strong class="text-ink">{{ formatMoney(budget.spent, true) }}</strong> dépensés sur
          {{ formatMoney(budget.estimated, true) }}</span
        >
      </p>
    </div>
  </div>
</template>
