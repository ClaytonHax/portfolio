import { animate } from 'animejs'
import { reducedMotion } from '../core/motion'
import type { Project } from '../data/projects'

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const pad2 = (n: number) => String(n).padStart(2, '0')

export const ICON_ARROW =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>'

export function chipsHTML(items: string[], max = 99): string {
  const shown = items.slice(0, max).map((s) => `<li class="chip">${esc(s)}</li>`)
  if (items.length > max) shown.push(`<li class="chip chip--more">+${items.length - max}</li>`)
  return `<ul class="chips" aria-label="Tech stack">${shown.join('')}</ul>`
}

/** Split text into per-char spans, keeping an accessible label on the parent. */
export function splitChars(el: HTMLElement, text: string): HTMLElement[] {
  el.setAttribute('aria-label', text)
  el.textContent = ''
  const out: HTMLElement[] = []
  for (const ch of text) {
    const s = document.createElement('span')
    s.className = 'ch'
    s.setAttribute('aria-hidden', 'true')
    s.textContent = ch === ' ' ? ' ' : ch
    el.appendChild(s)
    out.push(s)
  }
  return out
}

const GLYPHS = '!<>-_\\/[]{}=+*^?#01'
/** Text scramble / decode (classic Codrops-style), returns a cancel fn. */
export function scramble(el: HTMLElement, final: string, duration = 520): () => void {
  if (reducedMotion) {
    el.textContent = final
    return () => {}
  }
  const state = { t: 0 }
  const a = animate(state, {
    t: 1,
    duration,
    ease: 'linear',
    onUpdate: () => {
      const reveal = Math.floor(state.t * final.length)
      let s = ''
      for (let i = 0; i < final.length; i++) {
        s += i < reveal || final[i] === ' ' ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0]
      }
      el.textContent = s
    },
    onComplete: () => {
      el.textContent = final
    },
  })
  return () => {
    a.pause()
    el.textContent = final
  }
}

/** Type text into an element over time. Returns the animation. */
export function typeInto(el: HTMLElement, text: string, delay = 0, speed = 22) {
  if (reducedMotion) {
    el.textContent = text
    return null
  }
  el.textContent = ''
  const state = { n: 0 }
  return animate(state, {
    n: text.length,
    delay,
    duration: Math.max(200, text.length * speed),
    ease: 'linear',
    onUpdate: () => {
      el.textContent = text.slice(0, Math.round(state.n))
    },
    onComplete: () => {
      el.textContent = text
    },
  })
}

export function linksHTML(p: Project, withDetails = false): string {
  const out: string[] = []
  if (withDetails)
    out.push(`<button type="button" class="btn btn--solid" data-open="${p.id}">Case file ${ICON_ARROW}</button>`)
  if (p.url)
    out.push(`<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Live site ${ICON_ARROW}</a>`)
  if (p.repo)
    out.push(`<a class="btn" href="${esc(p.repo)}" target="_blank" rel="noopener noreferrer">Source ${ICON_ARROW}</a>`)
  return out.join('')
}

/** Reveal-on-enter via IntersectionObserver (robust against pin-spacer layout shifts). */
export function revealOnEnter(els: Element[], onEnter?: (el: Element, i: number) => void) {
  if (reducedMotion || !('IntersectionObserver' in window)) return
  els.forEach((e) => e.classList.add('will-reveal'))
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return
        io.unobserve(en.target)
        const i = els.indexOf(en.target)
        en.target.classList.add('in')
        onEnter?.(en.target, i)
      })
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )
  els.forEach((e) => io.observe(e))
}
