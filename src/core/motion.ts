import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { emit } from './bus'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches
export const isMobile = window.matchMedia('(max-width: 768px)').matches

export let lenis: Lenis | null = null

/** Smooth scroll + GSAP ticker + ScrollTrigger wiring. Call once from main.ts. */
export function initMotion(): void {
  if (!reducedMotion) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
    lenis.on('scroll', (l: Lenis) => {
      ScrollTrigger.update()
      emit('scroll', { progress: l.progress || 0, velocity: l.velocity || 0, scrollY: l.scroll })
    })
    gsap.ticker.add((t) => lenis!.raf(t * 1000))
    gsap.ticker.lagSmoothing(0)
  } else {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      emit('scroll', { progress: max > 0 ? scrollY / max : 0, velocity: 0, scrollY })
    }
    addEventListener('scroll', onScroll, { passive: true })
  }

  addEventListener(
    'pointermove',
    (e) => {
      emit('pointer', {
        x: (e.clientX / innerWidth) * 2 - 1,
        y: -(e.clientY / innerHeight) * 2 + 1,
        clientX: e.clientX,
        clientY: e.clientY,
      })
    },
    { passive: true },
  )

  // Section tracking
  document.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => self.isActive && emit('section:change', { id: el.dataset.section! }),
    })
  })
}

export function scrollTo(target: string | HTMLElement): void {
  if (lenis) lenis.scrollTo(target, { duration: 1.6, offset: 0 })
  else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView()
}

export function lockScroll(locked: boolean): void {
  if (lenis) locked ? lenis.stop() : lenis.start()
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}

export { gsap, ScrollTrigger }
