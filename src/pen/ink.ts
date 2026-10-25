import { gsap, lowPower, reducedMotion } from '../core/motion'

/**
 * The #ink canvas: a soft glow on the pen tip plus ink flecks. Coordinates are document px, so flecks stay
 * where they were dropped while the page scrolls. The ticker only runs while something is visible.
 */
export interface Ink {
  /** pen tip at document position; call every frame while the pen is moving */
  tip(x: number, y: number): void
  burst(x: number, y: number, n: number, speed?: number, size?: number): void
  resize(): void
  refreshTheme(): void
  destroy(): void
}

export function createInk(canvas: HTMLCanvasElement): Ink {
  const ctx = canvas.getContext('2d')!
  const SN = lowPower ? 700 : 1400
  const px = new Float32Array(SN)
  const py = new Float32Array(SN)
  const vx = new Float32Array(SN)
  const vy = new Float32Array(SN)
  const life = new Float32Array(SN)
  const size = new Float32Array(SN)
  let head = 0
  let alive = 0

  let dpr = 1
  let W = 0
  let H = 0
  let night = false
  let glowRGB = '255,255,255'
  let partRGB = '255,255,255'

  let tipX = 0
  let tipY = 0
  let lastX = 0
  let lastY = 0
  let hasTip = false
  let lastTipT = -1e9
  let glow = 0
  let running = false
  let lastT = 0
  let carry = 0

  const now = () => performance.now()

  function refreshTheme() {
    const cs = getComputedStyle(document.documentElement)
    night = document.documentElement.dataset.theme === 'night'
    glowRGB = cs.getPropertyValue('--pen-glow').trim() || '255,255,255'
    partRGB = cs.getPropertyValue('--ink-particle').trim() || '255,255,255'
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
  }

  function emit(x: number, y: number, n: number, spd: number, sz: number) {
    for (let j = 0; j < n; j++) {
      const i = (head = (head + 1) % SN)
      if (life[i] <= 0) alive++
      const a = Math.random() * 6.283
      const v = Math.random() * spd
      px[i] = x
      py[i] = y
      vx[i] = Math.cos(a) * v
      vy[i] = Math.sin(a) * v
      life[i] = 1
      size[i] = sz * (0.5 + Math.random())
    }
  }

  function wake() {
    if (running || reducedMotion) return
    running = true
    lastT = now()
    gsap.ticker.add(frame)
  }

  function tip(x: number, y: number) {
    if (reducedMotion) return
    const t = now()
    const dist = hasTip ? Math.hypot(x - lastX, y - lastY) : 0
    lastX = x
    lastY = y
    tipX = x
    tipY = y
    hasTip = true
    lastTipT = t
    // more flecks the faster the pen moves
    carry += (lowPower ? 0.9 : 1.8) + Math.min(5, dist / 14) * (lowPower ? 0.5 : 1)
    const n = Math.floor(carry)
    carry -= n
    if (n > 0) emit(x, y, n, 1.9, 3)
    wake()
  }

  function burst(x: number, y: number, n: number, speed = 7, sz = 3.2) {
    if (reducedMotion) return
    emit(x, y, lowPower ? Math.ceil(n / 2) : n, speed, sz)
    wake()
  }

  function frame() {
    const t = now()
    const dt = Math.min(0.05, (t - lastT) / 1000)
    lastT = t
    const f = dt * 60
    const sy = window.scrollY
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = night ? 'lighter' : 'source-over'

    // glow eases in while the pen moves and out shortly after it stops
    const moving = t - lastTipT < 160
    glow += ((moving ? 1 : 0) - glow) * Math.min(1, dt * (moving ? 14 : 7))
    if (glow > 0.01 && hasTip) {
      const x = tipX
      const y = tipY - sy
      const r = 26
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(255,255,255,${0.95 * glow})`)
      g.addColorStop(0.35, `rgba(${night ? glowRGB : '255,255,255'},${0.42 * glow})`)
      g.addColorStop(1, `rgba(${glowRGB},0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 6.283)
      ctx.fill()
    }

    const drag = Math.pow(0.94, f)
    const dec = 0.013 * f
    for (let i = 0; i < SN; i++) {
      const l = life[i]
      if (l <= 0) continue
      px[i] += vx[i] * f
      py[i] += vy[i] * f
      vx[i] *= drag
      vy[i] = vy[i] * drag + 0.03 * f
      const nl = l - dec
      life[i] = nl
      if (nl <= 0) {
        alive--
        continue
      }
      ctx.fillStyle = `rgba(${partRGB},${nl})`
      const s = size[i]
      ctx.fillRect(px[i] - s / 2, py[i] - sy - s / 2, s, s)
    }
    ctx.globalCompositeOperation = 'source-over'

    if (!moving && glow <= 0.01 && alive <= 0) {
      ctx.clearRect(0, 0, W, H)
      running = false
      gsap.ticker.remove(frame)
    }
  }

  refreshTheme()
  resize()
  const onVis = () => {
    if (!document.hidden && alive > 0) wake()
  }
  document.addEventListener('visibilitychange', onVis)
  return {
    tip,
    burst,
    resize,
    refreshTheme,
    destroy() {
      gsap.ticker.remove(frame)
      document.removeEventListener('visibilitychange', onVis)
    },
  }
}
