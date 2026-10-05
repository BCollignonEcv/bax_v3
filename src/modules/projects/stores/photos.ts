import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/core/supabase'
import { createCollection } from '@/core/collection'
import { persist, restore } from '@/core/persist'
import { onTableChange, registerSync, reportError, save } from '@/core/sync'
import { useNetworkStore } from '@/core/stores/network'
import { useToastStore } from '@/core/stores/toast'
import { PHOTO_BUCKET, thumbPath, type TaskPhoto } from '../types'
import { compressPhoto } from '../composables/imageCompression'

interface SignedUrl {
  url: string
  expiresAt: number
}

export interface PendingUpload {
  id: string
  taskId: string
  preview: string
  progress: number
}

const URL_LIFETIME = 7 * 24 * 3600 // secondes
const REFRESH_MARGIN = 3600 * 1000

/** Envoi direct à l'API Storage pour suivre la progression (non exposée par supabase-js). */
function uploadWithProgress(path: string, blob: Blob, token: string, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    xhr.setRequestHeader('Content-Type', 'image/jpeg')
    xhr.setRequestHeader('Cache-Control', 'max-age=31536000')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (event) => onProgress(event.loaded)
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText)))
    xhr.onerror = () => reject(new Error('network'))
    xhr.send(blob)
  })
}

export const usePhotosStore = defineStore('photos', () => {
  const photos = createCollection<TaskPhoto>((p) => p.id!)
  const hidden = ref(new Set<string>())
  const signed = ref<Record<string, SignedUrl>>({})
  const uploads = ref<PendingUpload[]>([])

  const network = useNetworkStore()
  const toast = useToastStore()

  function photosOf(taskId: string) {
    return photos.all.value
      .filter((p) => p.task_id === taskId && !hidden.value.has(p.id))
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  }

  function countOf(taskId: string) {
    return photosOf(taskId).length
  }

  function uploadsOf(taskId: string) {
    return uploads.value.filter((u) => u.taskId === taskId)
  }

  // ---------- URL signées (regroupées en un seul appel) ----------

  const queue = new Set<string>()
  let flushTimer: ReturnType<typeof setTimeout> | undefined

  function url(path: string): string | undefined {
    const entry = signed.value[path]
    if (!entry || entry.expiresAt < Date.now() + REFRESH_MARGIN) {
      queue.add(path)
      clearTimeout(flushTimer)
      flushTimer = setTimeout(flushQueue, 20)
    }
    return entry?.url
  }

  async function flushQueue() {
    if (!queue.size || !navigator.onLine) return
    const paths = [...queue]
    queue.clear()
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, URL_LIFETIME)
    const expiresAt = Date.now() + URL_LIFETIME * 1000
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signed.value[item.path] = { url: item.signedUrl, expiresAt }
    }
  }

  // ---------- Chargement ----------

  async function fetch() {
    const { data, error } = await supabase.from('task_photos').select('*')
    if (!error && data) photos.replaceAll(data)
  }

  async function start() {
    const cached = await restore<{ photos: TaskPhoto[]; signed: Record<string, SignedUrl> }>('photos')
    if (cached) {
      photos.replaceAll(cached.photos)
      signed.value = cached.signed
    }
    persist('photos', () => ({ photos: photos.all.value, signed: signed.value }))
    onTableChange('task_photos', photos.applyChange)
    registerSync(fetch)
  }

  // ---------- Actions ----------

  async function addPhotos(taskId: string, files: File[]) {
    if (!network.requireOnline() || !files.length) return
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    let position = Math.max(0, ...photosOf(taskId).map((p) => p.position))
    const pending = files.map((file) => ({
      file,
      upload: { id: crypto.randomUUID(), taskId, preview: URL.createObjectURL(file), progress: 0 },
    }))
    uploads.value.push(...pending.map((p) => p.upload))

    // Une photo à la fois : plus fiable sur une connexion mobile.
    for (const { file, upload } of pending) {
      const entry = () => uploads.value.find((u) => u.id === upload.id)
      try {
        const { full, thumb } = await compressPhoto(file)
        const path = `${taskId}/${upload.id}.jpg`
        const total = full.size + thumb.size
        await uploadWithProgress(thumbPath(path), thumb, token, (loaded) => {
          entry()!.progress = loaded / total
        })
        await uploadWithProgress(path, full, token, (loaded) => {
          entry()!.progress = (thumb.size + loaded) / total
        })
        position += 1
        const { data: row, error } = await supabase
          .from('task_photos')
          .insert({ id: upload.id, task_id: taskId, storage_path: path, position })
          .select()
          .single()
        if (error) throw error
        photos.upsert(row)
      } catch (error) {
        reportError(error, "Une photo n'a pas pu être envoyée.")
      } finally {
        URL.revokeObjectURL(upload.preview)
        uploads.value = uploads.value.filter((u) => u.id !== upload.id)
      }
    }
  }

  async function updateCaption(id: string, caption: string | null) {
    if (!network.requireOnline()) return
    photos.patch(id, { caption })
    await save(supabase.from('task_photos').update({ caption }).eq('id', id))
  }

  function deletePhoto(id: string) {
    if (!network.requireOnline()) return
    const photo = photos.get(id)
    if (!photo) return
    hidden.value.add(id)
    toast.show({
      message: 'Photo supprimée',
      icon: 'trash',
      undo: () => hidden.value.delete(id),
      commit: async () => {
        await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path, thumbPath(photo.storage_path)])
        const ok = await save(supabase.from('task_photos').delete().eq('id', id))
        if (ok) photos.remove(id)
        hidden.value.delete(id)
      },
    })
  }

  /** Supprime du Storage les fichiers des tâches indiquées (avant suppression des tâches). */
  async function removeFilesForTasks(taskIds: string[]) {
    if (!taskIds.length) return
    const { data } = await supabase.from('task_photos').select('id, storage_path').in('task_id', taskIds)
    const rows = data ?? []
    const paths = rows.flatMap((row) => [row.storage_path, thumbPath(row.storage_path)])
    if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths)
    rows.forEach((row) => photos.remove(row.id))
  }

  return {
    byKey: photos.byKey,
    uploads,
    photosOf,
    countOf,
    uploadsOf,
    url,
    start,
    addPhotos,
    updateCaption,
    deletePhoto,
    removeFilesForTasks,
  }
})
