import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/core/supabase'
import { createCollection } from '@/core/collection'
import { persist, restore } from '@/core/persist'
import { onTableChange, registerSync, reportError, save } from '@/core/sync'
import { useNetworkStore } from '@/core/stores/network'
import { useToastStore } from '@/core/stores/toast'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { Project, Status, Task } from '../types'
import { usePhotosStore } from './photos'
import { useItemsStore } from './items'

type ProjectInput = Pick<Project, 'name' | 'icon' | 'color' | 'target_date' | 'description'>

/** Projets et tâches. */
export const useProjectsStore = defineStore('projects', () => {
  const projects = createCollection<Project>((p) => p.id!)
  const tasks = createCollection<Task>((t) => t.id!)
  /** Éléments masqués pendant le toast « Annuler » d'une suppression. */
  const hidden = ref(new Set<string>())
  /** Vrai dès que des données (cache local ou serveur) sont disponibles. */
  const loaded = ref(false)

  const network = useNetworkStore()
  const toast = useToastStore()

  const visibleProjects = computed(() => projects.all.value.filter((p) => !hidden.value.has(p.id)))
  const visibleTasks = computed(() => tasks.all.value.filter((t) => !hidden.value.has(t.id)))

  const activeProjects = computed(() =>
    visibleProjects.value
      .filter((p) => !p.archived_at)
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)),
  )
  const archivedProjects = computed(() =>
    visibleProjects.value
      .filter((p) => p.archived_at)
      .sort((a, b) => b.archived_at!.localeCompare(a.archived_at!)),
  )

  function project(id: string) {
    const p = projects.get(id)
    return p && !hidden.value.has(p.id) ? p : undefined
  }

  function task(id: string) {
    const t = tasks.get(id)
    return t && !hidden.value.has(t.id) ? t : undefined
  }

  /** Toutes les tâches du projet, archivées comprises. */
  function allTasksOf(projectId: string) {
    return visibleTasks.value.filter((t) => t.project_id === projectId)
  }

  /** Tâches affichées dans la liste du projet : non archivées, terminées comprises. */
  function tasksOf(projectId: string) {
    return allTasksOf(projectId).filter((t) => !t.archived_at)
  }

  function archivedTasksOf(projectId: string) {
    return allTasksOf(projectId)
      .filter((t) => t.archived_at)
      .sort((a, b) => b.archived_at!.localeCompare(a.archived_at!))
  }

  function progress(projectId: string) {
    const list = tasksOf(projectId)
    return { done: list.filter((t) => t.status === 'done').length, total: list.length }
  }

  // ---------- Chargement ----------

  async function fetch() {
    const [p, t] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('tasks').select('*'),
    ])
    if (!p.error && p.data) projects.replaceAll(p.data)
    if (!t.error && t.data) tasks.replaceAll(t.data)
    if (!p.error && !t.error) loaded.value = true
  }

  async function start() {
    const cached = await restore<{ projects: Project[]; tasks: Task[] }>('projects')
    if (cached) {
      projects.replaceAll(cached.projects)
      tasks.replaceAll(cached.tasks)
      loaded.value = true
    }
    persist('projects', () => ({ projects: projects.all.value, tasks: tasks.all.value }))
    onTableChange('projects', projects.applyChange)
    onTableChange('tasks', tasks.applyChange)
    registerSync(fetch)
  }

  // ---------- Projets ----------

  async function createProject(input: ProjectInput): Promise<string | null> {
    if (!network.requireOnline()) return null
    const position = Math.max(0, ...activeProjects.value.map((p) => p.position)) + 1
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...input, position })
      .select()
      .single()
    if (error || !data) {
      reportError(error, "Le projet n'a pas pu être créé.")
      return null
    }
    projects.upsert(data)
    return data.id
  }

  async function updateProject(id: string, changes: TablesUpdate<'projects'>) {
    if (!network.requireOnline()) return false
    projects.patch(id, changes)
    return save(supabase.from('projects').update(changes).eq('id', id))
  }

  async function archiveProject(id: string) {
    const ok = await updateProject(id, { archived_at: new Date().toISOString() })
    if (ok) {
      toast.show({ message: 'Projet archivé', icon: 'archive', undo: () => void restoreProject(id) })
    }
    return ok
  }

  function restoreProject(id: string) {
    return updateProject(id, { archived_at: null })
  }

  function deleteProject(id: string) {
    if (!network.requireOnline()) return false
    const name = projects.get(id)?.name
    hidden.value.add(id)
    toast.show({
      message: `« ${name} » supprimé`,
      icon: 'trash',
      undo: () => hidden.value.delete(id),
      commit: async () => {
        const taskIds = tasks.all.value.filter((t) => t.project_id === id).map((t) => t.id)
        await usePhotosStore().removeFilesForTasks(taskIds)
        await useItemsStore().removeOptionImagesForTasks(taskIds)
        const ok = await save(supabase.from('projects').delete().eq('id', id))
        if (ok) {
          taskIds.forEach((taskId) => tasks.remove(taskId))
          projects.remove(id)
        }
        hidden.value.delete(id)
      },
    })
    return true
  }

  async function reorderProjects(ids: string[]) {
    if (!network.requireOnline()) return
    ids.forEach((id, index) => projects.patch(id, { position: index + 1 }))
    await save(supabase.rpc('reorder_projects', { ids }))
  }

  // ---------- Tâches ----------

  async function createTask(input: TablesInsert<'tasks'>): Promise<Task | null> {
    if (!network.requireOnline()) return null
    const { data, error } = await supabase.from('tasks').insert(input).select().single()
    if (error || !data) {
      reportError(error, "La tâche n'a pas pu être créée.")
      return null
    }
    tasks.upsert(data)
    return data
  }

  async function updateTask(id: string, changes: TablesUpdate<'tasks'>) {
    if (!network.requireOnline()) return false
    const local = { ...changes }
    if (changes.status) {
      local.completed_at =
        changes.status === 'done' ? (tasks.get(id)?.completed_at ?? new Date().toISOString()) : null
    }
    tasks.patch(id, local)
    return save(supabase.from('tasks').update(changes).eq('id', id))
  }

  /**
   * Statut prévu localement, sans écriture : la base l'applique elle-même (trigger des
   * sous-tâches) et Realtime confirme. Sert à un affichage immédiat.
   */
  function predictStatus(id: string, status: Status) {
    const current = tasks.get(id)
    if (!current || current.status === status) return
    tasks.patch(id, {
      status,
      completed_at: status === 'done' ? (current.completed_at ?? new Date().toISOString()) : null,
    })
  }

  /** Change le statut ; le passage à « Terminé » affiche le toast « Annuler ». */
  async function setStatus(id: string, status: Status) {
    const current = tasks.get(id)
    if (!current || current.status === status) return
    const previous = current.status
    const ok = await updateTask(id, { status })
    if (ok && status === 'done') {
      toast.show({
        message: `« ${current.title} » terminée`,
        icon: 'check',
        undo: () => void updateTask(id, { status: previous }),
      })
    }
  }

  /** Coche / décoche depuis la liste. */
  function toggleDone(id: string) {
    const current = tasks.get(id)
    if (!current) return
    return setStatus(id, current.status === 'done' ? 'todo' : 'done')
  }

  async function archiveTask(id: string) {
    const ok = await updateTask(id, { archived_at: new Date().toISOString() })
    if (ok) toast.show({ message: 'Tâche archivée', icon: 'archive', undo: () => void restoreTask(id) })
    return ok
  }

  function restoreTask(id: string) {
    return updateTask(id, { archived_at: null })
  }

  async function archiveDoneTasks(projectId: string) {
    if (!network.requireOnline()) return
    const ids = tasksOf(projectId)
      .filter((t) => t.status === 'done')
      .map((t) => t.id)
    if (!ids.length) return
    const archivedAt = new Date().toISOString()
    ids.forEach((id) => tasks.patch(id, { archived_at: archivedAt }))
    const ok = await save(supabase.from('tasks').update({ archived_at: archivedAt }).in('id', ids))
    if (!ok) return
    toast.show({
      message: ids.length > 1 ? `${ids.length} tâches archivées` : '1 tâche archivée',
      icon: 'archive',
      undo: () => {
        if (!network.requireOnline()) return
        ids.forEach((id) => tasks.patch(id, { archived_at: null }))
        void save(supabase.from('tasks').update({ archived_at: null }).in('id', ids))
      },
    })
  }

  function deleteTask(id: string) {
    if (!network.requireOnline()) return false
    const title = tasks.get(id)?.title
    hidden.value.add(id)
    toast.show({
      message: `« ${title} » supprimée`,
      icon: 'trash',
      undo: () => hidden.value.delete(id),
      commit: async () => {
        await usePhotosStore().removeFilesForTasks([id])
        await useItemsStore().removeOptionImagesForTasks([id])
        const ok = await save(supabase.from('tasks').delete().eq('id', id))
        if (ok) tasks.remove(id)
        hidden.value.delete(id)
      },
    })
    return true
  }

  return {
    projectsByKey: projects.byKey,
    tasksByKey: tasks.byKey,
    loaded,
    activeProjects,
    archivedProjects,
    project,
    task,
    allTasksOf,
    tasksOf,
    archivedTasksOf,
    progress,
    start,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    reorderProjects,
    createTask,
    updateTask,
    setStatus,
    predictStatus,
    toggleDone,
    archiveTask,
    restoreTask,
    archiveDoneTasks,
    deleteTask,
  }
})
