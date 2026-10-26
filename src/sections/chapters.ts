/** STORY agent. Chapter dividers, chapter ticker, stack marquee, work image parallax. */
import { profile } from '../data/profile'
import { gsap, ScrollTrigger, reducedMotion } from '../core/motion'
import { emit } from '../core/bus'

const CHAPTERS: { id: string; n: string; label: string }[] = [
  { id: 'intro', n: '01', label: 'Hello' },
  { id: 'about', n: '02', label: 'How I think' },
  { id: 'process', n: '03', label: 'How I work' },
  { id: 'work', n: '04', label: 'Selected work' },
  { id: 'more', n: '05', label: 'More things I’ve made' },
  { id: 'mobile', n: '06', label: 'Built for thumbs' },
  { id: 'stack', n: '07', label: 'Toolbox' },
  { id: 'contact', n: '08', label: 'Let’s build something' },
]

export function initChapters(): void {
  const dividers = buildDividers()
  buildTicker(dividers)
  buildMarquee()
  buildWorkParallax()
  requestAnimationFrame(() => {
    ScrollTrigger.refresh()
    emit('layout:change')
  })
}

function buildDividers(): HTMLElement[] {
  const out: HTMLElement[] = []
  CHAPTERS.slice(1).forEach((c) => {
    const sec = document.getElementById(c.id)
    if (!sec) return
    const div = document.createElement('div')
    div.className = 'chapter'
    div.setAttribute('aria-hidden', 'true')
    div.dataset.chapter = c.id
    div.innerHTML = `<div class="chapter__rule"></div>
      <div class="chapter__row"><span class="chapter__num">${c.n}</span><span class="chapter__label">${c.label}</span></div>`
    // the pen passes the long closing label on its right, then swings in to the email
    if (c.id === 'contact') {
      div.dataset.penStop = 'contact-chapter'
      div.dataset.penSide = 'right'
    }
    // For #process keep the pen stop tick between the divider and the pinned section.
    // (a pinned section lives inside a .pin-spacer: place the divider before the spacer, not inside it)
    const ref = sec.parentElement?.classList.contains('pin-spacer') ? sec.parentElement : sec
    const prev = ref.previousElementSibling
    const anchor = prev?.classList.contains('proc-stop') ? prev : ref
    anchor.before(div)
    out.push(div)

    if (reducedMotion) {
      div.classList.add('is-done')
      return
    }
    const rule = div.querySelector('.chapter__rule')
    const num = div.querySelector('.chapter__num')
    const label = div.querySelector<HTMLElement>('.chapter__label')
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: div, start: 'top 92%', end: 'top 38%', scrub: 0.5 },
    })
    tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1 }, 0)
      .fromTo(num, { xPercent: -140, opacity: 0 }, { xPercent: 0, opacity: 1 }, 0)
      .fromTo(label, { xPercent: 18, opacity: 0 }, { xPercent: 0, opacity: 1 }, 0)
      .fromTo(label, { '--f': 0 }, { '--f': 100 }, 0.25)
  })
  return out
}

function buildTicker(dividers: HTMLElement[]): void {
  const el = document.createElement('div')
  el.className = 'ticker'
  el.setAttribute('aria-hidden', 'true')
  document.body.appendChild(el)
  let cur = -1
  const text = (i: number) => `<span class="ticker__n">${CHAPTERS[i].n}</span><span class="ticker__l">${CHAPTERS[i].label}</span>`
  const set = (i: number) => {
    if (i === cur) return
    const dir = i > cur ? 1 : -1
    const olds = Array.from(el.querySelectorAll<HTMLElement>('.ticker__item'))
    const item = document.createElement('span')
    item.className = 'ticker__item'
    item.innerHTML = text(i)
    el.appendChild(item)
    cur = i
    if (reducedMotion) {
      olds.forEach((o) => o.remove())
      return
    }
    olds.forEach((o) => {
      gsap.killTweensOf(o)
      gsap.to(o, { xPercent: -60 * dir, opacity: 0, duration: 0.4, ease: 'power2.in', overwrite: true, onComplete: () => o.remove() })
    })
    if (olds.length) gsap.fromTo(item, { xPercent: 60 * dir, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.12 })
  }
  set(0)
  // slide out while the footer is on screen so it never sits on the footer text
  const foot = document.getElementById('footer')
  if (foot) new IntersectionObserver((e) => el.classList.toggle('ticker--off', e[e.length - 1].isIntersecting)).observe(foot)
  const idx = CHAPTERS.map((c) => c.id)
  dividers.forEach((d) => {
    const i = idx.indexOf(d.dataset.chapter!)
    ScrollTrigger.create({
      trigger: d,
      start: 'top 60%',
      end: 'max',
      onEnter: () => set(i),
      onLeaveBack: () => set(i - 1),
    })
  })
}

function buildMarquee(): void {
  const sec = document.getElementById('stack')
  if (!sec || sec.querySelector('.mq')) return
  const words = Object.values(profile.skills).flat()
  if (!words.length) return
  const half = Math.ceil(words.length / 2)
  const rows = [words.slice(0, half), words.slice(half).length ? words.slice(half) : words]
  const item = (w: string, i: number) => `<span class="mq__w${i % 4 === 3 ? ' mq__w--a' : ''}">${w}</span><span class="mq__dot"></span>`
  const mq = document.createElement('div')
  mq.className = 'mq'
  mq.setAttribute('aria-hidden', 'true')
  const copies = reducedMotion ? 1 : 2
  mq.innerHTML = rows
    .map((r) => `<div class="mq__row"><div class="mq__track">${Array.from({ length: copies }, () => r.map(item).join('')).join('')}</div></div>`)
    .join('')
  // the pen slips past the marquee along its (masked, empty) right edge
  mq.dataset.penStop = 'mq'
  mq.dataset.penSide = 'right'
  sec.prepend(mq)
  if (reducedMotion) {
    mq.classList.add('mq--static')
    return
  }

  const tracks = Array.from(mq.querySelectorAll<HTMLElement>('.mq__track'))
  const dirs = [-1, 1]
  const pos = [0, 0]
  const widths = [0, 0]
  const measure = () => tracks.forEach((t, i) => {
    widths[i] = t.scrollWidth / 2
    if (dirs[i] > 0) pos[i] = pos[i] || -widths[i]
  })
  measure()
  window.addEventListener('resize', measure)
  document.fonts?.ready.then(measure).catch(() => {})
  let visible = false
  new IntersectionObserver((e) => (visible = e[0].isIntersecting), { rootMargin: '100px' }).observe(mq)
  let hover = false
  mq.addEventListener('pointerenter', () => (hover = true))
  mq.addEventListener('pointerleave', () => (hover = false))
  let boost = 0
  let hold = 1
  let lastY = window.scrollY
  gsap.ticker.add((_t, dt) => {
    const y = window.scrollY
    const vel = ScrollTrigger.isTouch ? 0 : (y - lastY) / Math.max(1, dt)
    lastY = y
    if (!visible) return
    boost += (Math.min(Math.abs(vel), 6) - boost) * 0.08
    hold += ((hover ? 0 : 1) - hold) * 0.1
    tracks.forEach((t, i) => {
      if (!widths[i]) return
      pos[i] += dirs[i] * (0.045 + boost * 0.12) * dt * hold
      if (pos[i] <= -widths[i]) pos[i] += widths[i]
      if (pos[i] >= 0) pos[i] -= widths[i]
      t.style.transform = `translate3d(${pos[i].toFixed(2)}px,0,0)`
    })
  })
}

function buildWorkParallax(): void {
  if (reducedMotion) return
  document.querySelectorAll<HTMLElement>('#work .shot img, #work .proj__art').forEach((img) => {
    const frame = img.parentElement
    if (!frame) return
    img.classList.add('px-img')
    gsap.fromTo(
      img,
      { '--px': '-4%' },
      { '--px': '4%', ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } },
    )
  })
}
