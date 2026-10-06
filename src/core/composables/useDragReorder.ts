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
}

/**
 * Réorganisation d'une liste verticale : appui long puis glisser.
 * Le DOM ne bouge pas pendant le glissement ; les éléments sont décalés par translation.
 */
export function useDragReorder({ refKey, ids, onReorder, canStart }: Options) {
  const elements = useTemplateRef<HTMLElement[]>(refKey)
  const drag = reactive({ id: null as string | null, from: 0, to: 0, dy: 0 })
  let rects: DOMRect[] = []
  let gap = 12
  let timer: ReturnType<typeof setTimeout> | undefined
  let startX = 0
  let startY = 0
  let suppressClick = false

  function preventScroll(event: TouchEvent) {
    event.preventDefault()
  }

  function onPointerDown(event: PointerEvent, index: number) {
    startX = event.clientX
    startY = event.clientY
    const target = event.currentTarget as HTMLElement
    const pointerId = event.pointerId
    clearTimeout(timer)
    timer = setTimeout(() => begin(index, target, pointerId), 380)
  }

  function begin(index: number, target: HTMLElement, pointerId: number) {
    if (canStart && !canStart()) return
    rects = (elements.value ?? []).map((el) => el.getBoundingClientRect())
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
    const center = from.top + from.height / 2 + drag.dy
    let to = drag.from
    for (let j = drag.from + 1; j < rects.length; j++)
      if (center > rects[j]!.top + rects[j]!.height / 2) to = j
    for (let j = drag.from - 1; j >= 0; j--) if (center < rects[j]!.top + rects[j]!.height / 2) to = j
    drag.to = to
  }

  function onPointerUp() {
    clearTimeout(timer)
    if (!drag.id) return
    suppressClick = true
    document.removeEventListener('touchmove', preventScroll)
    if (drag.from !== drag.to) {
      const next = [...ids()]
      const [moved] = next.splice(drag.from, 1)
      next.splice(drag.to, 0, moved!)
      onReorder(next)
    }
    Object.assign(drag, { id: null, from: 0, to: 0, dy: 0 })
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
    document.removeEventListener('touchmove', preventScroll)
  })

  return { drag, onPointerDown, onPointerMove, onPointerUp, onClickCapture, shift }
}
