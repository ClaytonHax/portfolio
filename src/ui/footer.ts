import { scrollTo } from '../core/motion'
import { icons } from './icons'

export function initFooter(): void {
  const f = document.getElementById('footer')!
  f.innerHTML = `
    <div class="footer__inner">
      <p class="mono dim">© 2026 Clayton Banks — built with three.js, gsap, anime.js — Harare, ZW</p>
      <button type="button" class="footer__top mono" aria-label="Back to top">top ${icons.arrowUp}</button>
    </div>`
  f.querySelector('.footer__top')!.addEventListener('click', () => scrollTo(document.getElementById('hero')!))
}
