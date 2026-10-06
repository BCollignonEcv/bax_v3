/**
 * Conversion d'une description en sous-tâches.
 * Lignes de liste : « - », « * », « • », « ✓ » ou un numéro suivi de « . » ou « ) » (indentation ignorée :
 * les listes imbriquées sont aplaties). Le marqueur est retiré du texte ; « [x] » ou « ✓ » donne
 * une étape déjà cochée.
 */

export interface DescriptionLine {
  /** Numéro de la ligne dans la description d'origine. */
  index: number
  /** Ligne telle qu'écrite (affichée dans l'écran de sélection). */
  raw: string
  /** Texte de l'étape, sans marqueur ni case. */
  text: string
  /** Ligne de liste détectée (cochée par défaut dans l'écran de sélection). */
  isListItem: boolean
  /** Étape à créer déjà cochée. */
  done: boolean
}

const LIST_MARKER = /^\s*(?:[-*]\s+|[•✓✔]\s*|\d+[.)]\s+)/
/** Puce sans texte (« - » seul) : retirée lors de la conversion. */
const EMPTY_ITEM = /^\s*(?:[-*•✓✔]|\d+[.)])\s*$/
const DONE_MARK = /\[[xX]\]|✓|✔/
const CHECKBOX = /\[[ xX]?\]/g

function splitLines(description: string) {
  return description.replace(/\r\n?/g, '\n').split('\n')
}

/** Chaque ligne non vide de la description, prête à devenir une étape. */
export function analyzeDescription(description: string | null | undefined): DescriptionLine[] {
  if (!description) return []
  const result: DescriptionLine[] = []
  splitLines(description).forEach((line, index) => {
    if (!line.trim()) return
    const marker = line.match(LIST_MARKER)
    const content = marker ? line.slice(marker[0].length) : line
    const text = content.replace(CHECKBOX, ' ').replace(/[✓✔]/g, ' ').replace(/\s+/g, ' ').trim()
    if (!text) return
    result.push({ index, raw: line.trim(), text, isListItem: !!marker, done: DONE_MARK.test(line) })
  })
  return result
}

/** Affiche le lien « Transformer en sous-tâches » ? */
export function hasListLines(description: string | null | undefined) {
  return analyzeDescription(description).some((line) => line.isListItem)
}

/** Description sans les lignes converties ; le reste du texte est conservé. */
export function removeLines(description: string, indices: Iterable<number>) {
  const removed = new Set(indices)
  const kept = splitLines(description).filter((line, index) => !removed.has(index) && !EMPTY_ITEM.test(line))
  return kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // pas de grands trous laissés par les lignes retirées
    .trim()
}
