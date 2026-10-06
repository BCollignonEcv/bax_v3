// Formats d'affichage en français

const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const moneyRound = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/**
 * « 249 € », « 8,90 € » : pas de centimes pour un montant rond.
 * `round` arrondit à l'euro (budgets des projets).
 */
export function formatMoney(value: number, round = false) {
  const whole = Math.round(value * 100) % 100 === 0
  return (round || whole ? moneyRound : money).format(value)
}

/** Date « AAAA-MM-JJ » (colonne date) → Date locale à minuit. */
export function parseDay(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function toDayString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayString() {
  return toDayString(new Date())
}

function asDate(value: string) {
  return value.length === 10 ? parseDay(value) : new Date(value)
}

/** « 10 oct. » cette année, « 14 févr. 2027 » sinon. */
export function formatShortDate(value: string) {
  const date = asDate(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** « Samedi 12 juin 2027 » */
export function formatLongDate(value: string) {
  const text = asDate(value).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return capitalize(text)
}

/** « Sam. 10 oct. » (année ajoutée si différente) */
export function formatDayDate(value: string) {
  const date = asDate(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const text = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  return capitalize(text)
}

/** « Lundi 5 octobre » */
export function formatToday() {
  return capitalize(
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  )
}

/** « aujourd'hui », « hier » ou « le 14 sept. » */
export function formatRelativeDay(value: string) {
  const day = toDayString(new Date(value))
  const today = new Date()
  if (day === toDayString(today)) return "aujourd'hui"
  today.setDate(today.getDate() - 1)
  if (day === toDayString(today)) return 'hier'
  return `le ${formatShortDate(value)}`
}

export function isOverdue(targetDate: string | null) {
  return !!targetDate && targetDate < todayString()
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Accord simple : plural(3, 'article') → « 3 articles » */
export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

/** « 12 juin 2027 » */
export function formatDate(value: string) {
  return asDate(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
