import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/core/supabase'
import { createCollection } from '@/core/collection'
import { persist, restore } from '@/core/persist'
import { onTableChange, registerSync, reportError, save } from '@/core/sync'
import { useNetworkStore } from '@/core/stores/network'
import { useToastStore } from '@/core/stores/toast'
import type { TablesUpdate } from '@/types/database'
import { linkKey, type ShoppingItem, type TaskItemLink } from '../types'
import { useProjectsStore } from './projects'

export type ItemInput = Pick<ShoppingItem, 'name' | 'quantity' | 'price' | 'note'>

/** Pour l'autocomplétion : insensible à la casse et aux accents. */
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Articles à acheter et leurs liens avec les tâches. L'état « acheté » est porté par l'article. */
export const useItemsStore = defineStore('items', () => {
  const items = createCollection<ShoppingItem>((i) => i.id!)
  const links = createCollection<TaskItemLink>(linkKey)
  /** Liens masqués pendant le toast « Annuler » d'un retrait. */
  const hiddenLinks = ref(new Set<string>())

  const network = useNetworkStore()
  const toast = useToastStore()
  const projectsStore = useProjectsStore()

  const visibleLinks = computed(() => links.all.value.filter((l) => !hiddenLinks.value.has(linkKey(l))))

  /** Index item → ids des tâches reliées (toutes tâches, archivées comprises). */
  const taskIdsByItem = computed(() => {
    const map = new Map<string, string[]>()
    for (const link of visibleLinks.value) {
      if (!projectsStore.task(link.task_id)) continue
      const list = map.get(link.item_id) ?? []
      list.push(link.task_id)
      map.set(link.item_id, list)
    }
    return map
  })

  function item(id: string) {
    return items.get(id)
  }

  /** Articles d'une tâche, dans l'ordre d'ajout. */
  function itemsOfTask(taskId: string): ShoppingItem[] {
    return visibleLinks.value
      .filter((l) => l.task_id === taskId)
      .sort((a, b) => a.position - b.position)
      .map((l) => items.get(l.item_id))
      .filter((i): i is ShoppingItem => !!i)
  }

  function taskIdsOfItem(itemId: string) {
    return taskIdsByItem.value.get(itemId) ?? []
  }

  /** « 2/5 achetés » */
  function purchaseProgress(taskId: string) {
    const list = itemsOfTask(taskId)
    return { done: list.filter((i) => i.purchased).length, total: list.length }
  }

  function sumPrices(list: ShoppingItem[]) {
    return list.reduce((sum, i) => sum + Number(i.price ?? 0), 0)
  }

  function totalsOfTask(taskId: string) {
    const list = itemsOfTask(taskId)
    return { estimated: sumPrices(list), spent: sumPrices(list.filter((i) => i.purchased)) }
  }

  /** Articles reliés aux tâches d'un projet, chacun compté une seule fois. */
  function itemsOfProject(projectId: string) {
    const ids = new Set<string>()
    for (const task of projectsStore.allTasksOf(projectId)) {
      for (const i of itemsOfTask(task.id)) ids.add(i.id)
    }
    return [...ids].map((id) => items.get(id)!)
  }

  /** Budget : estimé = tous les articles reliés, dépensé = articles achetés. */
  function projectBudget(projectId: string) {
    const list = itemsOfProject(projectId)
    return { estimated: sumPrices(list), spent: sumPrices(list.filter((i) => i.purchased)) }
  }

  /**
   * Liste de courses d'un projet : articles non achetés reliés à au moins une tâche
   * ouverte (non terminée) et non archivée d'un projet non archivé.
   */
  function shoppingList(projectId: string) {
    const project = projectsStore.project(projectId)
    if (!project || project.archived_at) return []
    const openTasks = projectsStore.tasksOf(projectId).filter((t) => t.status !== 'done')
    const result: { item: ShoppingItem; taskIds: string[] }[] = []
    const seen = new Set<string>()
    for (const task of [...openTasks].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      for (const i of itemsOfTask(task.id)) {
        if (i.purchased || seen.has(i.id)) continue
        seen.add(i.id)
        const taskIds = taskIdsOfItem(i.id).filter((id) => projectsStore.task(id)?.project_id === projectId)
        result.push({ item: i, taskIds })
      }
    }
    return result
  }

  /** Articles non achetés existants, pour relier au lieu de créer un doublon. */
  function suggestions(query: string, excludeTaskId?: string) {
    const q = normalize(query)
    if (!q) return []
    const linked = new Set(excludeTaskId ? itemsOfTask(excludeTaskId).map((i) => i.id) : [])
    return items.all.value
      .filter((i) => !i.purchased && !linked.has(i.id) && taskIdsOfItem(i.id).length > 0)
      .filter((i) => normalize(i.name).includes(q))
      .slice(0, 5)
  }

  // ---------- Chargement ----------

  async function fetch() {
    const [i, l] = await Promise.all([
      supabase.from('shopping_items').select('*'),
      supabase.from('task_shopping_items').select('*'),
    ])
    if (!i.error && i.data) items.replaceAll(i.data)
    if (!l.error && l.data) links.replaceAll(l.data)
  }

  async function start() {
    const cached = await restore<{ items: ShoppingItem[]; links: TaskItemLink[] }>('items')
    if (cached) {
      items.replaceAll(cached.items)
      links.replaceAll(cached.links)
    }
    persist('items', () => ({ items: items.all.value, links: links.all.value }))
    onTableChange('shopping_items', items.applyChange)
    onTableChange('task_shopping_items', (payload) => {
      links.applyChange(payload)
      // Le trigger supprime l'article orphelin : on fait de même localement.
      if (payload.eventType === 'DELETE') dropIfOrphan(payload.old.item_id)
    })
    registerSync(fetch)
  }

  function dropIfOrphan(itemId: string | undefined) {
    if (itemId && !links.all.value.some((l) => l.item_id === itemId)) items.remove(itemId)
  }

  // ---------- Actions ----------

  function nextPosition(taskId: string) {
    return Math.max(0, ...links.all.value.filter((l) => l.task_id === taskId).map((l) => l.position)) + 1
  }

  async function linkItem(taskId: string, itemId: string) {
    if (!network.requireOnline()) return false
    const link = { task_id: taskId, item_id: itemId, position: nextPosition(taskId) }
    links.upsert(link)
    return save(supabase.from('task_shopping_items').insert(link))
  }

  async function createItemForTask(taskId: string, input: ItemInput): Promise<ShoppingItem | null> {
    if (!network.requireOnline()) return null
    const { data, error } = await supabase.from('shopping_items').insert(input).select().single()
    if (error || !data) {
      reportError(error, "L'article n'a pas pu être ajouté.")
      return null
    }
    items.upsert(data)
    if (!(await linkItem(taskId, data.id))) {
      await supabase.from('shopping_items').delete().eq('id', data.id)
      items.remove(data.id)
      return null
    }
    return data
  }

  async function updateItem(id: string, changes: TablesUpdate<'shopping_items'>) {
    if (!network.requireOnline()) return false
    items.patch(id, changes)
    return save(supabase.from('shopping_items').update(changes).eq('id', id))
  }

  /** Coche / décoche un article ; `withToast` pour la liste de courses (l'article en disparaît). */
  async function togglePurchased(id: string, withToast = false) {
    const current = items.get(id)
    if (!current) return
    const purchased = !current.purchased
    const ok = await updateItem(id, { purchased })
    if (ok && withToast && purchased) {
      toast.show({
        message: `« ${current.name} » acheté`,
        icon: 'check',
        undo: () => void updateItem(id, { purchased: false }),
      })
    }
  }

  /** Retire l'article de la tâche (lien seulement) ; l'article disparaît s'il n'est plus relié. */
  function unlinkItem(taskId: string, itemId: string) {
    if (!network.requireOnline()) return
    const key = linkKey({ task_id: taskId, item_id: itemId })
    const name = items.get(itemId)?.name
    hiddenLinks.value.add(key)
    toast.show({
      message: `« ${name} » retiré`,
      icon: 'trash',
      undo: () => hiddenLinks.value.delete(key),
      commit: async () => {
        const ok = await save(
          supabase.from('task_shopping_items').delete().eq('task_id', taskId).eq('item_id', itemId),
        )
        if (ok) {
          links.remove(key)
          dropIfOrphan(itemId)
        }
        hiddenLinks.value.delete(key)
      },
    })
  }

  return {
    itemsByKey: items.byKey,
    linksByKey: links.byKey,
    item,
    itemsOfTask,
    taskIdsOfItem,
    purchaseProgress,
    totalsOfTask,
    projectBudget,
    shoppingList,
    suggestions,
    start,
    linkItem,
    createItemForTask,
    updateItem,
    togglePurchased,
    unlinkItem,
  }
})
