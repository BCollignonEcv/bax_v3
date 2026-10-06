import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/core/supabase'
import { createCollection } from '@/core/collection'
import { persist, restore } from '@/core/persist'
import { onTableChange, registerSync, reportError, save } from '@/core/sync'
import { useNetworkStore } from '@/core/stores/network'
import { useToastStore } from '@/core/stores/toast'
import { displayDomain } from '@/core/url'
import { PHOTO_BUCKET, type ItemOption } from '../types'
import { compressPreview } from '../composables/imageCompression'

export type OptionInput = Pick<ItemOption, 'url' | 'label' | 'price' | 'note'>

/** Aperçu trouvé sur la page d'un lien (fonction Supabase link-preview). */
export interface LinkPreview {
  /** Miniature JPEG prête à être envoyée. */
  image: Blob | null
  price: number | null
}

/** Image d'une option : undefined = inchangée, null = retirée, Blob = nouvelle miniature. */
export type OptionImageChange = Blob | null | undefined

function base64ToBlob(base64: string, contentType: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: contentType })
}

/** Libellé affiché d'une option : son libellé, sinon le domaine de son lien. */
export function optionTitle(option: Pick<ItemOption, 'label' | 'url'>) {
  return option.label?.trim() || displayDomain(option.url)
}

/** Options d'achat (liens) des articles. Portées par l'article : partagées entre ses tâches. */
export const useOptionsStore = defineStore('options', () => {
  const options = createCollection<ItemOption>((o) => o.id!)
  /** Options masquées pendant le toast « Annuler » d'une suppression. */
  const hidden = ref(new Set<string>())

  const network = useNetworkStore()
  const toast = useToastStore()

  function option(id: string | null | undefined) {
    if (!id || hidden.value.has(id)) return undefined
    return options.get(id)
  }

  function optionsOf(itemId: string): ItemOption[] {
    return options.all.value
      .filter((o) => o.item_id === itemId && !hidden.value.has(o.id))
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  }

  // ---------- Chargement ----------

  async function fetch() {
    const { data, error } = await supabase.from('shopping_item_options').select('*')
    if (!error && data) options.replaceAll(data)
  }

  async function start() {
    const cached = await restore<ItemOption[]>('options')
    if (cached) options.replaceAll(cached)
    persist('options', () => options.all.value)
    onTableChange('shopping_item_options', options.applyChange)
    registerSync(fetch)
  }

  // ---------- Aperçu d'un lien (image et prix) ----------

  /** Lit la page du lien côté serveur ; null si indisponible (hors connexion, site bloqué…). */
  async function fetchPreview(url: string): Promise<LinkPreview | null> {
    if (!navigator.onLine) return null
    try {
      const { data, error } = await supabase.functions.invoke<{
        image: { base64: string; contentType: string } | null
        price: number | null
      }>('link-preview', { body: { url } })
      if (error || !data) return null
      let image: Blob | null = null
      if (data.image) {
        try {
          image = await compressPreview(base64ToBlob(data.image.base64, data.image.contentType))
        } catch {
          image = null // format illisible par le navigateur
        }
      }
      return { image, price: data.price }
    } catch {
      return null
    }
  }

  /** Envoie la miniature ; chemin unique à chaque envoi (pas d'ancienne image en cache). */
  async function uploadImage(optionId: string, image: Blob): Promise<string | null> {
    const path = `options/${optionId}-${crypto.randomUUID().slice(0, 8)}.jpg`
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, image, { contentType: 'image/jpeg', cacheControl: '31536000' })
    if (error) {
      reportError(error, "L'image n'a pas pu être enregistrée.")
      return null
    }
    return path
  }

  async function removeFiles(paths: (string | null | undefined)[]) {
    const list = paths.filter((p): p is string => !!p)
    if (list.length) await supabase.storage.from(PHOTO_BUCKET).remove(list)
  }

  /** Supprime les images des options de ces articles (avant leur suppression en cascade). */
  async function removeImagesOfItems(itemIds: string[]) {
    if (!itemIds.length) return
    const { data } = await supabase
      .from('shopping_item_options')
      .select('image_path')
      .in('item_id', itemIds)
      .not('image_path', 'is', null)
    await removeFiles((data ?? []).map((row) => row.image_path))
  }

  // ---------- Actions ----------

  async function addOption(
    itemId: string,
    input: OptionInput,
    image?: Blob | null,
  ): Promise<ItemOption | null> {
    if (!network.requireOnline()) return null
    const id = crypto.randomUUID()
    const position = Math.max(0, ...optionsOf(itemId).map((o) => o.position)) + 1
    const image_path = image ? await uploadImage(id, image) : null
    const { data, error } = await supabase
      .from('shopping_item_options')
      .insert({ ...input, id, item_id: itemId, position, image_path })
      .select()
      .single()
    if (error || !data) {
      await removeFiles([image_path])
      reportError(error, "L'option n'a pas pu être ajoutée.")
      return null
    }
    options.upsert(data)
    return data
  }

  async function updateOption(id: string, changes: Partial<OptionInput>, image?: OptionImageChange) {
    if (!network.requireOnline()) return false
    const previous = options.get(id)?.image_path ?? null
    const update: Partial<ItemOption> = { ...changes }
    if (image !== undefined) {
      update.image_path = image ? await uploadImage(id, image) : null
      if (image && !update.image_path) return false
    }
    options.patch(id, update)
    const ok = await save(supabase.from('shopping_item_options').update(update).eq('id', id))
    // L'ancienne image n'est supprimée qu'une fois la nouvelle enregistrée.
    if (ok && image !== undefined && previous) await removeFiles([previous])
    return ok
  }

  /** Nouvel ordre des options d'un article (glisser-déposer). */
  async function reorderOptions(ids: string[]) {
    if (!network.requireOnline()) return
    const changed = ids
      .map((id, index) => ({ id, position: index + 1 }))
      .filter(({ id, position }) => options.get(id)?.position !== position)
    changed.forEach(({ id, position }) => options.patch(id, { position }))
    await Promise.all(
      changed.map(({ id, position }) =>
        save(supabase.from('shopping_item_options').update({ position }).eq('id', id)),
      ),
    )
  }

  /** Suppression différée (toast « Annuler ») ; la base remet le choix de l'article à null. */
  function deleteOption(id: string) {
    if (!network.requireOnline()) return
    const current = options.get(id)
    if (!current) return
    hidden.value.add(id)
    toast.show({
      message: `« ${optionTitle(current)} » supprimée`,
      icon: 'trash',
      undo: () => hidden.value.delete(id),
      commit: async () => {
        const ok = await save(supabase.from('shopping_item_options').delete().eq('id', id))
        if (ok) {
          options.remove(id)
          await removeFiles([current.image_path])
        }
        hidden.value.delete(id)
      },
    })
  }

  return {
    byKey: options.byKey,
    option,
    optionsOf,
    start,
    fetchPreview,
    removeImagesOfItems,
    addOption,
    updateOption,
    reorderOptions,
    deleteOption,
  }
})
