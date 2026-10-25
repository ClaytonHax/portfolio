import { GLYPHS, NS, buildBlock, measure, toWorld, type Block, type BlockSpec, type Pt, type Rect } from './glyph'
import { gsap } from '../core/motion'

/* ─────────────────────────────────────────────────────────────
   Intro geometry. Everything is expressed in main-space px.
   "Proto units" are the prototype's world units (1000 = stage width); `k` converts them to px.
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

export interface Layout {
  tall: boolean
  W: number
  k: number
  lw: number
  name: BlockSpec
  phrase: BlockSpec[]
  /** phrase words in order: which block, and the local glyph index range */
  words: { block: number; first: number; last: number }[]
  /** connector after word i (undefined after the last word) */
  links: (Link | undefined)[]
  c0: Extract<Link, { kind: 'ret' }>
  c1: { from: Pt; to: Pt; k: number }
  circle: { C: Pt; rx: number; ry: number; n: number; tilt: number; T0: number; T1: number; k: number }
  flick: { ce: Pt; p1: Pt; p2: Pt; F: Pt; tan: Pt }
}

const PROTO_PHRASE_S = 600 / 1422
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const R = (b: BlockSpec, p: Pt) => toWorld(b, p)

function unionBox(boxes: Box[]): Box {
  return {
    x1: Math.min(...boxes.map((b) => b.x1)),
    y1: Math.min(...boxes.map((b) => b.y1)),
    x2: Math.max(...boxes.map((b) => b.x2)),
    y2: Math.max(...boxes.map((b) => b.y2)),
  }
}
/** Bounding box (world px) of the given local glyph indices of a block. */
function glyphBox(spec: BlockSpec, local: number[]): Box {
  const m = measure(spec.set)
  const idxs = local.map((i) => spec.idxs[i])
  const a = R(spec, { x: Math.min(...idxs.map((i) => m[i].x1)), y: Math.min(...idxs.map((i) => m[i].y1)) })
  const b = R(spec, { x: Math.max(...idxs.map((i) => m[i].x2)), y: Math.max(...idxs.map((i) => m[i].y2)) })
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}
const baselineOf = (spec: BlockSpec) => R(spec, { x: 0, y: 200 }).y

/** Hand-drawn ellipse / squircle point with a slight wobble and tilt. */
export function circlePoint(c: Layout['circle'], t: number): Pt {
  const r = 1 + 0.025 * Math.sin(3 * t + 1)
  const co = Math.cos(t)
  const si = Math.sin(t)
  const e = 2 / c.n
  const x = c.rx * r * Math.sign(co) * Math.abs(co) ** e
  const y = c.ry * r * Math.sign(si) * Math.abs(si) ** e
  return { x: c.C.x + x * Math.cos(c.tilt) - y * Math.sin(c.tilt), y: c.C.y + x * Math.sin(c.tilt) + y * Math.cos(c.tilt) }
}

interface Parts {
  wordsOf: number[][] // phrase path indices per word
}
function wordIndices(): Parts {
  const out: number[][] = []
  GLYPHS.phrase.paths.forEach((p, i) => (out[p.w] ||= []).push(i))
  return { wordsOf: out }
}

/** `stage` is the #intro-stage rect in main space; `W` the main width. */
export function computeLayout(stage: Rect, W: number): Layout {
  const tall = stage.w < 720
  return tall ? layoutTall(stage, W) : layoutWide(stage, W)
}

function finishLayout(
  tall: boolean,
  W: number,
  k: number,
  name: BlockSpec,
  phrase: BlockSpec[],
  words: Layout['words'],
  kp: number,
  retSwing: number,
  gapYName: number,
  gapYRows: number,
  circleSpec: { n: number; rx: number; ry: number; cyShift: number },
  kFlick: number,
): Layout {
  const nameBox = glyphBox(name, GLYPHS.Clayton.paths.map((_, i) => i))
  const nameBase = baselineOf(name)
  const E: Pt = { x: nameBox.x2 - 2 * k, y: nameBase - 3 * k }
  const wb = words.map((w) => glyphBox(phrase[w.block], range(w.first, w.last)))
  const base = phrase.map(baselineOf)
  const Ps: Pt = { x: wb[0].x1 + 4 * kp, y: base[words[0].block] - 2 * kp }
  const c0 = { kind: 'ret' as const, E, Ps, gapY: gapYName, sw: retSwing, k }

  const links: Layout['links'] = words.map((w, i) => {
    const nx = words[i + 1]
    if (!nx) return undefined
    if (nx.block === w.block) {
      return { kind: 'gap', a: { x: wb[i].x2 - 2 * kp, y: base[w.block] - 2 * kp }, b: { x: wb[i + 1].x1 + 3 * kp, y: base[w.block] - 2 * kp }, k: kp }
    }
    return {
      kind: 'ret',
      E: { x: wb[i].x2 - 2 * kp, y: base[w.block] - 2 * kp },
      Ps: { x: wb[i + 1].x1 + 4 * kp, y: base[nx.block] - 2 * kp },
      gapY: gapYRows,
      sw: retSwing * 0.8,
      k: kp,
    }
  })

  const all = unionBox(wb)
  const circle = {
    C: { x: (all.x1 + all.x2) / 2, y: (all.y1 + all.y2) / 2 + circleSpec.cyShift },
    rx: circleSpec.rx,
    ry: circleSpec.ry,
    n: circleSpec.n,
    tilt: -0.05,
    T0: 0.18,
    T1: 0.18 - Math.PI * 2 - 0.55,
    k: kp,
  }
  const last = wb[wb.length - 1]
  const phrEnd: Pt = { x: last.x2 - 2 * kp, y: base[words[words.length - 1].block] - 2 * kp }
  const cs = circlePoint(circle, circle.T0)
  const ce = circlePoint(circle, circle.T1)
  // The flick tucks into whatever room is left on the right of the circle.
  const fk = clamp((W - 12 - ce.x) / 128, 0.18, kFlick)
  const at = (x: number, y: number): Pt => ({ x: ce.x + x * fk, y: ce.y + y * fk })
  const flick = { ce, p1: at(40, 34), p2: at(120, 10), F: at(128, 60), tan: { x: 0.16, y: 0.987 } }
  return {
    tall,
    W,
    k,
    lw: clamp(3.2 * k, 2.4, 4.8),
    name,
    phrase,
    words,
    links,
    c0,
    c1: { from: phrEnd, to: cs, k: kp },
    circle,
    flick: { ...flick },
  }
}

function range(a: number, b: number) {
  const o: number[] = []
  for (let i = a; i <= b; i++) o.push(i)
  return o
}

function layoutWide(st: Rect, W: number): Layout {
  const nb = GLYPHS.Clayton.box
  const pb = GLYPHS.phrase.box
  const topPad = 64
  const k = Math.min((st.w * 0.4) / 400, ((st.h - topPad) * 0.92) / 455, 2)
  const nameW = 400 * k
  const phrW = 600 * k
  const cx = st.x + st.w / 2
  const top = st.y + topPad + Math.max(0, (st.h - topPad - 455 * k) * 0.4)
  const name: BlockSpec = { set: GLYPHS.Clayton, idxs: GLYPHS.Clayton.paths.map((_, i) => i), s: nameW / nb[2], ox: cx - nameW / 2, oy: top, vx: nb[0], vw: nb[2], maskW: 21.2, inkW: 1.7 }
  const phrase: BlockSpec = { set: GLYPHS.phrase, idxs: GLYPHS.phrase.paths.map((_, i) => i), s: phrW / pb[2], ox: cx - phrW / 2, oy: top + 305 * k, vx: pb[0], vw: pb[2], maskW: 25, inkW: 2 }
  const { wordsOf } = wordIndices()
  const words = wordsOf.map((ix) => ({ block: 0, first: ix[0], last: ix[ix.length - 1] }))
  const nameBottom = top + nb[3] * name.s
  const wbs = words.map((w) => glyphBox(phrase, range(w.first, w.last)))
  const all = unionBox(wbs)
  return finishLayout(
    false,
    W,
    k,
    name,
    [phrase],
    words,
    k,
    110 * k,
    nameBottom + 20 * k,
    0,
    { n: 2, rx: (all.x2 - all.x1) / 2 + 60 * k, ry: (all.y2 - all.y1) / 2 + 34 * k, cyShift: 4 * k },
    k,
  )
}

function layoutTall(st: Rect, W: number): Layout {
  const nb = GLYPHS.Clayton.box
  const pb = GLYPHS.phrase.box
  const { wordsOf } = wordIndices()
  const pm = measure(GLYPHS.phrase)
  const rowIdx = [wordsOf[0].concat(wordsOf[1]), wordsOf[2].concat(wordsOf[3])]
  const ext = rowIdx.map((ix) => ({
    x1: Math.min(...ix.map((i) => pm[i].x1)),
    x2: Math.max(...ix.map((i) => pm[i].x2)),
    y1: Math.min(...ix.map((i) => pm[i].y1)),
    y2: Math.max(...ix.map((i) => pm[i].y2)),
  }))
  const cx = st.x + st.w / 2

  const build = (f: number, extraGap: number, yTop: number): Layout => {
    const nameW = Math.min(W * 0.78, 560) * f
    const kN = nameW / 400
    const nameS = nameW / nb[2]
    const sp = Math.min((W * 0.64 * f) / (ext[1].x2 - ext[1].x1), nameS * 0.62)
    const kp = sp / PROTO_PHRASE_S
    const name: BlockSpec = { set: GLYPHS.Clayton, idxs: GLYPHS.Clayton.paths.map((_, i) => i), s: nameS, ox: cx - nameW / 2, oy: yTop, vx: nb[0], vw: nb[2], maskW: 21.2, inkW: 1.7 }
    const nameBottom = yTop + nb[3] * nameS
    const mk = (r: number, oyTop: number): BlockSpec => {
      const e = ext[r]
      const vx = e.x1 - 10
      const vw = e.x2 - e.x1 + 20
      return {
        set: GLYPHS.phrase,
        idxs: rowIdx[r],
        s: sp,
        vx,
        vw,
        ox: cx - ((e.x1 + e.x2) / 2 - vx) * sp,
        oy: oyTop - (e.y1 - pb[1]) * sp,
        maskW: 25,
        inkW: 2,
      }
    }
    const row1Top = nameBottom + (54 * kN + extraGap)
    const r1 = mk(0, row1Top)
    const row1Bottom = row1Top + (ext[0].y2 - ext[0].y1) * sp
    const gapRows = 34 * kp
    const r2 = mk(1, row1Bottom + gapRows)
    const words = [
      { block: 0, first: 0, last: wordsOf[0].length - 1 },
      { block: 0, first: wordsOf[0].length, last: wordsOf[0].length + wordsOf[1].length - 1 },
      { block: 1, first: 0, last: wordsOf[2].length - 1 },
      { block: 1, first: wordsOf[2].length, last: wordsOf[2].length + wordsOf[3].length - 1 },
    ]
    const wb = words.map((w, i) => glyphBox(i < 2 ? r1 : r2, range(w.first, w.last)))
    const all = unionBox(wb)
    const hw = (all.x2 - all.x1) / 2
    const hh = (all.y2 - all.y1) / 2
    const rx = Math.min(1.2 * hw + 18 * kp, W / 2 - 22)
    const ry = 1.28 * hh + 14 * kp
    return finishLayout(true, W, kN, name, [r1, r2], words, kp, Math.min(110 * kN, 60), nameBottom + 20 * kN, row1Bottom + gapRows * 0.5, { n: 2.8, rx, ry, cyShift: 3 * kp }, kN)
  }
  const bottomOf = (l: Layout) => l.circle.C.y + l.circle.ry
  const topOf = (l: Layout) => l.circle.C.y - l.circle.ry
  // Pass 1: make sure the circle clears the name; pass 2: shrink everything if it doesn't fit the stage.
  const fit = (f: number) => {
    let extra = 0
    let l = build(f, 0, 0)
    const deficit = nb[3] * l.name.s + 44 * l.k - topOf(l)
    if (deficit > 0) {
      extra = deficit
      l = build(f, extra, 0)
    }
    return { l, extra, f }
  }
  let r = fit(1)
  const avail = st.h * 0.95
  if (bottomOf(r.l) > avail) r = fit(avail / bottomOf(r.l))
  const yTop = st.y + Math.max(4, (st.h - bottomOf(r.l)) * 0.46)
  return build(r.f, r.extra, yTop)
}

/* ─────────────────────────────────────────────────────────────
   DOM + segments
   ───────────────────────────────────────────────────────────── */

export interface Seg {
  travel: number
  set(u: number): void
  point(u: number): Pt
}

const f1 = (n: number) => n.toFixed(1)

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

// A glyph outline goes out along one edge and back along the other; the outward half reveals the letter.
const warp = (u: number) => (u < 0.8 ? (0.5 * u) / 0.8 : 0.5 + (0.5 * (u - 0.8)) / 0.2)

function glyphSeg(b: Block, i: number): Seg {
  const p = b.masks[i]
  const len = b.lens[i]
  p.style.strokeDasharray = `${len} ${len}`
  return {
    travel: len * b.spec.s * 0.5,
    set(u) {
      p.style.strokeDashoffset = String(len * (1 - warp(u)))
    },
    point(u) {
      return b.toWorld(p.getPointAtLength(len * Math.min(0.5, warp(u))))
    },
  }
}

function strokeSeg(p: SVGPathElement): Seg & { len: number } {
  const len = p.getTotalLength()
  p.style.strokeDasharray = `${len} ${len}`
  return {
    len,
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
  nameSegs: Seg[]
  c0: Seg
  phraseSegs: Seg[]
  circleSegs: Seg[]
  flick: Seg
  all: Seg[]
  /** first point of the journey (end of the flick) and its tangent */
  F: Pt
  tan: Pt
}

export function buildIntro(art: SVGElement, layout: Layout): IntroDOM {
  const { lw } = layout
  const W = layout.W
  const nameBlock = buildBlock(layout.name, art)
  const nameSegs = nameBlock.masks.map((_, i) => glyphSeg(nameBlock, i))
  const blocks = layout.phrase.map((s) => buildBlock(s, art))
  const c0 = strokeSeg(strokePath(art, returnPath(layout.c0, W), lw))

  const phraseSegs: Seg[] = []
  layout.words.forEach((w, wi) => {
    const b = blocks[w.block]
    for (let i = w.first; i <= w.last; i++) phraseSegs.push(glyphSeg(b, i))
    const link = layout.links[wi]
    if (!link) return
    if (link.kind === 'gap') {
      const { a, b: bb, k } = link
      phraseSegs.push(strokeSeg(strokePath(art, `M ${f1(a.x)} ${f1(a.y)} C ${f1(a.x + 10 * k)} ${f1(a.y + 5 * k)} ${f1(bb.x - 10 * k)} ${f1(bb.y + 5 * k)} ${f1(bb.x)} ${f1(bb.y)}`, lw * 0.62)))
    } else {
      phraseSegs.push(strokeSeg(strokePath(art, returnPath(link, W), lw * 0.85)))
    }
  })

  const { c1, circle, flick } = layout
  const k1 = c1.k
  const seg1 = strokeSeg(
    strokePath(art, `M ${f1(c1.from.x)} ${f1(c1.from.y)} C ${f1(c1.from.x + 30 * k1)} ${f1(c1.from.y + 6 * k1)} ${f1(c1.to.x - 10 * k1)} ${f1(c1.to.y + 30 * k1)} ${f1(c1.to.x)} ${f1(c1.to.y)}`, lw * 0.8),
  )
  const cs = circlePoint(circle, circle.T0)
  let cd = `M ${f1(cs.x)} ${f1(cs.y)}`
  const N = 168
  for (let i = 1; i <= N; i++) {
    const p = circlePoint(circle, circle.T0 + ((circle.T1 - circle.T0) * i) / N)
    cd += ` L ${f1(p.x)} ${f1(p.y)}`
  }
  const sCircle = strokeSeg(strokePath(art, cd, lw))
  const sFlick = strokeSeg(
    strokePath(art, `M ${f1(flick.ce.x)} ${f1(flick.ce.y)} C ${f1(flick.p1.x)} ${f1(flick.p1.y)} ${f1(flick.p2.x)} ${f1(flick.p2.y)} ${f1(flick.F.x)} ${f1(flick.F.y)}`, lw),
  )
  return {
    layout,
    nameSegs,
    c0,
    phraseSegs,
    circleSegs: [seg1, sCircle],
    flick: sFlick,
    all: [...nameSegs, c0, ...phraseSegs, seg1, sCircle, sFlick],
    F: flick.F,
    tan: flick.tan,
  }
}

/* ─────────────────────────────────────────────────────────────
   Playback
   ───────────────────────────────────────────────────────────── */

export interface PlayHooks {
  /** called every frame with the pen position (main space) while drawing */
  pen(p: Pt): void
  burst(p: Pt): void
  finish(): void
}

/** Drive a group of segments with one eased progress value, split by how far the pen travels in each. */
function group(segs: Seg[], dur: number, ease: string, onPen: (p: Pt) => void) {
  const total = segs.reduce((a, s) => a + s.travel, 0)
  const o = { v: 0 }
  return gsap.fromTo(
    o,
    { v: 0 },
    {
      v: 1,
      duration: dur,
      ease,
      immediateRender: false,
      onUpdate() {
        let acc = o.v * total
        for (const s of segs) {
          const u = Math.max(0, Math.min(1, acc / s.travel))
          s.set(u)
          if (acc >= 0 && acc <= s.travel) onPen(s.point(u))
          acc -= s.travel
        }
      },
    },
  )
}

export function createTimeline(intro: IntroDOM, hooks: PlayHooks): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true })
  tl.add(() => intro.all.forEach((s) => s.set(0)))
    .add(group(intro.nameSegs, 2.5, 'power1.inOut', hooks.pen))
    .add(group([intro.c0], 0.75, 'sine.inOut', hooks.pen))
    .add(group(intro.phraseSegs, 3, 'power1.inOut', hooks.pen))
    .add(group(intro.circleSegs, 1.5, 'power2.inOut', hooks.pen))
    .add(group([intro.flick], 0.45, 'power2.out', hooks.pen))
    .add(() => {
      hooks.burst(intro.F)
      hooks.finish()
    })
  return tl
}
