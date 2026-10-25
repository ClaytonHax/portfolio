import data from '../data/glyphs.json'
import strokeData from '../data/strokes.json'

export const NS = 'http://www.w3.org/2000/svg'

export interface Pt {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface GlyphPath {
  d: string
  w: number
}
export interface GlyphSet {
  paths: GlyphPath[]
  box: [number, number, number, number]
}
export const GLYPHS = data as unknown as Record<'Clayton' | 'Banks' | 'Name' | 'CB', GlyphSet>

/** Hand-authored centerline of one pen stroke, in glyph space (baseline y=200). `lift`: the pen travels to the
 *  stroke's first point without ink (e.g. crossing the t). Strokes of a glyph are in writing order. */
export interface StrokeDef {
  p: [number, number][]
  lift?: boolean
}
export type SetKey = 'Clayton' | 'Banks' | 'Name'
export const STROKES = strokeData as unknown as Record<SetKey, StrokeDef[][]>

/** Catmull-Rom spline through the points, as cubic Bézier path data. */
export function smoothD(pts: [number, number][]): string {
  const P = (k: number) => pts[Math.max(0, Math.min(pts.length - 1, k))]
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = P(k - 1)
    const p1 = P(k)
    const p2 = P(k + 1)
    const p3 = P(k + 2)
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0]} ${p2[1]}`
  }
  return d
}

/** Time profile of a stroke: tight curves take longer. `cum[i]` is the fraction of the stroke's time spent by sample i. */
export interface Profile {
  cum: Float32Array
  /** curvature-weighted length, in the path's own units */
  weighted: number
}

/** Pen slows by SLOW (~35%) on the tightest curvature: time per length is 1 + K*c, c in 0..1. */
const SLOW_K = 1 / 0.65 - 1
export function profileOf(el: SVGPathElement, len: number, r0: number): Profile {
  const n = Math.max(24, Math.min(260, Math.round(len / 3)))
  const ds = len / n
  const px = new Float32Array(n + 1)
  const py = new Float32Array(n + 1)
  for (let i = 0; i <= n; i++) {
    const q = el.getPointAtLength((len * i) / n)
    px[i] = q.x
    py[i] = q.y
  }
  let c = new Float32Array(n + 1)
  for (let i = 1; i < n; i++) {
    const a1 = Math.atan2(py[i] - py[i - 1], px[i] - px[i - 1])
    const a2 = Math.atan2(py[i + 1] - py[i], px[i + 1] - px[i])
    let da = Math.abs(a2 - a1)
    if (da > Math.PI) da = 2 * Math.PI - da
    c[i] = Math.min(1, (da / ds) * r0)
  }
  for (let pass = 0; pass < 6; pass++) {
    const o = new Float32Array(n + 1)
    for (let i = 0; i <= n; i++) o[i] = (c[Math.max(0, i - 1)] + 2 * c[i] + c[Math.min(n, i + 1)]) / 4
    c = o
  }
  const cum = new Float32Array(n + 1)
  let acc = 0
  for (let i = 1; i <= n; i++) {
    acc += ds * (1 + SLOW_K * 0.5 * (c[i] + c[i - 1]))
    cum[i] = acc
  }
  for (let i = 1; i <= n; i++) cum[i] /= acc
  return { cum, weighted: acc }
}

/** Length fraction reached after time fraction t of a stroke. */
export function lenFrac(pr: Profile, t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const c = pr.cum
  let lo = 0
  let hi = c.length - 1
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (c[m] <= t) lo = m
    else hi = m
  }
  const f = (t - c[lo]) / Math.max(1e-9, c[hi] - c[lo])
  return (lo + f) / (c.length - 1)
}


/** Geometry of one glyph outline in glyph units. Measured once; independent of layout. */
export interface Metric {
  x1: number
  y1: number
  x2: number
  y2: number
  len: number
}

const cache = new WeakMap<GlyphSet, Metric[]>()

export function measure(set: GlyphSet): Metric[] {
  const hit = cache.get(set)
  if (hit) return hit
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', '1')
  svg.setAttribute('height', '1')
  svg.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none'
  document.body.appendChild(svg)
  const out = set.paths.map((p) => {
    const el = document.createElementNS(NS, 'path')
    el.setAttribute('d', p.d)
    svg.appendChild(el)
    const b = el.getBBox()
    return { x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height, len: el.getTotalLength() }
  })
  svg.remove()
  cache.set(set, out)
  return out
}

/** A run of glyphs drawn at one scale inside its own nested <svg>: the filled outlines, revealed through a mask of
 *  thick round-capped centerline strokes. */
export interface BlockSpec {
  key: SetKey
  set: GlyphSet
  idxs: number[]
  /** px per glyph unit */
  s: number
  /** nested svg origin in parent px */
  ox: number
  oy: number
  /** glyph-space left edge and width of the viewBox */
  vx: number
  vw: number
  /** mask stroke width, glyph units (must cover the outline: see coverage tooling) */
  maskW: number
  inkW: number
}

export interface StrokeRef {
  el: SVGPathElement
  len: number
  lift: boolean
  /** first / last centerline point, glyph space */
  a: Pt
  b: Pt
  prof: Profile
  /** reveal up to length fraction f */
  reveal(f: number): void
  /** glyph-space point at length fraction f */
  at(f: number): Pt
}

export interface Block {
  spec: BlockSpec
  /** strokes per glyph (indexed like spec.idxs), in writing order */
  refs: StrokeRef[][]
  toWorld(p: Pt): Pt
}

let uid = 0

export function toWorld(spec: BlockSpec, p: Pt): Pt {
  return { x: spec.ox + (p.x - spec.vx) * spec.s, y: spec.oy + (p.y - spec.set.box[1]) * spec.s }
}

export function buildBlock(spec: BlockSpec, parent: SVGElement): Block {
  const { key, set, idxs, s, ox, oy, vx, vw, maskW, inkW } = spec
  const by = set.box[1]
  const bh = set.box[3]
  const id = `pm${++uid}`
  const n = document.createElementNS(NS, 'svg')
  n.setAttribute('viewBox', `${vx} ${by} ${vw} ${bh}`)
  n.setAttribute('x', ox.toFixed(2))
  n.setAttribute('y', oy.toFixed(2))
  n.setAttribute('width', (vw * s).toFixed(2))
  n.setAttribute('height', (bh * s).toFixed(2))
  n.setAttribute('overflow', 'visible')
  const defs = idxs.map((i) => STROKES[key][i])
  n.innerHTML =
    `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${vx - 30}" y="${by - 30}" width="${vw + 60}" height="${bh + 60}">` +
    defs
      .map((g) => g.map((st) => `<path d="${smoothD(st.p)}" fill="none" stroke="#fff" stroke-width="${maskW}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''))
      .join('') +
    `</mask></defs><g mask="url(#${id})">` +
    idxs.map((i) => `<path class="pen-fill" d="${set.paths[i].d}" stroke-width="${inkW}"/>`).join('') +
    `</g>`
  parent.appendChild(n)
  const els = [...n.querySelectorAll<SVGPathElement>('mask path')]
  let k = 0
  const refs = defs.map((g) =>
    g.map((st) => {
      const el = els[k++]
      const len = el.getTotalLength()
      el.style.strokeDasharray = `${len} ${len}`
      el.style.strokeDashoffset = String(len)
      const a = st.p[0]
      const b = st.p[st.p.length - 1]
      return {
        el,
        len,
        lift: !!st.lift,
        a: { x: a[0], y: a[1] },
        b: { x: b[0], y: b[1] },
        prof: profileOf(el, len, 30),
        reveal(f: number) {
          el.style.strokeDashoffset = String(len * (1 - Math.min(1, Math.max(0, f))))
        },
        at(f: number) {
          return el.getPointAtLength(len * Math.min(1, Math.max(0, f)))
        },
      } as StrokeRef
    }),
  )
  return { spec, refs, toWorld: (p) => toWorld(spec, p) }
}
