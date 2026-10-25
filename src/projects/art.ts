import type { Project } from '../data/projects'

/** Every project gets one 1600x1000 canvas. It starts as procedural art and is
 *  painted over with the real screenshot if /shots/<id>.webp loads. */
export const SHOT_W = 1600
export const SHOT_H = 1000

interface Shot {
  canvas: HTMLCanvasElement
  loaded: boolean
  subs: Set<() => void>
}
const shots = new Map<string, Shot>()

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function drawArt(p: Project, c: HTMLCanvasElement) {
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const W = SHOT_W
  const H = SHOT_H
  const r = rng(hash(p.id))
  const mono = `"JetBrains Mono", ui-monospace, Menlo, monospace`
  const disp = `"Space Grotesk", system-ui, sans-serif`
  const accent = p.accent

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0b0b0d'
  ctx.fillRect(0, 0, W, H)

  // glow
  const gx = W * (0.55 + r() * 0.3)
  const gy = H * (0.35 + r() * 0.3)
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.6)
  g.addColorStop(0, accent + '55')
  g.addColorStop(0.5, accent + '14')
  g.addColorStop(1, 'transparent')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // perspective grid floor
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, H * 0.55, W, H * 0.45)
  ctx.clip()
  ctx.strokeStyle = accent + '40'
  ctx.lineWidth = 1.5
  const hz = H * 0.55
  for (let i = -20; i <= 20; i++) {
    ctx.beginPath()
    ctx.moveTo(W / 2 + i * 12, hz)
    ctx.lineTo(W / 2 + i * 150, H)
    ctx.stroke()
  }
  for (let i = 0; i < 12; i++) {
    const y = hz + Math.pow(i / 12, 2.2) * (H - hz)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  ctx.restore()

  // floating data blocks
  for (let i = 0; i < 14; i++) {
    const w = 40 + r() * 160
    const h = 8 + r() * 10
    ctx.fillStyle = r() > 0.6 ? accent + '88' : 'rgba(255,255,255,0.07)'
    ctx.fillRect(r() * W, r() * H * 0.55, w, h)
  }

  // window chrome
  const m = 70
  ctx.fillStyle = 'rgba(14,14,16,0.72)'
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(m, m, W - m * 2, H - m * 2, 22)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(m, m + 62)
  ctx.lineTo(W - m, m + 62)
  ctx.stroke()
  ;[accent, '#34343c', '#34343c'].forEach((col, i) => {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(m + 36 + i * 26, m + 31, 8, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = '#6c6a72'
  ctx.font = `500 22px ${mono}`
  ctx.textBaseline = 'middle'
  ctx.fillText(`~/work/${p.id}`, m + 130, m + 32)

  // prompt + title
  ctx.textBaseline = 'alphabetic'
  ctx.font = `400 28px ${mono}`
  ctx.fillStyle = '#a19fa6'
  ctx.fillText('clayton@harare', m + 48, m + 134)
  ctx.fillStyle = accent
  ctx.fillText(`~/work $`, m + 48 + 220, m + 134)
  ctx.fillStyle = '#ece9e4'
  ctx.fillText(`open ${p.id}`, m + 48 + 220 + 140, m + 134)

  let size = 150
  ctx.font = `700 ${size}px ${disp}`
  const maxW = W - m * 2 - 96
  while (ctx.measureText(p.title).width > maxW && size > 54) {
    size -= 6
    ctx.font = `700 ${size}px ${disp}`
  }
  ctx.fillStyle = '#ece9e4'
  ctx.shadowColor = accent
  ctx.shadowBlur = 40
  ctx.fillText(p.title, m + 44, m + 134 + 40 + size * 0.85)
  ctx.shadowBlur = 0

  // tagline wrapped
  ctx.font = `400 30px ${mono}`
  ctx.fillStyle = '#a19fa6'
  const words = p.tagline.split(' ')
  let line = ''
  let y = m + 134 + 40 + size * 0.85 + 66
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, m + 48, y)
      line = w
      y += 44
    } else line = t
  }
  ctx.fillText(line, m + 48, y)

  // log lines
  y = H - m - 150
  ctx.font = `400 24px ${mono}`
  p.highlights.slice(0, 3).forEach((h) => {
    ctx.fillStyle = '#4ade80'
    ctx.fillText('[ok]', m + 48, y)
    ctx.fillStyle = '#6c6a72'
    let t = h
    while (ctx.measureText(t).width > maxW - 90 && t.length > 8) t = t.slice(0, -2)
    if (t !== h) t = t.trimEnd() + '…'
    ctx.fillText(t, m + 48 + 76, y)
    y += 40
  })

  // noise
  const img = ctx.getImageData(0, 0, W, H)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 14
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)

  // scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.16)'
  for (let yy = 0; yy < H; yy += 4) ctx.fillRect(0, yy, W, 1.5)
}

function drawImageCover(c: HTMLCanvasElement, img: HTMLImageElement) {
  const ctx = c.getContext('2d')!
  const s = Math.max(SHOT_W / img.naturalWidth, SHOT_H / img.naturalHeight)
  const w = img.naturalWidth * s
  const h = img.naturalHeight * s
  ctx.fillStyle = '#0a0a0b'
  ctx.fillRect(0, 0, SHOT_W, SHOT_H)
  ctx.drawImage(img, (SHOT_W - w) / 2, 0, w, h) // anchor top: landing pages read best from the top
}

export function getShot(p: Project): Shot {
  let s = shots.get(p.id)
  if (s) return s
  const canvas = document.createElement('canvas')
  canvas.width = SHOT_W
  canvas.height = SHOT_H
  s = { canvas, loaded: false, subs: new Set() }
  shots.set(p.id, s)
  drawArt(p, canvas)
  const shot = s
  const notify = () => shot.subs.forEach((f) => f())

  // Redraw once fonts are in, unless a real screenshot already won.
  document.fonts?.ready.then(() => {
    if (!shot.loaded) {
      drawArt(p, canvas)
      notify()
    }
  })

  const img = new Image()
  img.decoding = 'async'
  img.onload = () => {
    if (img.naturalWidth < 50) return
    drawImageCover(canvas, img)
    shot.loaded = true
    notify()
  }
  img.onerror = () => {} // keep procedural art
  img.src = p.image
  return s
}

/** Small <canvas> thumbnail that stays in sync with the shot (art -> screenshot). */
export function makeThumb(p: Project, w = 800): HTMLCanvasElement {
  const shot = getShot(p)
  const c = document.createElement('canvas')
  c.width = w
  c.height = Math.round((w * SHOT_H) / SHOT_W)
  c.className = 'thumb'
  c.setAttribute('role', 'img')
  c.setAttribute('aria-label', `${p.title} — ${shot.loaded ? 'screenshot' : 'illustrated preview'}`)
  const paint = () => {
    const ctx = c.getContext('2d')!
    ctx.drawImage(shot.canvas, 0, 0, c.width, c.height)
    c.setAttribute('aria-label', `${p.title} — ${shot.loaded ? 'screenshot' : 'illustrated preview'}`)
  }
  paint()
  shot.subs.add(paint)
  return c
}
