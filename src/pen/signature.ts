import { gsap, reducedMotion } from '../core/motion'
import { on } from '../core/bus'
import { GLYPHS, NS, buildBlock } from './glyph'

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
    const b = buildBlock({ set, idxs: set.paths.map((_, i) => i), s, ox: 0, oy: 0, vx: set.box[0], vw: set.box[2], maskW: 26, inkW: 2.4 }, svg)
    const lens = b.lens
    const total = lens.reduce((a, l) => a + l, 0)
    b.masks.forEach((m, i) => (m.style.strokeDasharray = `${lens[i]} ${lens[i]}`))
    const set01 = (v: number) => {
      let acc = 0
      b.masks.forEach((m, i) => {
        const u = Math.min(1, Math.max(0, (v * total - acc) / lens[i]))
        m.style.strokeDashoffset = String(lens[i] * (1 - u))
        acc += lens[i]
      })
    }
    if (!animate || reducedMotion) return set01(1)
    set01(0)
    const o = { v: 0 }
    gsap.to(o, { v: 1, duration: 1.4, ease: 'power1.inOut', onUpdate: () => set01(o.v) })
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
