import { icons } from './icons'
import { scrollTo } from '../core/motion'

export function initFooter(): void {
  const el = document.getElementById('footer')
  if (!el) return
  el.innerHTML = `
    <div class="container footer__in">
      <div class="footer__sig" data-pen-signature aria-hidden="true"></div>
      <div class="footer__row">
        <p>Designed &amp; built by Clayton Banks, Harare. <span aria-hidden="true">&middot;</span> &copy; ${new Date().getFullYear()}</p>
        <button type="button" class="footer__top">Back to top ${icons.arrowUp}</button>
      </div>
    </div>`
  el.querySelector('.footer__top')!.addEventListener('click', () => scrollTo(0))
}
