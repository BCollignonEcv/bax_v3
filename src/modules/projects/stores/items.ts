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
import { useOptionsStore } from './options'
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
  const optionsStore = useOptionsStore()

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

  // ---------- Prix ----------

  /** Option retenue (ignorée si elle est en cours de suppression). */
  function chosenOption(item: ShoppingItem) {
    return optionsStore.option(item.chosen_option_id)
  }

  /** Image de l'option retenue d'un article (vignette des listes), ou null. */
  function chosenImagePath(itemId: string) {
    const current = items.get(itemId)
    return current ? (chosenOption(current)?.image_path ?? null) : null
  }

  /** « N options » et fourchette de prix des options d'un article. */
  function optionsSummary(itemId: string) {
    const list = optionsStore.optionsOf(itemId)
    const prices = list.flatMap((o) => (o.price != null ? [Number(o.price)] : []))
    return {
      count: list.length,
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
    }
  }

  /**
   * Prix affiché : celui de l'option retenue, sinon le prix propre de l'article,
   * sinon l'option la moins chère (« à partir de »).
   */
  function displayPrice(item: ShoppingItem): { amount: number | null; from: boolean } {
    const chosen = chosenOption(item)
    if (chosen?.price != null) return { amount: Number(chosen.price), from: false }
    if (item.price != null) return { amount: Number(item.price), from: false }
    const { min } = optionsSummary(item.id)
    return { amount: min, from: min != null }
  }

  /**
   * Prix compté dans les totaux (budget, liste de courses) : même règle, mais un article
   * sans option retenue ni prix propre compte pour son option la plus chère.
   */
  function budgetPrice(item: ShoppingItem): number {
    const chosen = chosenOption(item)
    if (chosen?.price != null) return Number(chosen.price)
    if (item.price != null) return Number(item.price)
    return optionsSummary(item.id).max ?? 0
  }

  function sumPrices(list: ShoppingItem[]) {
    return list.reduce((sum, i) => sum + budgetPrice(i), 0)
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

  /** Retient une option (ou annule le choix avec null). */
  function chooseOption(itemId: string, optionId: string | null) {
    return updateItem(itemId, { chosen_option_id: optionId })
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
        // Dernier lien : l'article et ses options seront supprimés en cascade, avec leurs images.
        const lastLink = !links.all.value.some((l) => l.item_id === itemId && l.task_id !== taskId)
        if (lastLink) await optionsStore.removeImagesOfItems([itemId])
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

  /** Avant de supprimer des tâches : images des options des articles qui n'auront plus de tâche. */
  async function removeOptionImagesForTasks(taskIds: string[]) {
    const deleted = new Set(taskIds)
    const itemIds = new Set(links.all.value.filter((l) => deleted.has(l.task_id)).map((l) => l.item_id))
    const orphans = [...itemIds].filter((itemId) =>
      links.all.value.every((l) => l.item_id !== itemId || deleted.has(l.task_id)),
    )
    await optionsStore.removeImagesOfItems(orphans)
  }

  return {
    itemsByKey: items.byKey,
    linksByKey: links.byKey,
    item,
    chosenOption,
    chosenImagePath,
    optionsSummary,
    displayPrice,
    budgetPrice,
    sumPrices,
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
    chooseOption,
    unlinkItem,
    removeOptionImagesForTasks,
  }
})
