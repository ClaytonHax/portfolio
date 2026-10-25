import { on } from '../core/bus'
import { ScrollTrigger, reducedMotion } from '../core/motion'

/**
 * Reveal rule: content fades in as it enters the viewport (its own ScrollTrigger), so nothing sits empty
 * below the pen. The pen arriving at a stop adds `is-reached` (a glow), removed again when it rewinds past.
 * Safety nets: reveal on pen:reach too, and a 12s fallback if the intro never finishes.
 * Reduced motion shows everything immediately.
 */
interface Item {
  el: HTMLElement
  shown: boolean
  fired: boolean
  onIn?: () => void
}

const all: Item[] = []
const byStop = new Map<string, Item[]>()
let introDone = false
const gated: Item[] = []

function show(it: Item) {
  if (!it.shown) {
    it.shown = true
    it.el.classList.add('is-in')
  }
  if (!it.fired) {
    it.fired = true
    it.onIn?.()
  }
}

export function reveal(el: HTMLElement, opts: { stop?: string; start?: string; onIn?: () => void } = {}): void {
  const it: Item = { el, shown: false, fired: false, onIn: opts.onIn }
  all.push(it)
  if (opts.stop) {
    if (!byStop.has(opts.stop)) byStop.set(opts.stop, [])
    byStop.get(opts.stop)!.push(it)
  }
  if (reducedMotion) {
    show(it)
    return
  }
  ScrollTrigger.create({
    trigger: el,
    start: opts.start ?? 'top 88%',
    onEnter: () => show(it),
    onEnterBack: () => show(it),
    onRefresh: (self) => {
      if (self.progress > 0) show(it)
    },
  })
}

export function initReveal(): void {
  on('pen:reach', ({ id }) =>
    byStop.get(id)?.forEach((it) => {
      show(it)
      it.el.classList.add('is-reached')
    }),
  )
  on('pen:leave', ({ id }) => byStop.get(id)?.forEach((it) => it.el.classList.remove('is-reached')))
  on('intro:done', () => {
    introDone = true
    gated.forEach(show)
  })
  window.setTimeout(() => {
    if (!introDone) all.forEach(show)
  }, 12000)
}

/** Shown when the intro finishes (not on scroll). Same safety nets: 12s fallback, reduced motion. */
export function revealAfterIntro(el: HTMLElement): void {
  const it: Item = { el, shown: false, fired: false }
  all.push(it)
  gated.push(it)
  if (reducedMotion || introDone) show(it)
}
