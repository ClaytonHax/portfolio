// Regenerates src/data/glyphs.json from Sacramento. Run: npm run glyphs
// Format: { Clayton|phrase|CB: { paths: [{ d, w }], box: [x, y, w, h] } }, one path per glyph, `w` = word index, baseline y = 200.
import opentype from 'opentype.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const font = opentype.loadSync(path.join(here, 'fonts/Sacramento-Regular.ttf'))
const SIZE = Number(process.env.GLYPH_SIZE || 200)
const BASE = 200
const PAD = 6

function layout(text, size = SIZE) {
  const scale = size / font.unitsPerEm
  const glyphs = font.stringToGlyphs(text)
  const out = []
  let x = 0, w = 0
  glyphs.forEach((g, i) => {
    const ch = text[i]
    if (ch === ' ') { w++; x += g.advanceWidth * scale; return }
    const p = g.getPath(x, BASE, size)
    out.push({ d: p.toPathData(1), w, bb: p.getBoundingBox() })
    x += g.advanceWidth * scale
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * scale
  })
  return out
}
function pack(items) {
  let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9
  for (const p of items) { x1 = Math.min(x1, p.bb.x1); y1 = Math.min(y1, p.bb.y1); x2 = Math.max(x2, p.bb.x2); y2 = Math.max(y2, p.bb.y2) }
  return { paths: items.map(({ d, w }) => ({ d, w })), box: [Math.floor(x1) - PAD, Math.floor(y1) - PAD, Math.ceil(x2 - x1) + PAD * 2, Math.ceil(y2 - y1) + PAD * 2] }
}
const data = { Clayton: pack(layout('Clayton')), phrase: pack(layout('I build AI products')), CB: pack(layout('CB')) }
fs.writeFileSync(path.join(here, '../src/data/glyphs.json'), JSON.stringify(data))
for (const k in data) console.log(k, data[k].box, data[k].paths.length)

// Favicon: cursive "CB" in dark ink on a rounded light-glass square.
{
  const { paths, box } = data.CB
  const [bx, by, bw, bh] = box
  const s = 54 / bw
  const tx = (64 - bw * s) / 2 - bx * s, ty = (64 - bh * s) / 2 - by * s
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7ff"/><stop offset="1" stop-color="#c9d6f2"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#g)"/><rect x=".75" y=".75" width="62.5" height="62.5" rx="14.3" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.5"/><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})" fill="#0f1222" stroke="#0f1222" stroke-width="${(1.1 / s).toFixed(1)}" stroke-linejoin="round">${paths.map((p) => `<path d="${p.d}"/>`).join('')}</g></svg>\n`
  fs.writeFileSync(path.join(here, '../public/favicon.svg'), svg)
}
