// BAX — aperçu d'un lien : image et prix d'une page produit.
// Le navigateur ne peut pas lire une page d'un autre site (CORS) : cette fonction le fait.
// Déploiement : npx supabase functions deploy link-preview --no-verify-jwt
// (l'utilisateur est vérifié ci-dessous, ce qui fonctionne aussi avec les nouvelles clés API).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'
import { extract, isPublicUrl } from './extract.ts'

const PAGE_TIMEOUT = 8000
const MAX_PAGE_BYTES = 1_500_000
const MAX_IMAGE_BYTES = 2_000_000
const MAX_REDIRECTS = 5
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** fetch qui vérifie chaque redirection (pas de rebond vers une adresse privée). */
async function safeFetch(raw: string, accept: string): Promise<Response | null> {
  let current = raw
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const url = isPublicUrl(current)
    if (!url) return null
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(PAGE_TIMEOUT),
      headers: { ...BROWSER_HEADERS, Accept: accept },
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location) return null
      current = new URL(location, url).href
      continue
    }
    return response.ok ? response : null
  }
  return null
}

/** Lit au plus `limit` octets ; `truncate` : garder le début (page HTML) plutôt que tout refuser (image). */
async function readLimited(response: Response, limit: number, truncate = false): Promise<Uint8Array | null> {
  const reader = response.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      // Une page tronquée suffit souvent (les balises sont dans <head>) ; une image tronquée, non.
      if (!truncate) return null
      break
    }
    chunks.push(value)
  }
  const out = new Uint8Array(Math.min(size, limit))
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk.subarray(0, out.length - offset), offset)
    offset += chunk.byteLength
    if (offset >= out.length) break
  }
  return out
}

// ---------- Lecture de la page et des images ----------

async function readPage(url: string) {
  try {
    const page = await safeFetch(url, 'text/html,application/xhtml+xml')
    if (!page) return null
    const bytes = await readLimited(page, MAX_PAGE_BYTES, true)
    const html = bytes ? new TextDecoder().decode(bytes) : ''
    return {
      found: extract(html),
      base: page.url || url,
      bytes: bytes?.length ?? 0,
      antiRobot: /captcha|api-services-support@amazon|datadome|just a moment/i.test(html.slice(0, 20000)),
    }
  } catch (error) {
    console.error('link-preview page', url, error)
    return null
  }
}

async function fetchImage(imageUrl: string): Promise<{ base64: string; contentType: string } | null> {
  try {
    const response = await safeFetch(imageUrl, 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.5')
    const contentType = response?.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
    if (!response || !IMAGE_TYPES.includes(contentType)) {
      await response?.body?.cancel()
      return null
    }
    const data = await readLimited(response, MAX_IMAGE_BYTES)
    return data ? { base64: encodeBase64(data), contentType } : null
  } catch {
    return null
  }
}

/**
 * Service gratuit d'aperçu de liens (sans clé, ~50 appels par jour) : il passe là où la lecture
 * directe est bloquée par certains sites. Il ne reçoit que l'adresse publique du produit.
 */
async function microlinkImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(10000),
    })
    const body = await response.json()
    const image = body?.status === 'success' ? body.data?.image?.url : null
    return typeof image === 'string' && isPublicUrl(image) ? image : null
  } catch {
    return null
  }
}

// ---------- Point d'entrée ----------

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method' }, 405)

  // Réservé aux utilisateurs connectés de BAX
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'auth' }, 401)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return json({ error: 'auth' }, 401)

  let url: string
  try {
    url = String((await request.json()).url ?? '')
  } catch {
    return json({ error: 'body' }, 400)
  }
  if (!isPublicUrl(url)) return json({ error: 'url' }, 400)

  // 1. Lecture directe de la page (image et prix)
  const page = await readPage(url)
  const price = page?.found.price ?? null
  let image = page?.found.image ? await fetchImage(new URL(page.found.image, page.base).href) : null
  let source = image ? 'page' : null

  // 2. Secours sans prix : Microlink, quand le site bloque la lecture directe (Amazon notamment).
  if (!image) {
    const fallback = await microlinkImage(url)
    if (fallback) image = await fetchImage(fallback)
    if (image) source = 'microlink'
  }

  // Diagnostic visible dans Supabase > Edge Functions > link-preview > Logs
  console.log(
    JSON.stringify({
      host: new URL(url).hostname,
      bytes: page?.bytes ?? 0,
      antiRobot: page?.antiRobot ?? null,
      image: source,
      price,
    }),
  )
  return json({ image, price })
})
