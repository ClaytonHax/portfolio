import type { Pt, Rect } from './glyph'

/* ─────────────────────────────────────────────────────────────
   The journey line: one smooth cubic-Bézier chain from the end of the flick,
   through every [data-pen-stop], ending in an underline flourish on the `end` stop.
   ───────────────────────────────────────────────────────────── */

export type Side = 'left' | 'right' | 'through' | 'end' | 'trace'
/** A closed rounded rect the line traces (main-relative px, already inflated). */
export interface TraceShape {
  id: string
  x: number
  y: number
  w: number
  h: number
  r: number
}
export interface Anchor {
  id: string
  side: Side
  gap: number
  /** for `trace`: the stage box (x, y of its spacer, w, own h) */
  rect: Rect
  /** `trace` only */
  shapes?: TraceShape[]
  /** pin distance (0 = none) and the journey key at which the pin starts */
  pinD?: number
  pinKey?: number
  /** extra pinned scroll after the trace, during which the line holds at the stage's exit */
  pinHold?: number
  /** `trace` only: line arrives from the right gutter (desktop) or from the left gutter (phone) and leaves the same way */
  phone?: boolean
}
export interface Stop {
  id: string
  len: number
  pt: Pt
  /** the point lives in the pinned (translated) trace piece */
  inB?: boolean
}
type Cubic = [Pt, Pt, Pt, Pt]
interface Item {
  c: Cubic
  /** key weight of this curve inside the trace */
  f?: number
  sStart?: number
  sEnd?: number
}
interface Way {
  id?: string
  p: Pt
  t: Pt
  free?: boolean // tangent derived from neighbours
  /** explicit curves leading into this way instead of a Hermite blend */
  via?: Item[]
}

export interface Journey {
  /** A (before the trace), B (the traced shapes, rides with the pinned stage), C (after) */
  dA: string
  dB: string
  dC: string
  /** polyline length of the whole path (rescale to the native lengths with `rescaleJourney`) */
  total: number
  /** length at the end of A (= start of B) and at the end of B (= start of C) */
  aLen: number
  bLen: number
  /** per traced shape, length range of its loop */
  shapes: { id: string; start: number; end: number }[]
  /** id of the trace stop, if any */
  traceId: string
  /** polyline indices where pieces change: samples 0..iA are A, iA..iB are B, iB+1.. are C */
  iA: number
  iB: number
  len: Float32Array
  x: Float32Array
  y: Float32Array
  /** monotone key used to map scroll depth onto path length */
  key: Float32Array
  stops: Stop[]
  /** length at which the end flourish begins, and its pseudo-height in key space */
  approachLen: number
  endKeyY: number
  keyEnd: number
  bottomY: number
}

const KEY_U = 190
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const unit = (x: number, y: number): Pt => {
  const m = Math.hypot(x, y) || 1
  return { x: x / m, y: y / m }
}
const f1 = (n: number) => n.toFixed(1)

function hermite(a: Way, b: Way): Cubic {
  const dx = b.p.x - a.p.x
  const dy = Math.max(8, b.p.y - a.p.y)
  const h = 0.5 * Math.max(dy, 0.4 * Math.abs(dx))
  return [a.p, { x: a.p.x + a.t.x * h, y: a.p.y + a.t.y * h }, { x: b.p.x - b.t.x * h, y: b.p.y - b.t.y * h }, b.p]
}

const P = (x: number, y: number): Pt => ({ x, y })
const KAPPA = 0.5523
const lineC = (a: Pt, b: Pt): Cubic => [a, P(a.x + (b.x - a.x) / 3, a.y + (b.y - a.y) / 3), P(a.x + ((b.x - a.x) * 2) / 3, a.y + ((b.y - a.y) * 2) / 3), b]

/**
 * One clockwise loop round a rounded rect, starting and ending at its LEFT-middle (heading up), then `retrace`:
 * the same path again (invisible, already inked) up, over and down to the RIGHT-middle, where the hop leaves.
 */
function ringCurves(s: TraceShape): { ring: Cubic[]; retrace: Cubic[]; L: Pt; R: Pt } {
  const r = Math.max(0, Math.min(s.r, s.w / 2, s.h / 2))
  const k = KAPPA * r
  const x0 = s.x
  const y0 = s.y
  const x1 = s.x + s.w
  const y1 = s.y + s.h
  const ym = s.y + s.h / 2
  const L = P(x0, ym)
  const R = P(x1, ym)
  const up = lineC(L, P(x0, y0 + r))
  const tl: Cubic = [P(x0, y0 + r), P(x0, y0 + r - k), P(x0 + r - k, y0), P(x0 + r, y0)]
  const top = lineC(P(x0 + r, y0), P(x1 - r, y0))
  const tr: Cubic = [P(x1 - r, y0), P(x1 - r + k, y0), P(x1, y0 + r - k), P(x1, y0 + r)]
  const dnA = lineC(P(x1, y0 + r), R)
  const dnB = lineC(R, P(x1, y1 - r))
  const br: Cubic = [P(x1, y1 - r), P(x1, y1 - r + k), P(x1 - r + k, y1), P(x1 - r, y1)]
  const bot = lineC(P(x1 - r, y1), P(x0 + r, y1))
  const bl: Cubic = [P(x0 + r, y1), P(x0 + r - k, y1), P(x0, y1 - r + k), P(x0, y1 - r)]
  const upB = lineC(P(x0, y1 - r), L)
  return { ring: [up, tl, top, tr, dnA, dnB, br, bot, bl, upB], retrace: [up, tl, top, tr, dnA], L, R }
}

/**
 * The hop between two phones: leaves `a` heading down, dips into the gap, makes one cursive loop-de-loop and rises into `b` heading up.
 * A prolate trochoid (x = kθ + r sinθ, y = -ry (1 - cosθ)) with eased ends, converted to a Catmull-Rom chain of cubics.
 */
function swoosh(a: Pt, b: Pt): Item[] {
  const gx = Math.max(24, b.x - a.x)
  const r = clamp(gx / 9, 9, 24)
  const ry = r * 1.15
  const k = Math.max(1, (gx - 2 * r) / (3 * Math.PI))
  const th0 = -Math.PI / 2
  const th1 = 2.5 * Math.PI
  const N = 36
  const pts: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const th = th0 + (th1 - th0) * u
    const g = th0 + (th1 - th0) * (u - Math.sin(4 * Math.PI * u) / (4 * Math.PI)) // forward travel concentrated at the dips, none at the loop's crown
    pts.push(P(a.x + (k * (g - th0)) + r * (Math.sin(th) + 1), a.y + ry * (Math.cos(th) - 1) + ry + (b.y - a.y) * u))
  }
  // fit the end exactly
  const ex = b.x - pts[N].x
  pts.forEach((q, i) => (q.x += (ex * i) / N))
  const out: Item[] = []
  for (let i = 0; i < N; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(N, i + 2)]
    out.push({
      c: [p1, P(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6), P(p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6), p2],
      f: 0.6,
    })
  }
  return out
}

export function buildJourney(F: Pt, tan: Pt, anchors: Anchor[], W: number, H: number): Journey {
  const M = 9
  const ways: Way[] = [{ p: F, t: tan }]
  const pushWay = (w: Way) => {
    const prev = ways[ways.length - 1]
    // lines only ever travel down the page; keep each waypoint below the last
    if (w.p.y < prev.p.y + 20) w.p = { x: w.p.x, y: prev.p.y + 20 }
    ways.push(w)
  }

  const endA = anchors.filter((a) => a.side === 'end').pop()
  const list = anchors.filter((a) => a !== endA)
  if (!endA && !list.length) {
    // nothing to pass: drift down the page
    list.push({ id: '', side: 'through', gap: 0, rect: { x: W * 0.5 - 1, y: H - 80, w: 2, h: 2 } })
  }

  // trace stop (at most one): approach, loops, hops, exit — all in the stage's unpinned coordinates
  let traceWay = -1
  let traceExitWay = -1
  let traceId = ''
  let traceShapes: TraceShape[] = []
  let kS = 0
  let kSpan = 1
  let traceD = 0

  let prevSide: Side | null = null
  let prevY = F.y
  for (const a of list) {
    if (a.side === 'trace' && a.shapes?.length && traceWay < 0) {
      const sh = a.shapes
      const rings = sh.map(ringCurves)
      const g0 = rings[0]
      const gN = rings[rings.length - 1]
      const sN = sh[sh.length - 1]
      const ent = g0.L
      const prev = ways[ways.length - 1]
      const stageBottom = a.rect.y + a.rect.h
      const mk = (c: Cubic[], f: number): Item[] => c.map((q) => ({ c: q, f }))
      let approach: Cubic[]
      let hookY = ent.y
      if (a.phone) {
        // down the left gutter, then a small hook under the phone's left-middle and up into it (the loop starts heading up)
        const G = P(M + 6, ent.y + 28)
        hookY = G.y
        approach = [
          hermite(prev, { p: G, t: { x: 0, y: 1 } }),
          [G, P(G.x, G.y + 56), P(ent.x, G.y + 56), ent],
        ]
      } else {
        // down the right of the section head, a lazy sweep left between head and phones, down the left of the first phone, hook up into its left-middle
        const X0 = clamp(a.rect.x + a.rect.w + a.gap, M, W - M)
        const topMin = Math.min(...sh.map((s) => s.y))
        pushWay({ p: P(X0, topMin - 104), t: { x: 0, y: 1 } })
        const w0 = ways[ways.length - 1].p
        const Ym = Math.max(topMin - 30, w0.y + 30)
        const xA = Math.max(M + 4, ent.x - 46)
        const Xm = (xA + X0) / 2
        const R2 = 56
        const Hy = ent.y + 14
        hookY = Hy
        approach = [
          [w0, P(w0.x, w0.y + KAPPA * (Ym - w0.y)), P(Xm + KAPPA * (X0 - Xm), Ym), P(Xm, Ym)],
          [P(Xm, Ym), P(Xm - KAPPA * (Xm - xA), Ym), P(xA, Ym + R2 - KAPPA * R2), P(xA, Ym + R2)],
          lineC(P(xA, Ym + R2), P(xA, Hy)),
          [P(xA, Hy), P(xA, Hy + 62), P(ent.x, Hy + 62), ent],
        ]
      }
      ways.push({ id: a.id, p: ent, t: { x: 0, y: -1 }, via: approach.map((c) => ({ c })) })
      traceWay = ways.length - 1
      traceId = a.id
      traceShapes = sh

      // B: loop (counted for p), retrace to the right-middle, hop to the next shape's left-middle
      const items: Item[] = []
      sh.forEach((_s, si) => {
        const q = rings[si]
        if (si > 0) {
          // from the previous right-middle (heading down): a cursive swoosh, dipping into the gap, a small loop-de-loop, and up into this left-middle (heading up)
          items.push(...swoosh(rings[si - 1].R, q.L))
        }
        const loop = mk(q.ring, 1)
        loop[0].sStart = si
        loop[loop.length - 1].sEnd = si
        items.push(...loop, ...mk(q.retrace, 0.6))
      })
      const r = Math.max(0, Math.min(sN.r, sN.w / 2, sN.h / 2))
      let E: Pt
      if (a.phone) {
        // over the top-left in a small arch and straight down the left gutter
        const G = P(M + 6, ent.y + 28)
        E = P(G.x, Math.max(G.y + 24, stageBottom))
        items.pop()
        items.pop()
        items.pop()
        items.pop()
        items.pop() // the retrace is pointless on a phone: leave straight from the left-middle
        items.push(
          { c: [gN.L, P(gN.L.x, gN.L.y - 52), P(G.x, gN.L.y - 52), P(G.x, gN.L.y)], f: 0.6 },
          { c: lineC(P(G.x, gN.L.y), E), f: 0.6 },
        )
      } else {
        // down the right side to near the bottom-right corner, drift out and straight down off the stage
        const gx = clamp(W - M - (sN.x + sN.w), 10, 24)
        const R = gN.R
        const Yb = sN.y + sN.h - r * 0.4
        const S = P(R.x + gx, Yb)
        E = P(S.x, Math.max(S.y + 24, stageBottom))
        items.push(
          { c: [R, P(R.x, R.y + 0.45 * (Yb - R.y)), P(S.x, Yb - 0.45 * (Yb - R.y)), S], f: 0.6 },
          { c: lineC(S, E), f: 0.6 },
        )
      }
      traceD = Math.max(0, a.pinD ?? 0)
      const exitWay: Way = { p: P(E.x, E.y + traceD + Math.max(0, a.pinHold ?? 0)), t: { x: 0, y: 1 }, via: items }
      ways.push(exitWay)
      traceExitWay = ways.length - 1
      if (traceD > 0 && a.pinKey !== undefined) {
        kS = a.pinKey
        kSpan = traceD
      } else {
        kS = hookY
        kSpan = Math.max(1, sN.y + sN.h - hookY)
      }
      prevSide = null
      prevY = exitWay.p.y
      continue
    }
    const cy = a.rect.y + a.rect.h / 2
    let x: number
    if (a.side === 'left') x = clamp(a.rect.x - a.gap, M, W - M)
    else if (a.side === 'right') x = clamp(a.rect.x + a.rect.w + a.gap, M, W - M)
    else x = a.rect.x + a.rect.w / 2
    // long same-side runs get a gentle outward bow so they never read as a ruler line
    if ((a.side === 'left' || a.side === 'right') && a.side === prevSide && cy - prevY > 260) {
      const dir = a.side === 'left' ? -1 : 1
      const bow = clamp((cy - prevY) * 0.05, 10, 34)
      const bx = clamp(x + dir * bow, M, W - M)
      if (Math.abs(bx - x) > 4) pushWay({ p: { x: bx, y: (cy + prevY) / 2 }, t: { x: 0, y: 1 } })
    }
    pushWay({ id: a.id, p: { x, y: cy }, t: { x: 0, y: 1 }, free: a.side === 'through' && a.rect.w > 4 }) // tiny marker stops keep a vertical tangent
    prevSide = a.side
    prevY = cy
  }

  // end stop: arrive down its left side, hook under it, underline it left → right, flourish
  let hook: Cubic[] = []
  let endWay: Way | null = null
  if (endA) {
    const r = endA.rect
    const R = clamp(r.h * 0.3, 14, 34)
    const yU = r.y + r.h + 4
    const Rx = R + 26
    const a = Math.max(M + 2, r.x - Rx)
    const Rr = Math.min(W - 14, r.x + r.w + 6)
    const L0 = a + Rx
    const w = Math.max(40, Rr - L0)
    endWay = { id: endA.id, p: P(a, yU - R), t: { x: 0, y: 1 } }
    pushWay(endWay)
    const U3 = P(Rr, yU + 3)
    const fs = clamp((W - 12 - Rr) / 40, 0.3, 1) * clamp(r.h / 70, 0.7, 1.15)
    hook = [
      [P(a, yU - R), P(a, yU - R + 0.55 * R), P(a + Rx - 0.55 * Rx, yU), P(L0, yU)],
      [P(L0, yU), P(L0 + 0.3 * w, yU + 1.5), P(L0 + 0.68 * w, yU + 6), U3],
      // closing flourish: a small cursive curl
      [U3, P(U3.x + 17 * fs, U3.y - 1.5 * fs), P(U3.x + 31 * fs, U3.y - 15 * fs), P(U3.x + 25 * fs, U3.y - 29 * fs)],
      [P(U3.x + 25 * fs, U3.y - 29 * fs), P(U3.x + 20 * fs, U3.y - 41 * fs), P(U3.x + 2 * fs, U3.y - 40 * fs), P(U3.x + 1 * fs, U3.y - 25 * fs)],
      [P(U3.x + 1 * fs, U3.y - 25 * fs), P(U3.x, U3.y - 13 * fs), P(U3.x + 9 * fs, U3.y - 5 * fs), P(U3.x + 20 * fs, U3.y - 8 * fs)],
    ]
  }

  // tangents for `through` waypoints follow their neighbours
  for (let i = 1; i < ways.length; i++) {
    if (!ways[i].free) continue
    const a = ways[i - 1].p
    const b = (ways[i + 1] ?? ways[i]).p
    const d = unit(b.x - a.x, Math.max(1, b.y - a.y))
    const t = d.y < 0.5 ? unit(d.x < 0 ? -0.87 : 0.87, 0.5) : d
    ways[i].t = t
  }

  // sample into one table: A = samples 0..iA, B = iA..iB, C = iB+1.. (C0 repeats B's end length, shifted by the pin distance)
  const lens: number[] = [0]
  const xs: number[] = [F.x]
  const ys: number[] = [F.y]
  const wayEnd: number[] = [0] // sample index at each way
  const wayLen: number[] = [0]
  const bItems: { i0: number; i1: number; f: number }[] = []
  const shapeRange: { id: string; start: number; end: number }[] = []
  let acc = 0
  let iA = -1
  let iB = -1
  const f1d = (c: Cubic) => ` C ${f1(c[1].x)} ${f1(c[1].y)} ${f1(c[2].x)} ${f1(c[2].y)} ${f1(c[3].x)} ${f1(c[3].y)}`
  let dA = `M ${f1(F.x)} ${f1(F.y)}`
  let dB = ''
  let dC = ''
  let cur: 'A' | 'B' | 'C' = 'A'

  const sampleCurve = (c: Cubic): void => {
    const [p0, p1, p2, p3] = c
    const chord = Math.hypot(p3.x - p0.x, p3.y - p0.y) + Math.hypot(p1.x - p0.x, p1.y - p0.y)
    const n = clamp(Math.ceil(chord / 9), 14, 150)
    let lx = p0.x
    let ly = p0.y
    for (let i = 1; i <= n; i++) {
      const t = i / n
      const u = 1 - t
      const b0 = u * u * u
      const b1 = 3 * u * u * t
      const b2 = 3 * u * t * t
      const b3 = t * t * t
      const x = b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x
      const y = b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y
      acc += Math.hypot(x - lx, y - ly)
      lx = x
      ly = y
      lens.push(acc)
      xs.push(x)
      ys.push(y)
    }
    const dd = f1d(c)
    if (cur === 'A') dA += dd
    else if (cur === 'B') dB += dd
    else dC += dd
  }

  const sampleChain = (items: Item[], inB: boolean) => {
    for (const it of items) {
      const i0 = lens.length - 1
      if (it.sStart !== undefined) shapeRange.push({ id: traceShapes[it.sStart].id, start: acc, end: acc })
      sampleCurve(it.c)
      if (inB) bItems.push({ i0, i1: lens.length - 1, f: it.f ?? 1 })
      if (it.sEnd !== undefined) shapeRange[it.sEnd].end = acc
    }
  }

  for (let i = 1; i < ways.length; i++) {
    const w = ways[i]
    if (i === traceExitWay) {
      // the trace: B starts where A ended (the entry point)
      iA = lens.length - 1
      cur = 'B'
      dB = `M ${f1(xs[iA])} ${f1(ys[iA])}`
      sampleChain(w.via!, true)
      iB = lens.length - 1
      // C0: same length, stage bottom shifted by the pin distance
      cur = 'C'
      lens.push(acc)
      xs.push(w.p.x)
      ys.push(w.p.y)
      dC = `M ${f1(w.p.x)} ${f1(w.p.y)}`
    } else if (w.via) {
      sampleChain(w.via, false)
    } else {
      sampleCurve(hermite(ways[i - 1], w))
    }
    wayEnd.push(lens.length - 1)
    wayLen.push(acc)
  }
  const chainLen = acc
  for (const c of hook) sampleCurve(c)

  const stops: Stop[] = []
  for (let i = 1; i < ways.length; i++) {
    if (!ways[i].id) continue
    stops.push({ id: ways[i].id!, len: wayLen[i], pt: ways[i].p, inB: i === traceWay })
  }
  if (iA >= 0) {
    for (const s of shapeRange) {
      const sh = traceShapes.find((q) => q.id === s.id)!
      stops.push({ id: s.id, len: s.end, pt: P(sh.x, sh.y + sh.h / 2), inB: true })
    }
  }

  // monotone scroll key: running-max y along the chain, then a pseudo-height for the end flourish
  const n = lens.length
  const key = new Float32Array(n)
  const approachLen = endWay ? chainLen : acc
  const hasTrace = iA >= 0
  const skip = (i: number) => hasTrace && i > iA && i <= iB
  let run = -1e9
  const kEndB = kS + kSpan
  let endKeyY = -1e9
  for (let i = 0; i < n; i++) {
    if (skip(i)) continue
    if (hasTrace && i === iB + 1) run = Math.max(run, kEndB)
    if (lens[i] <= approachLen + 1e-3) {
      run = Math.max(run, ys[i])
      key[i] = run
      endKeyY = run
    }
  }
  if (hasTrace) {
    // the approach finishes exactly at the pin start: stretch (or squeeze) its curves over [key before it, kS]
    const iStart = wayEnd[traceWay - 1] ?? 0
    const lo = key[iStart]
    if (lo >= kS) {
      for (let i = 0; i <= iA; i++) key[i] = Math.min(key[i], kS)
    } else {
      const span = Math.max(1e-6, lens[iA] - lens[iStart])
      for (let i = iStart; i <= iA; i++) key[i] = lo + ((kS - lo) * (lens[i] - lens[iStart])) / span
    }
    // B: key advances with length, hops and the exit counting a little less than the loops
    let tot = 0
    for (const it of bItems) tot += it.f * (lens[it.i1] - lens[it.i0])
    tot = Math.max(1e-6, tot)
    let before = 0
    for (const it of bItems) {
      const span = Math.max(1e-6, lens[it.i1] - lens[it.i0])
      for (let i = it.i0 + 1; i <= it.i1; i++) key[i] = kS + (kSpan * (before + (it.f * (lens[i] - lens[it.i0]))) ) / tot
      before += it.f * span
    }
    key[iA] = kS
    key[iB] = kEndB
  }
  for (let i = 0; i < n; i++) if (lens[i] > approachLen + 1e-3 && !skip(i)) key[i] = endKeyY + ((lens[i] - approachLen) / Math.max(1, acc - approachLen)) * KEY_U
  const keyEnd = endWay ? endKeyY + KEY_U : endKeyY

  return {
    dA,
    dB,
    dC,
    total: acc,
    aLen: hasTrace ? lens[iA] : acc,
    bLen: hasTrace ? lens[iB] : acc,
    shapes: shapeRange,
    traceId,
    iA: hasTrace ? iA : n - 1,
    iB: hasTrace ? iB : n - 1,
    len: Float32Array.from(lens),
    x: Float32Array.from(xs),
    y: Float32Array.from(ys),
    key,
    stops,
    approachLen,
    endKeyY,
    keyEnd,
    bottomY: Math.max(...ys),
  }
}

/**
 * The three pieces are separate <path>s whose native lengths differ slightly from the polyline's.
 * Rescale every length in the journey so lengthAtKey / pointAtLength / stops speak native lengths of A+B+C.
 */
export function rescaleJourney(j: Journey, nA: number, nB: number, nC: number): void {
  const pA = j.aLen
  const pB = j.bLen - j.aLen
  const pC = j.total - j.bLen
  const kA = pA > 0 ? nA / pA : 1
  const kB = pB > 1e-6 ? nB / pB : 1
  const kC = pC > 1e-6 ? nC / pC : 1
  const f = (l: number, idx = -1): number => {
    const inA = idx >= 0 ? idx <= j.iA : l <= pA + 1e-3
    if (inA) return l * kA
    const inB = idx >= 0 ? idx <= j.iB : l <= j.bLen + 1e-3
    if (inB) return nA + (l - pA) * kB
    return nA + nB + (l - j.bLen) * kC
  }
  for (let i = 0; i < j.len.length; i++) j.len[i] = f(j.len[i], i)
  for (const s of j.stops) s.len = f(s.len)
  for (const s of j.shapes) {
    s.start = f(s.start)
    s.end = f(s.end)
  }
  j.approachLen = f(j.approachLen)
  j.total = nA + nB + nC
  j.aLen = nA
  j.bLen = nA + nB
}

/** Binary search: first index with arr[i] >= v. */
function lower(arr: Float32Array, v: number): number {
  let lo = 0
  let hi = arr.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (arr[mid] < v) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** Path length reached when the pen is at scroll-depth `k` (doc y, with the end flourish stretched). */
export function lengthAtKey(j: Journey, k: number): number {
  if (k <= j.key[0]) return 0
  const last = j.key.length - 1
  if (k >= j.key[last]) return j.len[last]
  const i = lower(j.key, k)
  const a = j.key[i - 1]
  const b = j.key[i]
  const t = b - a < 1e-6 ? 1 : (k - a) / (b - a)
  return j.len[i - 1] + (j.len[i] - j.len[i - 1]) * t
}

export function pointAtLength(j: Journey, l: number, out: Pt): Pt {
  const last = j.len.length - 1
  if (l <= 0) {
    out.x = j.x[0]
    out.y = j.y[0]
    return out
  }
  if (l >= j.len[last]) {
    out.x = j.x[last]
    out.y = j.y[last]
    return out
  }
  const i = lower(j.len, l)
  const a = j.len[i - 1]
  const t = (l - a) / Math.max(1e-6, j.len[i] - a)
  out.x = j.x[i - 1] + (j.x[i] - j.x[i - 1]) * t
  out.y = j.y[i - 1] + (j.y[i] - j.y[i - 1]) * t
  return out
}
