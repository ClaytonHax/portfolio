import { gsap, ScrollTrigger, reducedMotion } from '../../core/motion'

/** Fade/slide elements in once when their trigger scrolls into view. Content stays visible on reduced motion. */
export function reveal(
  targets: gsap.TweenTarget,
  opts: { trigger?: Element; y?: number; stagger?: number; delay?: number; start?: string; duration?: number } = {},
): void {
  if (reducedMotion) return
  const { y = 36, stagger = 0.08, delay = 0, start = 'top 85%', duration = 1 } = opts
  const els = gsap.utils.toArray<Element>(targets)
  if (!els.length) return
  gsap.set(els, { autoAlpha: 0, y })
  ScrollTrigger.create({
    trigger: opts.trigger ?? els[0],
    start,
    once: true,
    onEnter: () => gsap.to(els, { autoAlpha: 1, y: 0, duration, delay, stagger, ease: 'expo.out' }),
  })
}

/** Run fn once when el enters the viewport. */
export function onEnterOnce(el: Element, fn: () => void, start = 'top 75%'): void {
  ScrollTrigger.create({ trigger: el, start, once: true, onEnter: fn })
}
