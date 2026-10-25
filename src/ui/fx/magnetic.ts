import { gsap, isTouch, reducedMotion } from '../../core/motion'

/** Magnetic hover: element drifts toward the pointer. No-op on touch / reduced motion. */
export function magnetic(el: HTMLElement, strength = 0.35): void {
  if (isTouch || reducedMotion) return
  const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.5)' })
  const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.5)' })
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect()
    x((e.clientX - (r.left + r.width / 2)) * strength)
    y((e.clientY - (r.top + r.height / 2)) * strength)
  })
  el.addEventListener('pointerleave', () => {
    x(0)
    y(0)
  })
}
