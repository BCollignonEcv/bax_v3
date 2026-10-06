import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/core/supabase'
import { createCollection } from '@/core/collection'
import { persist, restore } from '@/core/persist'
import { onTableChange, registerSync, save } from '@/core/sync'
import { useNetworkStore } from '@/core/stores/network'
import { useToastStore } from '@/core/stores/toast'
import type { Status, Subtask } from '../types'
import { useProjectsStore } from './projects'

export interface SubtaskDraft {
  title: string
  done?: boolean
}

/**
 * Sous-tâches (étapes) d'une tâche, un seul niveau.
 * La validation automatique de la tâche est faite par la base (trigger subtasks_sync_task_status) ;
 * ce store ne fait que la prévoir pour un affichage immédiat et le toast « Annuler ».
 */
export const useSubtasksStore = defineStore('subtasks', () => {
  const subtasks = createCollection<Subtask>((s) => s.id!)
  /** Étapes masquées pendant le toast « Annuler » d'une suppression. */
  const hidden = ref(new Set<string>())

  const network = useNetworkStore()
  const toast = useToastStore()
  const projects = useProjectsStore()

  /** Toutes les étapes d'une tâche en base (y compris en cours de suppression). */
  function allOf(taskId: string) {
    return subtasks.all.value.filter((s) => s.task_id === taskId)
  }

  /** Étapes affichées, dans l'ordre ; les étapes cochées restent à leur place. */
  function subtasksOf(taskId: string): Subtask[] {
    return allOf(taskId)
      .filter((s) => !hidden.value.has(s.id))
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  }

  /** « 3/5 » */
  function progress(taskId: string) {
    const list = subtasksOf(taskId)
    return { done: list.filter((s) => s.done).length, total: list.length }
  }

  // ---------- Chargement ----------

  async function fetch() {
    const { data, error } = await supabase.from('task_subtasks').select('*')
    if (!error && data) subtasks.replaceAll(data)
  }

  async function start() {
    const cached = await restore<Subtask[]>('subtasks')
    if (cached) subtasks.replaceAll(cached)
    persist('subtasks', () => subtasks.all.value)
    onTableChange('task_subtasks', subtasks.applyChange)
    registerSync(fetch)
  }

  // ---------- Prévision de la règle appliquée par la base ----------

  /** Une étape non cochée ajoutée à une tâche terminée la remet « en cours ». */
  function predictReopen(taskId: string) {
    if (projects.task(taskId)?.status === 'done') projects.predictStatus(taskId, 'in_progress')
  }

  // ---------- Actions ----------

  function nextPosition(taskId: string) {
    return Math.max(0, ...allOf(taskId).map((s) => s.position)) + 1
  }

  /** Ajoute des étapes dans l'ordre (ajout rapide, formulaire, conversion de la description). */
  async function addSubtasks(taskId: string, drafts: SubtaskDraft[]) {
    const list = drafts.map((d) => ({ title: d.title.trim(), done: !!d.done })).filter((d) => d.title)
    if (!list.length || !network.requireOnline()) return false
    const now = new Date().toISOString()
    let position = nextPosition(taskId)
    const rows: Subtask[] = list.map((d) => ({
      id: crypto.randomUUID(),
      task_id: taskId,
      title: d.title,
      done: d.done,
      position: position++,
      created_by: '',
      created_at: now,
      completed_at: d.done ? now : null,
    }))
    rows.forEach((row) => subtasks.upsert(row))
    if (list.some((d) => !d.done)) predictReopen(taskId)
    const ok = await save(
      supabase
        .from('task_subtasks')
        .insert(
          rows.map(({ id, task_id, title, done, position }) => ({ id, task_id, title, done, position })),
        ),
      "L'étape n'a pas pu être ajoutée.",
    )
    if (!ok) rows.forEach((row) => subtasks.remove(row.id))
    return ok
  }

  function addSubtask(taskId: string, title: string) {
    return addSubtasks(taskId, [{ title }])
  }

  /** Coche ou décoche ; écriture seule, la base met à jour le statut de la tâche. */
  async function setDone(id: string, done: boolean) {
    const current = subtasks.get(id)
    if (!current || current.done === done) return false
    subtasks.patch(id, { done, completed_at: done ? new Date().toISOString() : null })
    const ok = await save(supabase.from('task_subtasks').update({ done }).eq('id', id))
    if (!ok) subtasks.patch(id, { done: current.done, completed_at: current.completed_at })
    return ok
  }

  /**
   * Cocher une étape démarre une tâche « À faire » ; cocher la dernière la termine (toast « Annuler ») ;
   * décocher une étape d'une tâche terminée la remet « en cours ».
   */
  async function toggle(id: string) {
    if (!network.requireOnline()) return
    const current = subtasks.get(id)
    const task = current ? projects.task(current.task_id) : undefined
    if (!current || !task) return
    const done = !current.done
    const previous: Status = task.status

    const completesTask = done && previous !== 'done' && allOf(task.id).every((s) => s.id === id || s.done)
    if (completesTask) projects.predictStatus(task.id, 'done')
    else if (done && previous === 'todo')
      projects.predictStatus(task.id, 'in_progress') // la tâche démarre
    else if (!done) predictReopen(task.id)

    const ok = await setDone(id, done)
    if (!ok) {
      projects.predictStatus(task.id, previous)
      return
    }
    if (completesTask) {
      toast.show({
        message: 'Toutes les sous-tâches sont faites. Tâche terminée.',
        icon: 'check',
        undo: () => void undoAutoComplete(id, task.id, previous),
      })
    }
  }

  /** « Annuler » : décoche la dernière étape, puis rétablit le statut d'avant la validation. */
  async function undoAutoComplete(subtaskId: string, taskId: string, previous: Status) {
    if (!network.requireOnline()) return
    predictReopen(taskId)
    if (!(await setDone(subtaskId, false))) return
    // La base a remis la tâche « en cours » ; on revient au statut d'origine s'il était autre.
    if (previous !== 'in_progress') await projects.updateTask(taskId, { status: previous })
  }

  async function rename(id: string, title: string) {
    const value = title.trim()
    const current = subtasks.get(id)
    if (!current || !value || value === current.title || !network.requireOnline()) return false
    subtasks.patch(id, { title: value })
    return save(supabase.from('task_subtasks').update({ title: value }).eq('id', id))
  }

  /** Nouvel ordre des étapes d'une tâche (glisser-déposer). */
  async function reorder(ids: string[]) {
    if (!network.requireOnline()) return
    const changed = ids
      .map((id, index) => ({ id, position: index + 1 }))
      .filter(({ id, position }) => subtasks.get(id)?.position !== position)
    changed.forEach(({ id, position }) => subtasks.patch(id, { position }))
    await Promise.all(
      changed.map(({ id, position }) =>
        save(supabase.from('task_subtasks').update({ position }).eq('id', id)),
      ),
    )
  }

  /** Suppression différée (toast « Annuler ») ; ne change jamais le statut de la tâche. */
  function remove(id: string) {
    if (!network.requireOnline()) return
    const current = subtasks.get(id)
    if (!current) return
    hidden.value.add(id)
    toast.show({
      message: 'Sous-tâche supprimée',
      icon: 'trash',
      undo: () => hidden.value.delete(id),
      commit: async () => {
        const ok = await save(supabase.from('task_subtasks').delete().eq('id', id))
        if (ok) subtasks.remove(id)
        hidden.value.delete(id)
      },
    })
  }

  return {
    byKey: subtasks.byKey,
    subtasksOf,
    progress,
    start,
    addSubtask,
    addSubtasks,
    toggle,
    rename,
    reorder,
    remove,
  }
})
