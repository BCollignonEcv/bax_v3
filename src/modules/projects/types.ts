import type { Enums, Tables } from '@/types/database'

export type Project = Tables<'projects'>
export type Task = Tables<'tasks'>
export type TaskPhoto = Tables<'task_photos'>
export type ShoppingItem = Tables<'shopping_items'>
export type TaskItemLink = Tables<'task_shopping_items'>
export type ItemOption = Tables<'shopping_item_options'>
export type Priority = Enums<'task_priority'>
export type Status = Enums<'task_status'>

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'Haute' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'low', label: 'Basse' },
]
export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
export const PRIORITY_LABEL: Record<Priority, string> = { high: 'Haute', medium: 'Moyenne', low: 'Basse' }

export const STATUSES: { value: Status; label: string }[] = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' },
]
export const STATUS_LABEL: Record<Status, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
}

export const PROJECT_COLORS = ['#B7652C', '#C2497B', '#1E8A8A', '#5B6BC0', '#5F8A3A', '#7A5AA6', '#5E554C']
export const PROJECT_EMOJIS = ['💍', '🔨', '🌴', '🏡', '🎉']

export const PROJECT_TEMPLATES = [
  { id: 'travaux', name: 'Travaux maison', icon: '🔨', color: '#B7652C' },
  { id: 'mariage', name: 'Mariage', icon: '💍', color: '#C2497B' },
  { id: 'voyage', name: 'Voyage', icon: '🌴', color: '#1E8A8A' },
]

export const PHOTO_BUCKET = 'task-photos'

export function linkKey(link: Partial<TaskItemLink>) {
  return `${link.task_id}:${link.item_id}`
}

export function thumbPath(storagePath: string) {
  return storagePath.replace(/\.jpg$/, '_thumb.jpg')
}
