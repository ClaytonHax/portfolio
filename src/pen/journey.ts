import type { Pt, Rect } from './glyph'

/* ─────────────────────────────────────────────────────────────
   The journey line: one smooth cubic-Bézier chain from the end of the flick,
   through every [data-pen-stop], ending in an underline flourish on the `end` stop.
   ───────────────────────────────────────────────────────────── */

export type Side = 'left' | 'right' | 'through' | 'end'
export interface Anchor {
  id: string
  side: Side
  gap: number
  rect: Rect
}
export interface Stop {
  id: string
  len: number
  pt: Pt
}
type Cubic = [Pt, Pt, Pt, Pt]
interface Way {
  id?: string
  p: Pt
  t: Pt
  free?: boolean // tangent derived from neighbours
}

export interface Journey {
  d: string
  /** polyline length of the whole path (rescale to the native length with `scale`) */
  total: number
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

  let prevSide: Side | null = null
  let prevY = F.y
  for (const a of list) {
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
    pushWay({ id: a.id, p: { x, y: cy }, t: a.side === 'through' ? { x: 0, y: 1 } : { x: 0, y: 1 }, free: a.side === 'through' && a.rect.w > 4 }) // tiny marker stops keep a vertical tangent
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
    const P = (x: number, y: number): Pt => ({ x, y })
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

  const curves: Cubic[] = []
  for (let i = 1; i < ways.length; i++) curves.push(hermite(ways[i - 1], ways[i]))
  const chainCurves = curves.length
  curves.push(...hook)

  // sample into a table
  const lens: number[] = [0]
  const xs: number[] = [F.x]
  const ys: number[] = [F.y]
  const cum: number[] = []
  let acc = 0
  for (const [p0, p1, p2, p3] of curves) {
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
    cum.push(acc)
  }

  const stops: Stop[] = []
  for (let i = 1; i < ways.length; i++) if (ways[i].id) stops.push({ id: ways[i].id!, len: cum[i - 1], pt: ways[i].p })

  // monotone scroll key: running-max y along the chain, then a pseudo-height for the end flourish
  const n = lens.length
  const key = new Float32Array(n)
  const approachLen = endWay ? cum[chainCurves - 1] : acc
  let run = -1e9
  let i = 0
  for (; i < n && lens[i] <= approachLen + 1e-3; i++) {
    run = Math.max(run, ys[i])
    key[i] = run
  }
  const endKeyY = run
  for (; i < n; i++) key[i] = endKeyY + ((lens[i] - approachLen) / Math.max(1, acc - approachLen)) * KEY_U
  const keyEnd = endWay ? endKeyY + KEY_U : endKeyY

  let d = `M ${f1(F.x)} ${f1(F.y)}`
  for (const [, p1, p2, p3] of curves) d += ` C ${f1(p1.x)} ${f1(p1.y)} ${f1(p2.x)} ${f1(p2.y)} ${f1(p3.x)} ${f1(p3.y)}`

  return {
    d,
    total: acc,
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
