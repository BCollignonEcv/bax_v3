import { onBeforeUnmount, reactive, useTemplateRef } from 'vue'

interface Options {
  /** Nom de la référence de template posée sur chaque élément (ref="…" dans le v-for). */
  refKey: string
  /** Identifiants des éléments, dans l'ordre affiché. */
  ids: () => string[]
  /** Appelé avec le nouvel ordre quand un élément a changé de place. */
  onReorder: (ids: string[]) => void
  /** Autorise le début du glissement (ex. : bloqué hors connexion). */
  canStart?: () => boolean
  /**
   * Délai d'appui avant le glissement (ms). 380 par défaut (appui long sur toute la carte) ;
   * 0 pour une poignée dédiée, qui démarre le glissement immédiatement.
   */
  delay?: number
}

/**
 * Réorganisation d'une liste verticale : appui long puis glisser (ou poignée, avec delay: 0).
 * Le DOM ne bouge pas pendant le glissement ; les éléments sont décalés par translation.
 */
export function useDragReorder({ refKey, ids, onReorder, canStart, delay = 380 }: Options) {
  const elements = useTemplateRef<HTMLElement[]>(refKey)
  /**
   * settling : vrai pendant l'image qui suit le lâcher. Les éléments doivent alors couper leur
   * transition, sinon le retour du décalage à 0 s'anime alors qu'ils sont déjà à leur nouvelle
   * place (petit saut visible).
   */
  const drag = reactive({ id: null as string | null, from: 0, to: 0, dy: 0, settling: false })
  let rects: DOMRect[] = []
  let gap = 12
  let timer: ReturnType<typeof setTimeout> | undefined
  let startX = 0
  let startY = 0
  let suppressClick = false
  let suppressTimer: ReturnType<typeof setTimeout> | undefined

  function preventScroll(event: TouchEvent) {
    event.preventDefault()
  }

  function onPointerDown(event: PointerEvent, index: number) {
    suppressClick = false // nouvel appui : le blocage d'un glissement précédent ne s'applique plus
    startX = event.clientX
    startY = event.clientY
    const target = event.currentTarget as HTMLElement
    const pointerId = event.pointerId
    clearTimeout(timer)
    if (delay === 0) {
      event.preventDefault() // poignée : pas de sélection de texte ni de défilement
      begin(index, target, pointerId)
    } else {
      timer = setTimeout(() => begin(index, target, pointerId), delay)
    }
  }

  function begin(index: number, target: HTMLElement, pointerId: number) {
    if (canStart && !canStart()) return
    // Les références d'un v-for ne suivent pas forcément l'ordre affiché après un réordonnancement :
    // on trie par position à l'écran pour que rects[i] corresponde bien à l'élément d'indice i.
    rects = (elements.value ?? []).map((el) => el.getBoundingClientRect()).sort((a, b) => a.top - b.top)
    gap = rects.length > 1 ? rects[1]!.top - rects[0]!.bottom : 12
    Object.assign(drag, { id: ids()[index]!, from: index, to: index, dy: 0 })
    target.setPointerCapture?.(pointerId)
    document.addEventListener('touchmove', preventScroll, { passive: false })
    navigator.vibrate?.(10)
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag.id) {
      if (Math.abs(event.clientX - startX) > 8 || Math.abs(event.clientY - startY) > 8) clearTimeout(timer)
      return
    }
    drag.dy = event.clientY - startY
    const from = rects[drag.from]!
    // Un voisin s'écarte dès qu'il est recouvert à moitié (bord de l'élément déplacé
    // au-delà de son milieu) : sinon il disparaît dessous puis tout saute d'un coup.
    const top = from.top + drag.dy
    const bottom = from.bottom + drag.dy
    let to = drag.from
    for (let j = drag.from + 1; j < rects.length; j++) {
      if (bottom > rects[j]!.top + rects[j]!.height / 2) to = j
    }
    for (let j = drag.from - 1; j >= 0; j--) {
      if (top < rects[j]!.top + rects[j]!.height / 2) to = j
    }
    drag.to = to
  }

  function onPointerUp() {
    clearTimeout(timer)
    if (!drag.id) return
    // Au doigt, le clic de fin de glissement n'arrive pas toujours : le blocage expire vite,
    // sinon il avalerait le toucher suivant.
    suppressClick = true
    clearTimeout(suppressTimer)
    suppressTimer = setTimeout(() => (suppressClick = false), 400)
    document.removeEventListener('touchmove', preventScroll)
    if (drag.from !== drag.to) {
      const next = [...ids()]
      const [moved] = next.splice(drag.from, 1)
      next.splice(drag.to, 0, moved!)
      onReorder(next)
    }
    Object.assign(drag, { id: null, from: 0, to: 0, dy: 0, settling: true })
    // Deux images : le nouvel ordre et le décalage à 0 sont appliqués sans animation.
    requestAnimationFrame(() => requestAnimationFrame(() => (drag.settling = false)))
  }

  /** Décalage vertical à appliquer à l'élément d'indice `index`. */
  function shift(index: number) {
    if (!drag.id) return 0
    if (index === drag.from) return drag.dy
    const size = rects[drag.from]!.height + gap
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -size
    if (drag.to < drag.from && index >= drag.to && index < drag.from) return size
    return 0
  }

  /** À placer sur le conteneur (click.capture) : ignore le clic qui termine un glissement. */
  function onClickCapture(event: MouseEvent) {
    if (suppressClick) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick = false
    }
  }

  onBeforeUnmount(() => {
    clearTimeout(timer)
    clearTimeout(suppressTimer)
    document.removeEventListener('touchmove', preventScroll)
  })

  return { drag, onPointerDown, onPointerMove, onPointerUp, onClickCapture, shift }
}
