/** « Chevilles Molly ×20 » ou « Chevilles x20 » → nom + quantité. */
export function parseItemName(input: string): { name: string; quantity: number | null } {
  const match = input.trim().match(/^(.*?)\s*[x×]\s*(\d+)$/i)
  if (match && match[1]) return { name: match[1].trim(), quantity: Number(match[2]) || null }
  return { name: input.trim(), quantity: null }
}

/** Saisie « 12,50 » → 12.5 ; vide → null. */
export function parsePrice(input: string | number | null): number | null {
  if (input === null || input === '') return null
  const value = typeof input === 'number' ? input : Number(input.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null
}
