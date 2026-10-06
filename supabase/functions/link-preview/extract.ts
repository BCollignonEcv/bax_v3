// Analyse d'une page produit (sans dépendance : testable hors Deno).

// ---------- Sécurité : uniquement des adresses web publiques ----------

export function isPublicUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return null
  }
  // Adresses IP littérales privées, locales ou réservées
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 10 || a === 127 || a === 0 || a >= 224) return null
    if (a === 169 && b === 254) return null
    if (a === 172 && b >= 16 && b <= 31) return null
    if (a === 192 && b === 168) return null
    if (a === 100 && b >= 64 && b <= 127) return null
  }
  if (host.includes(':')) return null // IPv6 littérale : refusée par simplicité
  return url
}

// ---------- Lecture de la page ----------

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;|&#47;/g, '/')
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1]!.toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '')
  }
  return attrs
}

/** « 1 299,90 », « 1299.90 », « 249 » → nombre ; null sinon. */
export function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null
  if (typeof value !== 'string') return null
  let text = value.replace(/[^\d.,]/g, '')
  if (!text) return null
  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.')
  else text = text.replace(/,/g, '')
  const price = Number(text)
  return Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null
}

export interface Found {
  image: string | null
  price: number | null
}

/** Données produit schema.org (JSON-LD), y compris dans @graph ou des tableaux. */
function fromJsonLd(html: string): Found {
  const found: Found = { image: null, price: null }
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(visit)
    const obj = node as Record<string, unknown>
    const type = obj['@type']
    const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'))
    if (isProduct) {
      if (!found.image) {
        const image = Array.isArray(obj.image) ? obj.image[0] : obj.image
        found.image =
          typeof image === 'string'
            ? image
            : image && typeof image === 'object'
              ? (((image as Record<string, unknown>).url as string) ?? null)
              : null
      }
      if (found.price == null) {
        const offers = Array.isArray(obj.offers) ? obj.offers : obj.offers ? [obj.offers] : []
        for (const offer of offers as Record<string, unknown>[]) {
          const currency = offer.priceCurrency
          if (currency && currency !== 'EUR') continue
          const price = parsePrice(offer.price ?? offer.lowPrice)
          if (price != null) {
            found.price = price
            break
          }
        }
      }
    }
    Object.values(obj).forEach(visit)
  }
  for (const match of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(match[1]!))
    } catch {
      // JSON invalide : on ignore ce bloc
    }
  }
  return found
}

/**
 * Secours pour Amazon, dont les pages produit n'ont ni balises og: ni données JSON-LD :
 * image principale (data-a-hires / data-old-hires / data-a-dynamic-image) et prix de l'offre.
 */
function fromAmazon(html: string): Found {
  // Image principale uniquement (la page contient aussi des vignettes d'autres produits).
  const tag = html.match(/<img\b[^>]*\bid="(?:main-image|landingImage)"[^>]*>/)?.[0]
  const attrs = tag ? parseAttributes(tag) : {}
  let dynamic: string | null = null
  try {
    dynamic = Object.keys(JSON.parse(attrs['data-a-dynamic-image'] ?? '{}'))[0] ?? null
  } catch {
    dynamic = null
  }
  const hires = attrs['data-a-hires'] || attrs['data-old-hires'] || dynamic || null
  const price =
    parsePrice(html.match(/twister-plus-price-data-price"[^>]*value="([\d.,]+)"/)?.[1]) ??
    parsePrice(html.match(/"priceAmount":(\d+(?:\.\d+)?)/)?.[1])
  return { image: hires, price }
}

export function extract(html: string): Found {
  const meta: Record<string, string> = {}
  const itemprop: Record<string, string> = {}
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0])
    const key = (attrs.property ?? attrs.name)?.toLowerCase()
    if (key && attrs.content && !(key in meta)) meta[key] = attrs.content
    if (attrs.itemprop && (attrs.content ?? '') !== '' && !(attrs.itemprop in itemprop)) {
      itemprop[attrs.itemprop] = attrs.content!
    }
  }
  let imageSrc: string | null = null
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0])
    if (attrs.rel?.toLowerCase() === 'image_src' && attrs.href) imageSrc = attrs.href
  }
  const ld = fromJsonLd(html)
  const amazon = fromAmazon(html)

  const image =
    meta['og:image:secure_url'] ??
    meta['og:image'] ??
    meta['twitter:image'] ??
    ld.image ??
    imageSrc ??
    amazon.image ??
    null

  const currency = meta['product:price:currency'] ?? meta['og:price:currency']
  const metaPrice =
    !currency || currency.toUpperCase() === 'EUR'
      ? parsePrice(meta['product:price:amount'] ?? meta['og:price:amount'])
      : null
  const itempropPrice =
    !itemprop.priceCurrency || itemprop.priceCurrency === 'EUR' ? parsePrice(itemprop.price) : null

  return { image, price: metaPrice ?? ld.price ?? itempropPrice ?? amazon.price }
}

