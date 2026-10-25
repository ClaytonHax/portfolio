import { gsap, isTouch, reducedMotion } from '../core/motion'
import { on } from '../core/bus'

type State = 'default' | 'link' | 'view' | 'drag' | 'text'

export function initCursor(): void {
  const root = document.getElementById('cursor')
  if (!root || isTouch) return
  root.innerHTML = '<div class="cursor__ring"><span class="cursor__label"></span></div><div class="cursor__dot"></div>'
  const ring = root.querySelector<HTMLElement>('.cursor__ring')!
  const dot = root.querySelector<HTMLElement>('.cursor__dot')!
  const label = root.querySelector<HTMLElement>('.cursor__label')!
  document.documentElement.classList.add('has-cursor')
  gsap.set([ring, dot], { xPercent: -50, yPercent: -50, x: -100, y: -100 })

  const rx = gsap.quickTo(ring, 'x', { duration: reducedMotion ? 0.01 : 0.45, ease: 'power3' })
  const ry = gsap.quickTo(ring, 'y', { duration: reducedMotion ? 0.01 : 0.45, ease: 'power3' })
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' })
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' })

  let shown = false
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return
      if (!shown) {
        shown = true
        gsap.set([ring, dot], { x: e.clientX, y: e.clientY })
        root.classList.add('is-visible')
      }
      rx(e.clientX)
      ry(e.clientY)
      dx(e.clientX)
      dy(e.clientY)
    },
    { passive: true },
  )
  document.addEventListener('pointerleave', () => root.classList.remove('is-visible'))
  document.addEventListener('pointerenter', () => shown && root.classList.add('is-visible'))
  addEventListener('pointerdown', () => root.classList.add('is-down'))
  addEventListener('pointerup', () => root.classList.remove('is-down'))

  const set = (state: State, text?: string) => {
    root.dataset.state = state
    label.textContent = text ?? (state === 'view' ? 'VIEW' : state === 'drag' ? 'DRAG' : '')
  }
  on('cursor:state', ({ state, label: l }) => set(state, l))

  // Auto "link"/"text" state over UI-owned regions only (the projects module drives its own).
  const zone = '#nav, #hero, #about, #stack, #contact, #footer, .toast'
  document.addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement
    if (!t.closest?.(zone)) return
    if (t.closest('input, textarea')) set('text')
    else if (t.closest('[data-cursor="drag"]')) set('drag')
    else if (t.closest('a, button, [role="button"]')) set('link')
    else set('default')
  })
}
