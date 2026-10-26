import { GLYPHS, NS, STROKES, buildBlock, lenFrac, measure, profileOf, toWorld, type BlockSpec, type GlyphSet, type Profile, type Pt, type Rect, type SetKey, type StrokeRef } from './glyph'
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
  /** between words on one line: the pen lifts and glides across the space */
  | { kind: 'gap' }
  /** end of line one to the start of line two: an inked return swing */
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
  /** px per glyph unit */
  s: number
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

/** Mask stroke width in glyph units. Strokes at this width cover >99.9% of every filled glyph pixel. */
export const MASK_W = 18

function spec(key: SetKey, s: number, cx: number, oy: number): BlockSpec {
  const set = GLYPHS[key]
  const b = set.box
  return { key, set, idxs: allIdx(set), s, ox: cx - (b[2] * s) / 2, oy, vx: b[0], vw: b[2], maskW: MASK_W, inkW: 2.1 }
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
  const name = spec('Name', s, cx, top)
  const first = GLYPHS.Name.paths.findIndex((p) => p.w === 1)
  const words: Word[] = [
    { block: 0, first: 0, last: first - 1 },
    { block: 0, first, last: GLYPHS.Name.paths.length - 1 },
  ]
  const wb = words.map((x) => glyphBox(name, range(x.first, x.last)))
  const base = baselineOf(name)
  const links: Layout['links'] = [{ kind: 'gap' }]
  const xr = wb[1].x2 - 0.1 * w * 0.2
  const sw = swashPath(xr - 0.02 * w, wb[0].x1 + 0.03 * w, base, h)
  return { tall: false, W, k, s, lw: clamp(3.4 * k, 2.6, 5.2), blocks: [name], words, links, swash: sw.d, F: sw.F, tan: sw.tan }
}

function layoutTall(st: Rect, W: number): Layout {
  const cb = GLYPHS.Clayton.box
  const bb = GLYPHS.Banks.box
  const cx = st.x + st.w / 2
  const build = (f: number, yTop: number): { l: Layout; bottom: number } => {
    const s = (Math.min(W * 0.8, 560) * f) / cb[2]
    const k = (s * cb[2]) / 400
    const b0 = spec('Clayton', s, cx, yTop)
    const asc = 200 - bb[1]
    const pitch = (200 - cb[1]) * s * 0.4 + (cb[1] + cb[3] - 200) * s + asc * s * 0.35 + 26 * k + 16 * s
    const base0 = baselineOf(b0)
    const b1 = spec('Banks', s, cx, base0 + pitch - (200 - bb[1]) * s)
    const words: Word[] = [
      { block: 0, first: 0, last: GLYPHS.Clayton.paths.length - 1 },
      { block: 1, first: 0, last: GLYPHS.Banks.paths.length - 1 },
    ]
    const w1 = glyphBox(b1, allIdx(GLYPHS.Banks))
    const base1 = baselineOf(b1)
    // the swing leaves the last pen point of "Clayton" and lands on the first point of "Banks" (the B's stem top)
    const lastG = STROKES.Clayton[STROKES.Clayton.length - 1]
    const lastS = lastG[lastG.length - 1].p
    const e = lastS[lastS.length - 1]
    const p0 = STROKES.Banks[0][0].p[0]
    const E: Pt = toWorld(b0, { x: e[0], y: e[1] })
    const Ps: Pt = toWorld(b1, { x: p0[0], y: p0[1] })
    const gapY = base0 + (cb[1] + cb[3] - 200) * s + 8 * k
    const links: Layout['links'] = [{ kind: 'ret', E, Ps, gapY, sw: Math.min(110 * k, 60), k }, undefined]
    const bw = w1.x2 - w1.x1
    const sw = swashPath(w1.x2 - 0.03 * bw, w1.x1 + 0.02 * bw, base1, w1.y2 - w1.y1)
    return {
      l: { tall: true, W, k, s, lw: clamp(3.4 * k, 2.4, 5), blocks: [b0, b1], words, links, swash: sw.d, F: sw.F, tan: sw.tan },
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
   DOM + segments. Every segment is one stretch of pen travel with a duration in seconds (curvature-weighted).
   ───────────────────────────────────────────────────────────── */

export interface Seg {
  /** seconds of pen time at nominal speed */
  cost: number
  /** false while the pen travels without ink (flecks pause) */
  ink: boolean
  /** draw the stroke up to time fraction u in 0..1 */
  set(u: number): void
  /** pen tip, main space */
  point(u: number): Pt
}

/** the scratch structure buildIntro uses before costs become seconds */
interface Piece {
  seg: Seg
  /** raw weight, glyph units */
  w: number
  a: Pt
  b: Pt
  /** the pen must lift to reach this piece */
  lift: boolean
  fixed?: number
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
  // out right of the last pen point, down to the gap between the lines, back along it,
  // then dive onto the B's stem top from the upper right, the way the stem itself starts
  const p1x = E.x - 0.36 * sw
  const h = Math.max(10 * k, 0.45 * (Ps.y - gapY))
  const c2x = Ps.x + 1.5 * h
  return (
    `M ${f1(E.x)} ${f1(E.y)} C ${P(E.x + sw, E.y + 10 * k)} ${P(E.x + 0.82 * sw, gapY)} ${P(p1x, gapY)} ` +
    `C ${P(p1x - 0.55 * Math.max(0, p1x - c2x), gapY)} ${P(c2x, Ps.y - h)} ${P(Ps.x, Ps.y)}`
  )
}

/** A stroke already drawn in main space (connector, swash): dash-revealed, curvature-weighted. */
function pathSeg(p: SVGPathElement, r0: number): { seg: Seg; len: number; a: Pt; b: Pt; prof: Profile } {
  const len = p.getTotalLength()
  const prof = profileOf(p, len, r0)
  p.style.strokeDasharray = `${len} ${len}`
  p.style.strokeDashoffset = String(len)
  const seg: Seg = {
    cost: 0,
    ink: true,
    set(u) {
      p.style.strokeDashoffset = String(len * (1 - lenFrac(prof, u)))
    },
    point(u) {
      const q = p.getPointAtLength(len * lenFrac(prof, u))
      return { x: q.x, y: q.y }
    },
  }
  const a = p.getPointAtLength(0)
  const b = p.getPointAtLength(len)
  return { seg, len, prof, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } }
}

/** One stroke of a glyph: the mask path draws, the tip rides the centerline. */
function glyphSeg(ref: StrokeRef, toW: (p: Pt) => Pt): Seg {
  return {
    cost: 0,
    ink: true,
    set(u) {
      ref.reveal(lenFrac(ref.prof, u))
    },
    point(u) {
      return toW(ref.at(lenFrac(ref.prof, u)))
    },
  }
}

/** Pen travelling between two points without drawing: a short arc, eased. */
function glideSeg(a: Pt, b: Pt, ink: boolean): Seg {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy) || 1
  const h = ink ? 0 : Math.min(0.28 * d, 40)
  // arc bows upward (off the page), whichever way the pen is moving
  const nx = dy / d
  const ny = -dx / d
  const sgn = ny > 0 ? -1 : 1
  return {
    cost: 0,
    ink,
    set() {},
    point(u) {
      const e = u * u * (3 - 2 * u)
      const bow = Math.sin(Math.PI * e) * h * sgn
      return { x: a.x + dx * e + nx * bow, y: a.y + dy * e + ny * bow }
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

/** Seconds the name (all letters, joins and the return swing) takes; the swash then takes SWASH_T. */
const NAME_T = 6.2
const SWASH_T = 1.2
/** pen jumps shorter than this (glyph units) are bridged with ink still down; longer ones are lifts */
const JOIN_U = 34

export function buildIntro(art: SVGElement, layout: Layout): IntroDOM {
  const { lw, W, s } = layout
  const blocks = layout.blocks.map((sp) => buildBlock(sp, art))
  const pieces: Piece[] = []
  layout.words.forEach((w, wi) => {
    const b = blocks[w.block]
    for (let i = w.first; i <= w.last; i++) {
      for (const ref of b.refs[i]) {
        pieces.push({ seg: glyphSeg(ref, b.toWorld), w: ref.prof.weighted, a: b.toWorld(ref.a), b: b.toWorld(ref.b), lift: ref.lift })
      }
    }
    const link = layout.links[wi]
    if (link?.kind === 'ret') {
      const r = pathSeg(strokePath(art, returnPath(link, W), lw * 0.85), 30 * s)
      pieces.push({ seg: r.seg, w: r.prof.weighted / s, a: r.a, b: r.b, lift: false })
    }
  })
  const sw = pathSeg(strokePath(art, layout.swash, lw), 30 * s)
  pieces.push({ seg: sw.seg, w: 0, a: sw.a, b: sw.b, lift: true, fixed: SWASH_T })

  // bridge every gap between consecutive pieces
  const seq: Piece[] = []
  pieces.forEach((p, i) => {
    const prev = pieces[i - 1]
    if (prev) {
      const d = Math.hypot(p.a.x - prev.b.x, p.a.y - prev.b.y) / s
      if (d > 2.5) {
        const ink = d < JOIN_U && !p.lift
        seq.push({ seg: glideSeg(prev.b, p.a, ink), w: ink ? d * 0.9 : 22 + d * 0.55, a: prev.b, b: p.a, lift: false })
      }
    }
    seq.push(p)
  })
  const wName = seq.reduce((a, p) => a + (p.fixed ? 0 : p.w), 0)
  seq.forEach((p) => (p.seg.cost = p.fixed ?? (p.w * NAME_T) / wName))
  return { layout, all: seq.map((p) => p.seg), F: layout.F, tan: layout.tan }
}

/* ─────────────────────────────────────────────────────────────
   Playback: ONE tween over every segment; constant base speed, eased only at the very start and end.
   ───────────────────────────────────────────────────────────── */

export interface PlayHooks {
  /** called every frame with the (low-passed) pen position, main space, while drawing; `inking` false while the pen travels lifted */
  pen(p: Pt, inking: boolean): void
  burst(p: Pt): void
  finish(): void
}

const EASE_IN = 0.05
const EASE_OUT = 0.05
const VMAX = 1 / (1 - EASE_IN / 2 - EASE_OUT / 2)

/** Gentle acceleration over the first 5%, settling over the last 5%, constant speed between. */
function introEase(t: number): number {
  const a = EASE_IN
  const b = EASE_OUT
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (t < a) return (VMAX * t * t) / (2 * a)
  if (t > 1 - b) return 1 - (VMAX * (1 - t) * (1 - t)) / (2 * b)
  return VMAX * (a / 2 + (t - a))
}

const TAU = 0.03 // pen-tip low-pass time constant, s
/** playback rate over the authored pace (~6.5s name + ~1.2s swash at 1) */
const SPEED = 1.8

export function createTimeline(intro: IntroDOM, hooks: PlayHooks): gsap.core.Timeline {
  const segs = intro.all
  const total = segs.reduce((a, s) => a + s.cost, 0)
  const dur = (total * VMAX) / SPEED
  let fx = 0
  let fy = 0
  let ft = 0
  let primed = false
  const o = { v: 0 }
  // last drawn progress per segment: finished/untouched segments are skipped instead of rewritten every frame
  const drawn = new Float32Array(segs.length).fill(-1)
  const tl = gsap.timeline({ paused: true })
  tl.add(() => {
    segs.forEach((s) => s.set(0))
    drawn.fill(-1)
    primed = false
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
        let inking = true
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i]
          const u = clamp((pos - acc) / s.cost, 0, 1)
          if (u !== drawn[i]) {
            drawn[i] = u
            s.set(u)
          }
          if (u > 0 && u < 1) {
            pen = s.point(u)
            inking = s.ink
          }
          acc += s.cost
        }
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
        hooks.pen({ x: fx, y: fy }, inking)
      },
    },
  )
  tl.add(() => {
    segs.forEach((s) => s.set(1))
    drawn.fill(1)
    hooks.burst(intro.F)
    hooks.finish()
  })
  return tl
}
