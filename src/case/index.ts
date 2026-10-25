/** Owner: case agent. Renders the case-study dialog into #case-root and handles #case-<id> deep links. */
import './case.css'
import { on, emit } from '../core/bus'
import { gsap, lockScroll, reducedMotion, isMobile } from '../core/motion'
import { projects, type Project } from '../data/projects'
import { cases, type CaseStudy } from '../data/cases'

const ICON = {
  close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  out: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  prev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
const HASH = /^#case-(.+)$/

export function initCase(): void {
  const root = document.getElementById('case-root')
  if (!root) return

  root.innerHTML = `
    <div class="case" hidden>
      <div class="case__backdrop" data-close></div>
      <div class="case__panel glass" role="dialog" aria-modal="true" aria-labelledby="case-title" tabindex="-1">
        <button type="button" class="case__close" aria-label="Close case study" data-close>${ICON.close}</button>
        <div class="case__scroll" data-lenis-prevent tabindex="-1"><div class="case__content"></div></div>
        <nav class="case__nav" aria-label="Case studies">
          <button type="button" class="case__step case__step--prev" data-step="-1"></button>
          <button type="button" class="case__step case__step--next" data-step="1"></button>
        </nav>
      </div>
    </div>`

  const wrap = root.querySelector<HTMLElement>('.case')!
  const backdrop = root.querySelector<HTMLElement>('.case__backdrop')!
  const panel = root.querySelector<HTMLElement>('.case__panel')!
  const scroller = root.querySelector<HTMLElement>('.case__scroll')!
  const content = root.querySelector<HTMLElement>('.case__content')!
  const prevBtn = root.querySelector<HTMLButtonElement>('.case__step--prev')!
  const nextBtn = root.querySelector<HTMLButtonElement>('.case__step--next')!

  let currentId: string | null = null
  let opener: HTMLElement | null = null
  let busy: gsap.core.Timeline | null = null
  let inerted: HTMLElement[] = []

  const byId = (id: string) => projects.find((p) => p.id === id)

  /* ───────── rendering ───────── */
  function section(label: string, body: string, cls = ''): string {
    return `<section class="case__sec ${cls}"><h3 class="case__label">${label}</h3><div class="case__body">${body}</div></section>`
  }

  function render(p: Project, c: CaseStudy | undefined): string {
    const sm = p.image.replace(/\.webp$/, '-sm.webp')
    const links = [
      p.url ? `<a class="case__btn case__btn--primary" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Visit site ${ICON.out}</a>` : '',
      p.repo ? `<a class="case__btn" href="${esc(p.repo)}" target="_blank" rel="noopener noreferrer">Code ${ICON.out}</a>` : '',
    ].join('')
    const built = c?.built?.length ? c.built : p.highlights
    const parts: string[] = []
    if (c?.problem) parts.push(section('The problem', `<p>${esc(c.problem)}</p>`))
    parts.push(section('What I built', `<ul class="case__list">${built.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`))
    if (c?.decision)
      parts.push(section('The hard part', `<h4 class="case__decision">${esc(c.decision.title)}</h4><p>${esc(c.decision.body)}</p>`))
    if (c?.result) parts.push(section('Result', `<p>${esc(c.result)}</p>`))

    return `
      <figure class="case__hero" style="--accent-art:${esc(p.accent)}" data-reveal>
        <img src="${esc(p.image)}" srcset="${esc(sm)} 800w, ${esc(p.image)} 1600w" sizes="(min-width: 980px) 940px, 100vw"
             width="1600" height="1000" alt="Screenshot of ${esc(p.title)}" decoding="async" />
        <span class="case__art" aria-hidden="true">${esc(p.title.slice(0, 1))}</span>
      </figure>
      <header class="case__head" data-reveal>
        <p class="case__meta"><span>${esc(p.category)}</span><span aria-hidden="true">·</span><span>${p.year}</span>${
          p.badge ? `<span class="case__badge"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/></svg>${esc(p.badge)}</span>` : ''
        }</p>
        <h2 id="case-title" class="case__title">${esc(p.title)}</h2>
        <p class="case__tagline">${esc(p.tagline)}</p>
        ${links ? `<div class="case__links">${links}</div>` : ''}
      </header>
      <div class="case__facts" data-reveal>
        ${c?.role ? `<div><h3 class="case__label">Role</h3><p>${esc(c.role)}</p></div>` : ''}
        <div><h3 class="case__label">Stack</h3><ul class="case__chips">${p.stack.map((s) => `<li class="chip">${esc(s)}</li>`).join('')}</ul></div>
      </div>
      ${c ? `<p class="case__lead" data-reveal>${esc(c.summary)}</p>` : ''}
      <div class="case__sections" data-reveal>${parts.join('')}</div>`
  }

  function hookImage(): void {
    const img = content.querySelector<HTMLImageElement>('.case__hero img')
    const fig = content.querySelector<HTMLElement>('.case__hero')
    if (!img || !fig) return
    const bad = () => fig.classList.add('is-missing')
    img.addEventListener('error', bad, { once: true })
    if (img.complete && img.naturalWidth === 0) bad()
  }

  function setNav(id: string): void {
    const i = projects.findIndex((p) => p.id === id)
    const prev = projects[(i - 1 + projects.length) % projects.length]
    const next = projects[(i + 1) % projects.length]
    prevBtn.dataset.id = prev.id
    nextBtn.dataset.id = next.id
    prevBtn.innerHTML = `${ICON.prev}<span class="case__step-text"><small>Previous</small><b>${esc(prev.title)}</b></span>`
    nextBtn.innerHTML = `<span class="case__step-text"><small>Next</small><b>${esc(next.title)}</b></span>${ICON.next}`
  }

  function fill(id: string): void {
    const p = byId(id)!
    content.innerHTML = render(p, cases[id])
    scroller.scrollTop = 0
    hookImage()
    setNav(id)
  }

  /* ───────── a11y helpers ───────── */
  function setInert(on: boolean): void {
    if (on) {
      if (inerted.length) return
      inerted = [...document.body.children].filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el !== root && el.tagName !== 'SCRIPT' && !el.hasAttribute('inert'),
      )
      inerted.forEach((el) => el.setAttribute('inert', ''))
    } else {
      inerted.forEach((el) => el.removeAttribute('inert'))
      inerted = []
    }
  }

  function trap(e: KeyboardEvent): void {
    if (!currentId) return
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'ArrowLeft' && e.altKey) return
    if (e.key !== 'Tab') return
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (!panel.contains(active)) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  /* ───────── motion ───────── */
  function cardClip(from: HTMLElement): string {
    const r = from.getBoundingClientRect()
    const pr = panel.getBoundingClientRect()
    const t = Math.max(0, r.top - pr.top)
    const l = Math.max(0, r.left - pr.left)
    const b = Math.max(0, pr.bottom - r.bottom)
    const rt = Math.max(0, pr.right - r.right)
    return `inset(${t}px ${rt}px ${b}px ${l}px round 24px)`
  }

  /* The pen draws the panel frame: one rounded-rect, two dashes growing from the point nearest the card. */
  const SVGNS = 'http://www.w3.org/2000/svg'
  let frame: SVGSVGElement | null = null

  function dropFrame(): void {
    if (!frame) return
    gsap.killTweensOf(frame)
    frame.remove()
    frame = null
  }

  function makeFrame(from: HTMLElement | null): { svg: SVGSVGElement; origin: { x: number; y: number }; draw: gsap.core.Tween } {
    const pr = panel.getBoundingClientRect()
    const wr = wrap.getBoundingClientRect()
    const w = pr.width
    const h = pr.height
    const r = 28
    const svg = document.createElementNS(SVGNS, 'svg')
    svg.setAttribute('class', 'case__frame')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.style.cssText = `left:${pr.left - wr.left}px;top:${pr.top - wr.top}px;width:${w}px;height:${h}px`
    const d = `M${r + 1} 1H${w - r - 1}A${r - 1} ${r - 1} 0 0 1 ${w - 1} ${r}V${h - r}A${r - 1} ${r - 1} 0 0 1 ${w - r} ${h - 1}H${r + 1}A${r - 1} ${r - 1} 0 0 1 1 ${h - r}V${r}A${r - 1} ${r - 1} 0 0 1 ${r + 1} 1Z`
    const mk = (tag: string, cls: string) => {
      const el = document.createElementNS(SVGNS, tag)
      el.setAttribute('class', cls)
      svg.appendChild(el)
      return el
    }
    const fwd = mk('path', 'case__frame-line') as SVGPathElement
    const back = mk('path', 'case__frame-line') as SVGPathElement
    fwd.setAttribute('d', d)
    back.setAttribute('d', d)
    const nibA = mk('circle', 'case__frame-nib')
    const nibB = mk('circle', 'case__frame-nib')
    ;[nibA, nibB].forEach((n) => n.setAttribute('r', '3.5'))
    wrap.appendChild(svg)
    frame = svg

    const L = fwd.getTotalLength()
    // start at the perimeter point nearest the card (or top centre when there is none)
    const fr = from?.getBoundingClientRect()
    const tx = fr ? Math.min(Math.max(fr.left + fr.width / 2 - pr.left, 0), w) : w / 2
    const ty = fr ? Math.min(Math.max(fr.top + fr.height / 2 - pr.top, 0), h) : 0
    let s0 = 0
    let best = Infinity
    for (let i = 0; i < 240; i++) {
      const pt = fwd.getPointAtLength((L * i) / 240)
      const dist = (pt.x - tx) ** 2 + (pt.y - ty) ** 2
      if (dist < best) { best = dist; s0 = (L * i) / 240 }
    }
    const origin = fwd.getPointAtLength(s0)
    const wrapL = (v: number) => ((v % L) + L) % L
    const state = { len: 0 }
    const paint = () => {
      const len = state.len
      fwd.style.strokeDasharray = `${len} ${L - len}`
      fwd.style.strokeDashoffset = `${-s0}`
      back.style.strokeDasharray = `${len} ${L - len}`
      back.style.strokeDashoffset = `${-(s0 - len)}`
      const a = fwd.getPointAtLength(wrapL(s0 + len))
      const b = fwd.getPointAtLength(wrapL(s0 - len))
      nibA.setAttribute('cx', `${a.x}`); nibA.setAttribute('cy', `${a.y}`)
      nibB.setAttribute('cx', `${b.x}`); nibB.setAttribute('cy', `${b.y}`)
    }
    paint()
    const draw = gsap.to(state, { len: L / 2, duration: 0.85, ease: 'power2.inOut', onUpdate: paint })
    draw.pause()
    return { svg, origin, draw }
  }

  function animateOpen(from?: HTMLElement | null): void {
    busy?.kill()
    dropFrame()
    const reveal = content.querySelectorAll('[data-reveal]:not(.case__hero)')
    const hero = content.querySelector<HTMLElement>('.case__hero')
    const tl = gsap.timeline({
      onComplete: () => { busy = null; dropFrame(); gsap.set([panel, reveal, hero], { clearProps: 'all' }) },
    })
    busy = tl
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0)
    if (reducedMotion) {
      tl.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0)
      return
    }
    if (isMobile()) {
      tl.fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' }, 0)
      tl.fromTo([hero, ...reveal], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, 0.2)
      return
    }
    const src = from?.isConnected ? from : null
    const { svg, origin, draw } = makeFrame(src)
    const pr = panel.getBoundingClientRect()
    const reach = Math.hypot(Math.max(origin.x, pr.width - origin.x), Math.max(origin.y, pr.height - origin.y)) + 4
    // line first
    tl.add(draw.play(), 0.05)
    tl.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.05)
    // glass floods outward from where the line started, behind the stroke
    tl.fromTo(
      panel,
      { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
      { clipPath: `circle(${reach}px at ${origin.x}px ${origin.y}px)`, duration: 1, ease: 'power2.out' },
      0.2,
    )
    // content fills in
    if (hero) {
      tl.fromTo(hero, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.75, ease: 'expo.out' }, 0.65)
    }
    tl.fromTo(
      reveal,
      { y: 28, opacity: 0, filter: 'blur(6px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out', stagger: 0.07 },
      0.75,
    )
    // frame settles away once closed
    tl.to(svg, { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, 1.0)
  }

  function animateClose(done: () => void): void {
    busy?.kill()
    dropFrame()
    const from = opener?.isConnected ? opener : null
    const tl = gsap.timeline({ onComplete: done })
    busy = tl
    tl.to(backdrop, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
    if (reducedMotion) {
      tl.to(panel, { opacity: 0, duration: 0.15 }, 0)
    } else if (isMobile()) {
      tl.to(panel, { yPercent: 100, duration: 0.45, ease: 'power3.in' }, 0)
    } else if (from) {
      tl.to(content, { opacity: 0, duration: 0.18, ease: 'power1.out' }, 0)
      tl.to(panel, { clipPath: cardClip(from), opacity: 0.4, duration: 0.5, ease: 'expo.inOut' }, 0.04)
    } else {
      tl.to(panel, { opacity: 0, y: 16, scale: 0.98, duration: 0.3, ease: 'power2.in' }, 0)
    }
  }

  /* ───────── open / close ───────── */
  function open(id: string, from?: HTMLElement | null): void {
    if (!byId(id)) return
    if (currentId) {
      // already open: swap project in place (prev / next / hash change)
      if (id === currentId) return
      const dir = projects.findIndex((p) => p.id === id) > projects.findIndex((p) => p.id === currentId) ? 1 : -1
      currentId = id
      setHash(id)
      const swap = () => {
        fill(id)
        const reveal = content.querySelectorAll('[data-reveal]')
        if (reducedMotion) gsap.fromTo(content, { opacity: 0 }, { opacity: 1, duration: 0.2 })
        else gsap.fromTo(reveal, { x: 28 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.05, clearProps: 'all' })
      }
      gsap.killTweensOf(content)
      if (reducedMotion) swap()
      else gsap.to(content, { opacity: 0, x: -20 * dir, duration: 0.16, ease: 'power1.in', onComplete: () => { gsap.set(content, { clearProps: 'all' }); swap() } })
      return
    }
    currentId = id
    opener = from ?? (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null)
    fill(id)
    wrap.hidden = false
    lockScroll(true)
    setInert(true)
    setHash(id)
    animateOpen(from)
    panel.focus({ preventScroll: true })
    document.addEventListener('keydown', trap)
  }

  function close(): void {
    if (!currentId) return
    const target = opener
    currentId = null
    opener = null
    document.removeEventListener('keydown', trap)
    clearHash()
    animateClose(() => {
      wrap.hidden = true
      gsap.set([panel, backdrop, content], { clearProps: 'all' })
      content.innerHTML = ''
      setInert(false)
      lockScroll(false)
      if (target?.isConnected) target.focus({ preventScroll: true })
      emit('case:close')
    })
    // inert is released only after the animation; make sure the opener gets focus afterwards
  }

  function setHash(id: string): void {
    try { history.replaceState(null, '', `#case-${id}`) } catch { /* ignore */ }
  }
  function clearHash(): void {
    try {
      if (HASH.test(location.hash)) history.replaceState(null, '', location.pathname + location.search)
    } catch { /* ignore */ }
  }

  /* ───────── wiring ───────── */
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t.closest('[data-close]')) return close()
    const step = t.closest<HTMLElement>('[data-step]')
    if (step?.dataset.id) emit('case:open', { id: step.dataset.id })
  })

  on('case:open', ({ id, from }) => open(id, from))

  const fromHash = () => {
    const m = HASH.exec(location.hash)
    if (m && byId(m[1])) {
      if (m[1] !== currentId) open(m[1])
    } else if (currentId) close()
  }
  window.addEventListener('hashchange', fromHash)
  window.addEventListener('resize', dropFrame)

  // The pen's intro releases scroll when it finishes; keep it locked while a case is open.
  on('intro:done', () => { if (currentId) lockScroll(true) })

  if (HASH.test(location.hash)) fromHash()
}
