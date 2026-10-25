import { GLYPHS, NS, buildBlock, measure, toWorld, type Block, type BlockSpec, type GlyphSet, type Pt, type Rect } from './glyph'
import { gsap } from '../core/motion'

/* ─────────────────────────────────────────────────────────────
   Intro geometry (main-space px). Wide stage: "Clayton Banks" on one line.
   Tall stage: "Clayton" / "Banks" on two lines. Then an underline swash that
   curls back and flicks down into the journey.
   ───────────────────────────────────────────────────────────── */

interface Box {
  x1: number
  y1: number
  x2: number
  y2: number
}
type Link =
  | { kind: 'gap'; a: Pt; b: Pt; k: number }
  | { kind: 'ret'; E: Pt; Ps: Pt; gapY: number; sw: number; k: number }

interface Word {
  block: number
  first: number
  last: number
}

export interface Layout {
  tall: boolean
  W: number
  k: number
  lw: number
  blocks: BlockSpec[]
  words: Word[]
  /** connector after word i (undefined after the last word) */
  links: (Link | undefined)[]
  /** underline swash + flick, as one path */
  swash: string
  F: Pt
  tan: Pt
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const f1 = (n: number) => n.toFixed(1)
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const allIdx = (set: GlyphSet) => set.paths.map((_, i) => i)

/** Bounding box (world px) of the given local glyph indices of a block. */
function glyphBox(spec: BlockSpec, local: number[]): Box {
  const m = measure(spec.set)
  const idxs = local.map((i) => spec.idxs[i])
  const a = toWorld(spec, { x: Math.min(...idxs.map((i) => m[i].x1)), y: Math.min(...idxs.map((i) => m[i].y1)) })
  const b = toWorld(spec, { x: Math.max(...idxs.map((i) => m[i].x2)), y: Math.max(...idxs.map((i) => m[i].y2)) })
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}
const baselineOf = (spec: BlockSpec) => toWorld(spec, { x: 0, y: 200 }).y

function spec(set: GlyphSet, s: number, cx: number, oy: number): BlockSpec {
  const b = set.box
  return { set, idxs: allIdx(set), s, ox: cx - (b[2] * s) / 2, oy, vx: b[0], vw: b[2], maskW: 24, inkW: 2.1 }
}

/** `stage` is the #intro-stage rect in main space; `W` the main width. */
export function computeLayout(stage: Rect, W: number): Layout {
  return stage.w < 720 ? layoutTall(stage, W) : layoutWide(stage, W)
}

/** The underline: starts under the end of the last word, sweeps left dipping below the baseline with a slight upward
 *  arc, loops back over itself near the first letter, then flicks down-right into the journey. `yb` is the baseline, `h` the name height. */
function swashPath(xr: number, xl: number, yb: number, h: number): { d: string; F: Pt; tan: Pt } {
  const L = xr - xl
  const P = (x: number, y: number) => `${f1(x)} ${f1(y)}`
  const X = (u: number) => xl + u * L
  const Y = (v: number) => yb + v * h
  const F: Pt = { x: X(0.23), y: Y(0.3) + 0.1 * L }
  const c2: Pt = { x: F.x - 0.035 * L, y: F.y - 0.04 * L }
  const d =
    `M ${P(xr, Y(0.1))} ` +
    `C ${P(xr - 0.28 * L, Y(0.17))} ${P(X(0.58), Y(0.23))} ${P(X(0.3), Y(0.2))} ` +
    `C ${P(X(0.2), Y(0.185))} ${P(X(0.1), Y(0.15))} ${P(X(0.04), Y(0.12))} ` +
    `C ${P(X(-0.03), Y(0.09))} ${P(X(-0.07), Y(0.03))} ${P(X(0.02), Y(0.035))} ` +
    `C ${P(X(0.09), Y(0.04))} ${P(X(0.15), Y(0.11))} ${P(X(0.16), Y(0.22))} ` +
    `C ${P(X(0.165), Y(0.3))} ${P(X(0.2), Y(0.3) + 0.03 * L)} ${P(F.x - 0.035 * L, F.y - 0.04 * L)} ` +
    `L ${P(F.x, F.y)}`
  const tx = F.x - c2.x
  const ty = F.y - c2.y
  const m = Math.hypot(tx, ty)
  return { d, F, tan: { x: tx / m, y: ty / m } }
}

function layoutWide(st: Rect, W: number): Layout {
  const nb = GLYPHS.Name.box
  const nameW = Math.min(st.w * 0.78, 1150)
  const s = Math.min(nameW / nb[2], (st.h * 0.4) / nb[3])
  const w = nb[2] * s
  const h = nb[3] * s
  const k = (s * GLYPHS.Clayton.box[2]) / 400
  const cx = st.x + st.w / 2
  const top = st.y + st.h * 0.4 - h / 2
  const name = spec(GLYPHS.Name, s, cx, top)
  const first = GLYPHS.Name.paths.findIndex((p) => p.w === 1)
  const words: Word[] = [
    { block: 0, first: 0, last: first - 1 },
    { block: 0, first, last: GLYPHS.Name.paths.length - 1 },
  ]
  const wb = words.map((x) => glyphBox(name, range(x.first, x.last)))
  const base = baselineOf(name)
  const links: Layout['links'] = [
    { kind: 'gap', a: { x: wb[0].x2 - 2 * k, y: base - 3 * k }, b: { x: wb[1].x1 + 3 * k, y: base - 3 * k }, k },
  ]
  const xr = wb[1].x2 - 0.1 * w * 0.2
  const sw = swashPath(xr - 0.02 * w, wb[0].x1 + 0.03 * w, base, h)
  return { tall: false, W, k, lw: clamp(3.4 * k, 2.6, 5.2), blocks: [name], words, links, swash: sw.d, F: sw.F, tan: sw.tan }
}

function layoutTall(st: Rect, W: number): Layout {
  const cb = GLYPHS.Clayton.box
  const bb = GLYPHS.Banks.box
  const cx = st.x + st.w / 2
  const build = (f: number, yTop: number): { l: Layout; bottom: number } => {
    const s = (Math.min(W * 0.8, 560) * f) / cb[2]
    const k = (s * cb[2]) / 400
    const b0 = spec(GLYPHS.Clayton, s, cx, yTop)
    const asc = 200 - bb[1]
    const pitch = (200 - cb[1]) * s * 0.4 + (cb[1] + cb[3] - 200) * s + asc * s * 0.35 + 26 * k
    const base0 = baselineOf(b0)
    const b1 = spec(GLYPHS.Banks, s, cx, base0 + pitch - (200 - bb[1]) * s)
    const words: Word[] = [
      { block: 0, first: 0, last: GLYPHS.Clayton.paths.length - 1 },
      { block: 1, first: 0, last: GLYPHS.Banks.paths.length - 1 },
    ]
    const w0 = glyphBox(b0, allIdx(GLYPHS.Clayton))
    const w1 = glyphBox(b1, allIdx(GLYPHS.Banks))
    const base1 = baselineOf(b1)
    const E: Pt = { x: w0.x2 - 2 * k, y: base0 - 3 * k }
    const Ps: Pt = { x: w1.x1 + 4 * k, y: base1 - 3 * k }
    const gapY = base0 + (cb[1] + cb[3] - 200) * s + 8 * k
    const links: Layout['links'] = [{ kind: 'ret', E, Ps, gapY, sw: Math.min(110 * k, 60), k }, undefined]
    const bw = w1.x2 - w1.x1
    const sw = swashPath(w1.x2 - 0.03 * bw, w1.x1 + 0.02 * bw, base1, w1.y2 - w1.y1)
    return {
      l: { tall: true, W, k, lw: clamp(3.4 * k, 2.4, 5), blocks: [b0, b1], words, links, swash: sw.d, F: sw.F, tan: sw.tan },
      bottom: sw.F.y,
    }
  }
  let r = build(1, 0)
  const avail = st.h * 0.92
  const f = r.bottom > avail ? avail / r.bottom : 1
  r = build(f, 0)
  const yTop = st.y + Math.max(8, (st.h - r.bottom) * 0.42)
  return build(f, yTop).l
}

/* ─────────────────────────────────────────────────────────────
   DOM + segments
   ───────────────────────────────────────────────────────────── */

export interface Seg {
  /** pen travel in px */
  travel: number
  /** draw the stroke up to u in 0..1 (glyphs reveal their outward edge only) */
  set(u: number): void
  /** reveal the glyph's back edge, v in 0..1, after the pen has left it */
  back?(v: number): void
  point(u: number): Pt
}

function strokePath(parent: SVGElement, d: string, w: number): SVGPathElement {
  const p = document.createElementNS(NS, 'path')
  p.setAttribute('class', 'pen-stroke')
  p.setAttribute('d', d)
  p.setAttribute('stroke-width', w.toFixed(2))
  parent.appendChild(p)
  return p
}

function returnPath(l: Extract<Link, { kind: 'ret' }>, W: number): string {
  const { E, Ps, gapY, sw, k } = l
  const cx = (x: number) => clamp(x, 4, W - 4)
  const P = (x: number, y: number) => `${f1(cx(x))} ${f1(y)}`
  return (
    `M ${f1(E.x)} ${f1(E.y)} C ${P(E.x + sw, E.y + 10 * k)} ${P(E.x + 0.82 * sw, gapY)} ${P(E.x - 0.36 * sw, gapY)} ` +
    `C ${P(E.x - 1.82 * sw, gapY)} ${P(Ps.x - 0.18 * sw, gapY - 10 * k)} ${P(Ps.x - 0.45 * sw, (gapY + Ps.y) / 2)} ` +
    `C ${P(Ps.x - 0.64 * sw, Ps.y - 10 * k)} ${P(Ps.x - 0.18 * sw, Ps.y + 6 * k)} ${f1(Ps.x)} ${f1(Ps.y)}`
  )
}

/** A glyph outline runs out along one edge and back along the other; the thick mask means the outward half
 *  already covers the letter, so the pen follows only that half and the back edge is revealed after the fact. */
function glyphSeg(b: Block, i: number): Seg {
  const p = b.masks[i]
  const len = b.lens[i]
  p.style.strokeDasharray = `${len} ${len}`
  let fwd = 0
  let bk = 0
  const apply = () => {
    p.style.strokeDashoffset = String(len * (1 - Math.min(1, 0.5 * fwd + (fwd >= 1 ? 0.5 * bk : 0))))
  }
  return {
    travel: len * b.spec.s * 0.5,
    set(u) {
      fwd = u
      if (u < 1) bk = 0
      apply()
    },
    back(v) {
      bk = v
      apply()
    },
    point(u) {
      return b.toWorld(p.getPointAtLength(len * 0.5 * u))
    },
  }
}

function strokeSeg(p: SVGPathElement): Seg {
  const len = p.getTotalLength()
  p.style.strokeDasharray = `${len} ${len}`
  return {
    travel: len,
    set(u) {
      p.style.strokeDashoffset = String(len * (1 - u))
    },
    point(u) {
      return p.getPointAtLength(len * u)
    },
  }
}

export interface IntroDOM {
  layout: Layout
  /** every segment, in drawing order */
  all: Seg[]
  /** first point of the journey (end of the flick) and its tangent */
  F: Pt
  tan: Pt
}

export function buildIntro(art: SVGElement, layout: Layout): IntroDOM {
  const { lw, W } = layout
  const blocks = layout.blocks.map((s) => buildBlock(s, art))
  const all: Seg[] = []
  layout.words.forEach((w, wi) => {
    const b = blocks[w.block]
    for (let i = w.first; i <= w.last; i++) all.push(glyphSeg(b, i))
    const link = layout.links[wi]
    if (!link) return
    if (link.kind === 'gap') {
      const { a, b: bb, k } = link
      all.push(strokeSeg(strokePath(art, `M ${f1(a.x)} ${f1(a.y)} C ${f1(a.x + 10 * k)} ${f1(a.y + 5 * k)} ${f1(bb.x - 10 * k)} ${f1(bb.y + 5 * k)} ${f1(bb.x)} ${f1(bb.y)}`, lw * 0.62)))
    } else {
      all.push(strokeSeg(strokePath(art, returnPath(link, W), lw * 0.85)))
    }
  })
  all.push(strokeSeg(strokePath(art, layout.swash, lw)))
  return { layout, all, F: layout.F, tan: layout.tan }
}

/* ─────────────────────────────────────────────────────────────
   Playback: ONE tween over every segment at constant pen speed.
   ───────────────────────────────────────────────────────────── */

export interface PlayHooks {
  /** called every frame with the (low-passed) pen position, main space, while drawing */
  pen(p: Pt): void
  burst(p: Pt): void
  finish(): void
}

/** Accelerates over the first 6%, settles over the last 10%, constant speed between. */
function introEase(t: number): number {
  const a = 0.06
  const b = 0.1
  const vmax = 1 / (1 - a / 2 - b / 2)
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (t < a) return (vmax * t * t) / (2 * a)
  if (t > 1 - b) return 1 - (vmax * (1 - t) * (1 - t)) / (2 * b)
  return vmax * (a / 2 + (t - a))
}

const TAU = 0.03 // pen-tip low-pass time constant, s
const BACK_T = 0.22 // seconds for a glyph's back edge to fill in once the pen has left it

export function createTimeline(intro: IntroDOM, hooks: PlayHooks): gsap.core.Timeline {
  const segs = intro.all
  const total = segs.reduce((a, s) => a + s.travel, 0)
  const speed = 1100 * intro.layout.k
  const dur = clamp(total / speed, 3.2, 5)
  const doneAt: number[] = segs.map(() => -1)
  let fx = 0
  let fy = 0
  let ft = 0
  let primed = false
  const o = { v: 0 }
  const tl = gsap.timeline({ paused: true })
  tl.add(() => {
    segs.forEach((s) => s.set(0))
    primed = false
    doneAt.fill(-1)
  })
  tl.fromTo(
    o,
    { v: 0 },
    {
      v: 1,
      duration: dur,
      ease: introEase,
      immediateRender: false,
      onUpdate() {
        const now = performance.now()
        const pos = o.v * total
        let acc = 0
        let pen: Pt | null = null
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i]
          const u = clamp((pos - acc) / s.travel, 0, 1)
          s.set(u)
          if (u > 0 && u < 1) pen = s.point(u)
          else if (u >= 1 && s.back) {
            if (doneAt[i] < 0) doneAt[i] = now
            s.back(clamp((now - doneAt[i]) / 1000 / BACK_T, 0, 1))
          } else if (u < 1) doneAt[i] = -1
          acc += s.travel
        }
        if (o.v >= 1) segs.forEach((s) => s.back?.(1))
        if (!pen) return
        if (!primed) {
          fx = pen.x
          fy = pen.y
          ft = now
          primed = true
        } else {
          const dt = Math.max(0, (now - ft) / 1000)
          ft = now
          const a = 1 - Math.exp(-dt / TAU)
          fx += (pen.x - fx) * a
          fy += (pen.y - fy) * a
        }
        hooks.pen({ x: fx, y: fy })
      },
    },
  )
  tl.add(() => {
    segs.forEach((s) => (s.set(1), s.back?.(1)))
    hooks.burst(intro.F)
    hooks.finish()
  })
  return tl
}
