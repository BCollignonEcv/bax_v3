/** Adresse web valide (http ou https uniquement), normalisée ; null sinon. */
export function parseWebUrl(text: string): string | null {
  const value = text.trim()
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.href
  } catch {
    return null
  }
}

/** « https://www.boulanger.com/ref/1187342 » → « boulanger.com » */
export function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return url
  }
}

export type TextPart = { type: 'text'; value: string } | { type: 'link'; value: string; href: string }

// http(s)://… ou www.… ; la ponctuation finale est retirée ensuite.
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi
const TRAILING = /[.,;:!?»"')\]]+$/

/** Découpe un texte en morceaux texte / lien, sans jamais produire de HTML. */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    let raw = match[0]
    // Garde une parenthèse fermante si elle est équilibrée dans l'URL (ex. Wikipédia).
    const trailing = raw.match(TRAILING)?.[0] ?? ''
    let keep = trailing
    if (trailing.startsWith(')') && (raw.match(/\(/g)?.length ?? 0) >= (raw.match(/\)/g)?.length ?? 0)) {
      keep = trailing.slice(1)
    }
    raw = raw.slice(0, raw.length - keep.length)
    const href = parseWebUrl(/^www\./i.test(raw) ? `https://${raw}` : raw)
    if (!href) continue
    const start = match.index
    if (start > last) parts.push({ type: 'text', value: text.slice(last, start) })
    parts.push({ type: 'link', value: displayDomain(href), href })
    last = start + raw.length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  return parts
}
