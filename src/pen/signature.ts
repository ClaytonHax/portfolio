import { gsap, reducedMotion } from '../core/motion'
import { on } from '../core/bus'
import { GLYPHS, NS, buildBlock, lenFrac } from './glyph'
import { MASK_W } from './intro'

/** Draws a small cursive "Clayton Banks" into [data-pen-signature] once the journey reaches its end stop. */
export function initSignature(): void {
  let built = false
  const build = (animate: boolean) => {
    if (built) return
    const host = document.querySelector<HTMLElement>('[data-pen-signature]')
    if (!host) return
    built = true
    const set = GLYPHS.Name
    const s = 0.24
    const w = set.box[2] * s
    const h = set.box[3] * s
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`)
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.setAttribute('class', 'pen-sig')
    svg.style.cssText = `display:block;width:100%;max-width:${Math.round(w)}px;height:auto;overflow:visible`
    host.replaceChildren(svg)
    const b = buildBlock({ key: 'Name', set, idxs: set.paths.map((_, i) => i), s, ox: 0, oy: 0, vx: set.box[0], vw: set.box[2], maskW: MASK_W, inkW: 2.4 }, svg)
    // the same strokes, in writing order; lifted strokes (the t's crossbar) cost no extra time
    const refs = b.refs.flat()
    const lens = refs.map((r) => r.prof.weighted)
    const total = lens.reduce((a, l) => a + l, 0)
    const set01 = (v: number) => {
      let acc = 0
      refs.forEach((r, i) => {
        r.reveal(lenFrac(r.prof, Math.min(1, Math.max(0, (v * total - acc) / lens[i]))))
        acc += lens[i]
      })
    }
    if (!animate || reducedMotion) return set01(1)
    set01(0)
    const o = { v: 0 }
    gsap.to(o, { v: 1, duration: 2.6, ease: 'sine.inOut', onUpdate: () => set01(o.v) })
  }
  on('pen:reach', ({ id }) => {
    if (!id) return
    const el = document.querySelector<HTMLElement>(`[data-pen-stop="${CSS.escape(id)}"]`)
    if (el?.dataset.penSide === 'end') build(true)
  })
  on('intro:done', () => {
    if (reducedMotion) build(false)
  })
}
