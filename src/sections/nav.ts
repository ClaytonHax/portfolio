import { profile } from '../data/profile'
import { on } from '../core/bus'
import { currentTheme, setTheme } from '../core/theme'
import { scrollTo, ScrollTrigger, lockScroll, reducedMotion } from '../core/motion'
import { icons } from './icons'

const LINKS = [
  { label: 'About', target: '#about', sections: ['about'] },
  { label: 'Process', target: '#process', sections: ['process'] },
  { label: 'Work', target: '#work', sections: ['work', 'more'] },
  { label: 'Stack', target: '#stack', sections: ['stack'] },
  { label: 'Contact', target: '#contact', sections: ['contact'] },
]

/** Typeset wordmark: the cursive belongs to the pen in the hero; the nav stays in the site's own type. */
function wordmark(): string {
  return '<span class="nav__name">Clayton<span class="nav__dot">.</span></span>'
}

export function initNav(): void {
  const nav = document.getElementById('nav')
  if (!nav) return

  const linkHtml = (cls: string) =>
    LINKS.map((l) => `<a class="${cls}" href="${l.target}" data-target="${l.target}" data-for="${l.sections.join(' ')}">${l.label}</a>`).join('')

  nav.innerHTML = `
    <div class="nav__sheet" id="nav-sheet" inert aria-hidden="true">
      <nav class="nav__sheet-in" aria-label="Menu">
        ${linkHtml('nav__sheet-link')}
        <a class="btn btn--primary nav__sheet-mail" href="mailto:${profile.email}">${icons.mail}Email me</a>
      </nav>
    </div>
    <div class="nav__pill glass">
      <a class="nav__brand" href="#main" aria-label="Clayton Banks — home">${wordmark()}<i class="nav__brand-line" aria-hidden="true"></i></a>
      <nav class="nav__links" aria-label="Primary"><i class="nav__ink" aria-hidden="true"></i>${linkHtml('nav__link')}</nav>
      <div class="nav__actions">
        <button type="button" class="nav__icon nav__theme" aria-pressed="false" aria-label="Night theme">
          <span class="nav__ico nav__ico--sun">${icons.sun}</span><span class="nav__ico nav__ico--moon">${icons.moon}</span>
        </button>
        <a class="btn btn--primary btn--sm nav__mail" href="mailto:${profile.email}">Email me</a>
        <button type="button" class="nav__icon nav__menu" aria-expanded="false" aria-controls="nav-sheet" aria-label="Open menu">
          <span class="nav__ico nav__ico--open">${icons.menu}</span><span class="nav__ico nav__ico--close">${icons.close}</span>
        </button>
      </div>
    </div>
    <i class="nav__progress" aria-hidden="true"></i>`

  const pill = nav.querySelector<HTMLElement>('.nav__pill')!
  const sheet = nav.querySelector<HTMLElement>('.nav__sheet')!
  const themeBtn = nav.querySelector<HTMLButtonElement>('.nav__theme')!
  const menuBtn = nav.querySelector<HTMLButtonElement>('.nav__menu')!
  const progress = nav.querySelector<HTMLElement>('.nav__progress')!

  // theme toggle
  const syncTheme = () => {
    const night = currentTheme() === 'night'
    themeBtn.setAttribute('aria-pressed', String(night))
    themeBtn.setAttribute('aria-label', night ? 'Night theme (switch to light)' : 'Light theme (switch to night)')
  }
  syncTheme()
  on('theme:change', syncTheme)
  themeBtn.addEventListener('click', () => setTheme(currentTheme() === 'night' ? 'light' : 'night'))

  // mobile sheet
  let open = false
  const setOpen = (v: boolean, restoreFocus = true) => {
    open = v
    nav.classList.toggle('is-open', v)
    menuBtn.setAttribute('aria-expanded', String(v))
    menuBtn.setAttribute('aria-label', v ? 'Close menu' : 'Open menu')
    sheet.toggleAttribute('inert', !v)
    sheet.setAttribute('aria-hidden', String(!v))
    lockScroll(v)
    if (v) sheet.querySelector<HTMLElement>('a')?.focus()
    else if (restoreFocus) menuBtn.focus()
  }
  menuBtn.addEventListener('click', () => setOpen(!open))
  nav.addEventListener('keydown', (e) => {
    if (!open) return
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'Tab') {
      const f = [...nav.querySelectorAll<HTMLElement>('a[href], button')].filter(
        (n) => n.offsetParent !== null && !n.closest('[inert]') && !n.classList.contains('nav__link'),
      )
      f.push(...sheet.querySelectorAll<HTMLElement>('a[href]'))
      const list = [...new Set(f)].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  })
  window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
    if (e.matches && open) setOpen(false, false)
  })

  // link navigation
  nav.querySelectorAll<HTMLAnchorElement>('a[data-target]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const wasOpen = open
      if (wasOpen) setOpen(false, false)
      const t = document.querySelector<HTMLElement>(a.dataset.target!)
      if (t) window.setTimeout(() => scrollTo(t), wasOpen ? 60 : 0)
    }),
  )
  nav.querySelector<HTMLAnchorElement>('.nav__brand')!.addEventListener('click', (e) => {
    e.preventDefault()
    if (open) setOpen(false, false)
    scrollTo(0)
  })

  // active section
  const setActive = (id: string, active: boolean) => {
    nav.querySelectorAll<HTMLElement>('[data-for]').forEach((a) => {
      if (a.dataset.for!.split(' ').includes(id)) {
        a.classList.toggle('is-active', active)
        if (active) a.setAttribute('aria-current', 'location')
        else a.removeAttribute('aria-current')
      }
    })
  }
  LINKS.flatMap((l) => l.sections).forEach((id) => {
    const sec = document.getElementById(id)
    if (!sec) return
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => setActive(id, self.isActive),
    })
  })

  // sliding highlight: the leading edge moves first, the trailing edge follows, so it stretches between links
  const linksEl = nav.querySelector<HTMLElement>('.nav__links')!
  const ink = linksEl.querySelector<HTMLElement>('.nav__ink')!
  const inkLinks = [...linksEl.querySelectorAll<HTMLElement>('.nav__link')]
  let inkAt = -1
  const moveInk = (instant = false) => {
    const i = inkLinks.findIndex((a) => a.classList.contains('is-active'))
    if (i < 0) {
      ink.classList.remove('is-on')
      inkAt = -1
      return
    }
    const a = inkLinks[i]
    if (a.offsetWidth === 0) return
    const left = a.offsetLeft
    const right = linksEl.clientWidth - left - a.offsetWidth
    const first = inkAt < 0 || instant || reducedMotion
    const fwd = i > inkAt
    ink.style.transition = first ? 'none' : ''
    ink.style.transitionDelay = first ? '0s' : fwd ? '0s, 0.09s' : '0.09s, 0s' // [left, right]
    ink.style.left = left + 'px'
    ink.style.right = right + 'px'
    ink.classList.add('is-on')
    inkAt = i
  }
  const inkWatch = new MutationObserver(() => moveInk())
  inkLinks.forEach((a) => inkWatch.observe(a, { attributes: true, attributeFilter: ['class'] }))
  window.addEventListener('resize', () => moveInk(true))
  on('intro:done', () => requestAnimationFrame(() => moveInk(true)))

  // progress hairline
  let target = 0
  let cur = 0
  let ticking = false
  const paint = () => {
    ticking = true
    cur += (target - cur) * 0.2
    if (Math.abs(target - cur) < 0.001) cur = target
    progress.style.transform = `scaleX(${cur})`
    if (cur !== target) requestAnimationFrame(paint)
    else ticking = false
  }
  on('pen:progress', ({ p }) => {
    target = Math.max(0, Math.min(1, p))
    if (reducedMotion) {
      cur = target
      progress.style.transform = `scaleX(${cur})`
    } else if (!ticking) requestAnimationFrame(paint)
  })

  // hidden during the intro, slides in afterwards
  let shown = false
  const showPill = () => {
    if (shown) return
    shown = true
    pill.classList.add('is-in')
  }
  on('intro:done', showPill)
  window.setTimeout(showPill, 12000)
  if (reducedMotion) showPill()
}
