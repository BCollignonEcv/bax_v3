const MAX_SIDE = 1600
const THUMB_SIDE = 400
const QUALITY = 0.8

/**
 * Décode l'image en respectant l'orientation EXIF.
 * Safari décode les HEIC des iPhone : la conversion en JPEG se fait au passage.
 */
async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Repli : les navigateurs récents appliquent aussi l'orientation EXIF aux <img>.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function render(
  source: ImageBitmap | HTMLImageElement,
  maxSide: number,
  quality: number,
  background?: string,
): Promise<Blob> {
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  // Le JPEG n'a pas de transparence : fond uni pour les images PNG / WebP détourées.
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob'))), 'image/jpeg', quality),
  )
}

/** Photo redimensionnée (1600 px max, JPEG 0,8) et sa miniature pour les listes. */
export async function compressPhoto(file: Blob): Promise<{ full: Blob; thumb: Blob }> {
  const source = await decode(file)
  try {
    const full = await render(source, MAX_SIDE, QUALITY)
    const thumb = await render(source, THUMB_SIDE, 0.75)
    return { full, thumb }
  } finally {
    if ('close' in source) source.close()
  }
}

/** Image d'aperçu d'une option (PNG, WebP ou JPEG) → miniature JPEG 400 px sur fond blanc. */
export async function compressPreview(image: Blob): Promise<Blob> {
  const source = await decode(image)
  try {
    return await render(source, THUMB_SIDE, 0.82, '#ffffff')
  } finally {
    if ('close' in source) source.close()
  }
}
