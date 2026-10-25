import { gsap, scrollTo, lockScroll, reducedMotion } from '../core/motion'
import { on } from '../core/bus'
import { icons } from './icons'
import { magnetic } from './fx/magnetic'

const LINKS = [
  { id: 'about', n: '01' },
  { id: 'work', n: '02' },
  { id: 'archive', n: '03' },
  { id: 'stack', n: '04' },
  { id: 'contact', n: '05' },
]

export function initNav(): void {
  const nav = document.getElementById('nav')!
  nav.innerHTML = `
    <div class="nav__bar">
      <a class="nav__logo" href="#hero" data-go="hero" aria-label="Clayton Banks, back to top"><span class="red">~/</span>clayton<span class="caret">▍</span></a>
      <nav class="nav__links" aria-label="Primary">
        ${LINKS.map((l) => `<a href="#${l.id}" data-go="${l.id}"><span class="n">${l.n}</span> ${l.id}</a>`).join('')}
      </nav>
      <div class="nav__meta">
        <span class="nav__avail" title="Available for work"><i class="pulse-dot"></i><span class="nav__avail-t">available</span></span>
        <time class="nav__clock" aria-label="Local time in Harare"></time>
        <button class="nav__burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="menu">${icons.menu}</button>
      </div>
    </div>
    <div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
      <div class="menu__head"><span class="mono dim">clayton@harare ~ $ ls</span></div>
      <ul class="menu__list">
        ${LINKS.map((l) => `<li><a href="#${l.id}" data-go="${l.id}"><span class="n">${l.n}</span><span class="t"><span class="red">$</span> cd ${l.id}</span></a></li>`).join('')}
      </ul>
      <div class="menu__foot mono dim"><i class="pulse-dot"></i> available for work · Harare, ZW</div>
    </div>`

  const bar = nav.querySelector<HTMLElement>('.nav__bar')!
  const burger = nav.querySelector<HTMLButtonElement>('.nav__burger')!
  const menu = nav.querySelector<HTMLElement>('.menu')!
  const clock = nav.querySelector<HTMLElement>('.nav__clock')!

  // Live Harare clock
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Harare', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const tick = () => {
    const t = fmt.format(new Date())
    clock.textContent = `${t} CAT`
    clock.setAttribute('datetime', t)
  }
  tick()
  setInterval(tick, 1000)

  // Navigation
  let open = false
  const setMenu = (v: boolean) => {
    open = v
    burger.setAttribute('aria-expanded', String(v))
    burger.setAttribute('aria-label', v ? 'Close menu' : 'Open menu')
    burger.innerHTML = v ? icons.close : icons.menu
    lockScroll(v)
    if (v) {
      menu.hidden = false
      document.body.classList.add('menu-open')
      if (reducedMotion) gsap.set(menu, { autoAlpha: 1 })
      else {
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)', autoAlpha: 1 }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.out' })
        gsap.from(menu.querySelectorAll('.menu__list li'), { x: -30, autoAlpha: 0, stagger: 0.07, duration: 0.7, delay: 0.15, ease: 'expo.out' })
      }
      menu.querySelector<HTMLElement>('a')?.focus()
    } else {
      document.body.classList.remove('menu-open')
      const done = () => void (menu.hidden = true)
      if (reducedMotion) done()
      else gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.5, ease: 'expo.inOut', onComplete: done })
      burger.focus()
    }
  }
  burger.addEventListener('click', () => setMenu(!open))
  addEventListener('keydown', (e) => {
    if (!open) return
    if (e.key === 'Escape') setMenu(false)
    if (e.key === 'Tab') {
      const f = [burger, ...menu.querySelectorAll<HTMLElement>('a')]
      const first = f[0],
        last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus())
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus())
    }
  })
  nav.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-go]')
    if (!a) return
    e.preventDefault()
    const wasOpen = open
    if (wasOpen) setMenu(false)
    const target = document.getElementById(a.dataset.go!)
    if (target) setTimeout(() => scrollTo(target), wasOpen ? 60 : 0)
  })
  nav.querySelectorAll<HTMLElement>('.nav__links a, .nav__logo').forEach((a) => magnetic(a, 0.25))

  // Active section
  on('section:change', ({ id }) => {
    nav.querySelectorAll<HTMLElement>('[data-go]').forEach((a) => {
      const on = a.dataset.go === id
      a.classList.toggle('is-active', on)
      if (on && a.closest('.nav__links')) a.setAttribute('aria-current', 'true')
      else a.removeAttribute('aria-current')
    })
  })

  // Hide on scroll down, show on scroll up
  let last = 0
  let hidden = false
  on('scroll', ({ scrollY }) => {
    const d = scrollY - last
    last = scrollY
    if (open) return
    const shouldHide = scrollY > 160 && d > 2
    const shouldShow = d < -2 || scrollY <= 160
    if (shouldHide && !hidden) {
      hidden = true
      gsap.to(bar, { yPercent: -150, duration: 0.6, ease: 'expo.out', overwrite: 'auto' })
    } else if (shouldShow && hidden) {
      hidden = false
      gsap.to(bar, { yPercent: 0, duration: 0.6, ease: 'expo.out', overwrite: 'auto' })
    }
  })
  nav.addEventListener('focusin', () => {
    hidden = false
    gsap.to(bar, { yPercent: 0, duration: 0.6, ease: 'expo.out', overwrite: 'auto' })
  })

  if (!reducedMotion) {
    gsap.set(bar, { y: -80, autoAlpha: 0 })
    on('boot:done', () => gsap.to(bar, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', delay: 0.2 }))
  }
}
