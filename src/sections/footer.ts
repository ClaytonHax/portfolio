import { icons } from './icons'
import { scrollTo } from '../core/motion'

export function initFooter(): void {
  const el = document.getElementById('footer')
  if (!el) return
  el.innerHTML = `
    <div class="container footer__in">
      <p>&copy; 2026 Clayton Banks <span aria-hidden="true">&middot;</span> Built by hand in Harare</p>
      <button type="button" class="footer__top">Back to top ${icons.arrowUp}</button>
    </div>`
  el.querySelector('.footer__top')!.addEventListener('click', () => scrollTo(0))
}
