import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(ScrollTrigger, Flip)

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches
export const isMobile = () => window.matchMedia('(max-width: 768px)').matches
/** Rough device budget for particle counts etc. */
export const lowPower = isTouch || (navigator.hardwareConcurrency || 8) <= 4

export let lenis: Lenis | null = null

/** Smooth scroll + GSAP ticker + ScrollTrigger wiring. Call once from main.ts. */
export function initMotion(): void {
  if (reducedMotion) return
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis!.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}

export function scrollTo(target: string | HTMLElement | number, immediate = false): void {
  if (lenis) lenis.scrollTo(target, { duration: immediate ? 0 : 1.4, immediate })
  else if (typeof target === 'number') window.scrollTo({ top: target })
  else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView()
}

export function lockScroll(locked: boolean): void {
  if (lenis) locked ? lenis.stop() : lenis.start()
  document.documentElement.classList.toggle('is-locked', locked)
}

export { gsap, ScrollTrigger, Flip }
