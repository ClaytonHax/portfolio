import { reducedMotion } from '../core/motion'

/** Small shared UI helpers for the sections. */
let toastEl: HTMLElement | null = null
let toastTimer = 0

export function toast(msg: string): void {
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.className = 'toast glass'
    toastEl.setAttribute('role', 'status')
    toastEl.setAttribute('aria-live', 'polite')
    document.body.appendChild(toastEl)
  }
  toastEl.textContent = msg
  void toastEl.offsetWidth
  toastEl.classList.add('is-on')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('is-on'), 1800)
}

/** Pointer-following shine for glass surfaces. */
export function shine(el: HTMLElement): void {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  })
  el.addEventListener('pointerleave', () => {
    el.style.removeProperty('--mx')
    el.style.removeProperty('--my')
  })
}

/** Project image with srcset and a procedural fallback when the file is missing. */
export function projectImage(p: { id: string; title: string; image: string; accent: string }, sizes: string, eager = false): string {
  const sm = p.image.replace(/\.webp$/, '-sm.webp')
  return `<div class="shot" style="--art:${p.accent}">
    <span class="shot__art" aria-hidden="true"><b>${p.title.trim().charAt(0)}</b></span>
    <img src="${p.image}" srcset="${sm} 800w, ${p.image} 1600w" sizes="${sizes}" width="1600" height="1000" alt="${p.title} screenshot" ${eager ? '' : 'loading="lazy"'} decoding="async" onerror="this.remove()">
  </div>`
}

/** Subtle magnetic pull (<= 6px) for buttons and links. Fine pointers only, never with reduced motion. */
export function magnetic(root: ParentNode = document): void {
  if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  root.querySelectorAll<HTMLElement>('.btn, .footer__top').forEach((el) => {
    if (el.dataset.mag) return
    el.dataset.mag = '1'
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2
      el.style.translate = `${(nx * 6).toFixed(2)}px ${(ny * 4).toFixed(2)}px`
    })
    el.addEventListener('pointerleave', () => el.style.removeProperty('translate'))
  })
}

/** The chapter number + label are drawn by the story chapter dividers, so the head is just title + intro. */
export function sectionHead(_num: string, _label: string, title: string, id: string, intro?: string): string {
  return `<header class="sec-head rv">
    <h2 id="${id}" class="sec-title">${title}</h2>
    ${intro ? `<p class="sec-intro">${intro}</p>` : ''}
  </header>`
}
