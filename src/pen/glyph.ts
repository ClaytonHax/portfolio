import data from '../data/glyphs.json'

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

/** A run of glyphs drawn at one scale inside its own nested <svg>, revealed through a mask of thick traced strokes. */
export interface BlockSpec {
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
  maskW: number
  inkW: number
}

export interface Block {
  spec: BlockSpec
  masks: SVGPathElement[]
  lens: number[]
  toWorld(p: Pt): Pt
}

let uid = 0

export function toWorld(spec: BlockSpec, p: Pt): Pt {
  return { x: spec.ox + (p.x - spec.vx) * spec.s, y: spec.oy + (p.y - spec.set.box[1]) * spec.s }
}

export function buildBlock(spec: BlockSpec, parent: SVGElement): Block {
  const { set, idxs, s, ox, oy, vx, vw, maskW, inkW } = spec
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
  const m = measure(set)
  n.innerHTML =
    `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${vx - 30}" y="${by - 30}" width="${vw + 60}" height="${bh + 60}">` +
    idxs
      .map((i) => `<path d="${set.paths[i].d}" fill="none" stroke="#fff" stroke-width="${maskW}" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('') +
    `</mask></defs><g mask="url(#${id})">` +
    idxs.map((i) => `<path class="pen-fill" d="${set.paths[i].d}" stroke-width="${inkW}"/>`).join('') +
    `</g>`
  parent.appendChild(n)
  return {
    spec,
    masks: [...n.querySelectorAll<SVGPathElement>('mask path')],
    lens: idxs.map((i) => m[i].len),
    toWorld: (p) => toWorld(spec, p),
  }
}
