import { isTouch, reducedMotion, gsap } from '../core/motion'
import type { Ink } from './ink'

/** Ink-nib cursor (desktop, fine pointer only): a small dot that follows the mouse with damped lag and leaves a faint trail. */
export function initCursor(ink: Ink): void {
  if (isTouch || reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const nib = document.createElement('div')
  nib.className = 'pen-nib'
  nib.setAttribute('aria-hidden', 'true')
  document.body.appendChild(nib)

  let tx = -100
  let ty = -100
  let x = -100
  let y = -100
  let seen = false
  let running = false
  let grow = false
  let moved = 0

  const frame = (_t: number, dtMs: number) => {
    const dt = Math.min(0.05, dtMs / 1000)
    const a = 1 - Math.exp(-dt / 0.06)
    x += (tx - x) * a
    y += (ty - y) * a
    nib.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${grow ? 2.6 : 1})`
    if (Math.hypot(tx - x, ty - y) > 1.5) ink.trail(x, y)
    if (performance.now() - moved > 900 && Math.hypot(tx - x, ty - y) < 0.3) {
      running = false
      gsap.ticker.remove(frame)
    }
  }
  const wake = () => {
    moved = performance.now()
    if (running) return
    running = true
    gsap.ticker.add(frame)
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return
      tx = e.clientX
      ty = e.clientY
      if (!seen) {
        seen = true
        x = tx
        y = ty
        nib.classList.add('is-on')
      }
      const el = e.target as Element | null
      grow = !!el?.closest?.('a, button, [role="button"], summary')
      wake()
    },
    { passive: true },
  )
  document.addEventListener('mouseleave', () => nib.classList.remove('is-on'))
  document.addEventListener('mouseenter', () => seen && nib.classList.add('is-on'))
}
