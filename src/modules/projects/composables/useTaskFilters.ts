import { computed, reactive } from 'vue'
import { useProfilesStore } from '@/core/stores/profiles'
import { PRIORITY_RANK, type Priority, type Status, type Task } from '../types'

export type SortKey = 'created' | 'priority' | 'target'
/** id d'un profil, ou « both » pour « Nous deux ». */
export type PersonFilter = string | 'both' | null

export interface TaskFilters {
  statuses: Status[]
  priorities: Priority[]
  person: PersonFilter
  sort: SortKey
}

export const SORT_LABEL: Record<SortKey, string> = {
  created: 'Création',
  priority: 'Priorité',
  target: 'Date cible',
}

export function defaultFilters(): TaskFilters {
  return { statuses: [], priorities: [], person: null, sort: 'created' }
}

// Filtres gardés par projet le temps de la session.
const store = new Map<string, TaskFilters>()

export function filterTasks(tasks: Task[], filters: TaskFilters, allProfileIds: string[]) {
  return tasks.filter((t) => {
    if (filters.statuses.length && !filters.statuses.includes(t.status)) return false
    if (filters.priorities.length && !filters.priorities.includes(t.priority)) return false
    if (filters.person === 'both') {
      if (!allProfileIds.every((id) => t.assignee_ids.includes(id))) return false
    } else if (filters.person && !t.assignee_ids.includes(filters.person)) return false
    return true
  })
}

/** Tri stable : le statut n'intervient jamais, une tâche terminée reste à sa place. */
export function sortTasks(tasks: Task[], sort: SortKey) {
  const byCreation = (a: Task, b: Task) =>
    a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
  return [...tasks].sort((a, b) => {
    if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byCreation(a, b)
    if (sort === 'target') {
      if (a.target_date !== b.target_date) {
        if (!a.target_date) return 1
        if (!b.target_date) return -1
        return a.target_date.localeCompare(b.target_date)
      }
    }
    return byCreation(a, b)
  })
}

export function useTaskFilters(projectId: () => string, tasks: () => Task[]) {
  const profiles = useProfilesStore()

  const filters = computed(() => {
    const id = projectId()
    if (!store.has(id)) store.set(id, reactive(defaultFilters()))
    return store.get(id)!
  })

  const visible = computed(() =>
    sortTasks(filterTasks(tasks(), filters.value, profiles.allIds), filters.value.sort),
  )

  const statusCounts = computed(() => {
    const list = tasks()
    return {
      all: list.length,
      todo: list.filter((t) => t.status === 'todo').length,
      in_progress: list.filter((t) => t.status === 'in_progress').length,
      done: list.filter((t) => t.status === 'done').length,
    }
  })

  /** Libellé du bouton « Priorité, personne » quand des filtres sont actifs. */
  const activeCount = computed(() => filters.value.priorities.length + (filters.value.person ? 1 : 0))

  return { filters, visible, statusCounts, activeCount }
}
