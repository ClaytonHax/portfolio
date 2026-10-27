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
    return `<section class="case__sec ${cls}" data-reveal><h3 class="case__label">${label}</h3><div class="case__body">${body}</div></section>`
  }

  function render(p: Project, c: CaseStudy | undefined): string {
    const sm = p.image.replace(/\.webp$/, '-sm.webp')
    const links = [
      p.url && !p.noVisit ? `<a class="case__btn case__btn--primary" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Visit site ${ICON.out}</a>` : '',
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
      <div class="case__aside">
        <figure class="case__hero" style="--accent-art:${esc(p.accent)}" data-reveal>
          <img src="${esc(p.image)}" srcset="${esc(sm)} 800w, ${esc(p.image)} 1600w" sizes="(min-width: 1024px) 400px, 100vw"
               width="1600" height="1000" alt="Screenshot of ${esc(p.title)}" decoding="async" />
          <span class="case__art" aria-hidden="true">${esc(p.title.slice(0, 1))}</span>
        </figure>
        ${links ? `<div class="case__links" data-reveal>${links}</div>` : ''}
        <div class="case__facts" data-reveal>
          ${c?.role ? `<div><h3 class="case__label">Role</h3><p>${esc(c.role)}</p></div>` : ''}
          <div><h3 class="case__label">Stack</h3><ul class="case__chips">${p.stack.map((s) => `<li class="chip">${esc(s)}</li>`).join('')}</ul></div>
        </div>
      </div>
      <div class="case__main">
        <header class="case__head" data-reveal>
          <p class="case__meta"><span>${esc(p.category)}</span><span aria-hidden="true">·</span><span>${p.year}</span>${
            p.badge ? `<span class="case__badge"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/></svg>${esc(p.badge)}</span>` : ''
          }</p>
          <h2 id="case-title" class="case__title">${esc(p.title)}</h2>
          <p class="case__tagline">${esc(p.tagline)}</p>
        </header>
        ${c ? `<p class="case__lead" data-reveal>${esc(c.summary)}</p>` : ''}
        <div class="case__sections">${parts.join('')}</div>
      </div>`
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
  const SVGNS = 'http://www.w3.org/2000/svg'
  let frame: SVGSVGElement | null = null
  let clone: HTMLElement | null = null

  const revealTargets = (): HTMLElement[] => {
    const q = (s: string) => [...content.querySelectorAll<HTMLElement>(s)]
    return [...q('.case__head'), ...q('.case__links'), ...q('.case__facts'), ...q('.case__lead'), ...q('.case__sec')]
  }

  function dropFrame(): void {
    if (frame) { gsap.killTweensOf(frame); frame.remove(); frame = null }
    if (clone) { gsap.killTweensOf(clone); clone.remove(); clone = null }
  }

  /** The visible thumbnail of the card (or tile) that opened the case. */
  function shotOf(el: HTMLElement | null | undefined): HTMLElement | null {
    if (!el?.isConnected) return null
    const host = el.closest<HTMLElement>('.card, .tile') ?? el
    return host.querySelector<HTMLElement>('.shot') ?? host
  }

  function makeClone(hero: HTMLElement, r: { left: number; top: number; width: number; height: number }): HTMLElement {
    const c = hero.cloneNode(true) as HTMLElement
    c.removeAttribute('data-reveal')
    c.classList.add('case__clone')
    c.setAttribute('aria-hidden', 'true')
    c.querySelectorAll('img').forEach((i) => i.setAttribute('alt', ''))
    wrap.appendChild(c)
    gsap.set(c, { left: r.left, top: r.top, width: r.width, height: r.height })
    clone = c
    return c
  }

  const arcs = (x: number, y: number, w: number, h: number, r: number) =>
    `H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`

  /**
   * One pen stroke: the panel outline grows in two directions from `s0`, they meet at the point nearest the
   * thumbnail, then the nib continues without lifting along a curved connector and draws the thumbnail outline.
   */
  function makeFrame(pr: DOMRect, hr: DOMRect | null, anchor: DOMRect | null) {
    const w = pr.width
    const h = pr.height
    const pad = 1
    const rad = Math.max(8, (parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 28))
    const svg = document.createElementNS(SVGNS, 'svg')
    svg.setAttribute('class', 'case__frame')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.style.cssText = `left:${pr.left}px;top:${pr.top}px;width:${w}px;height:${h}px`
    const mk = (tag: string, cls: string) => {
      const el = document.createElementNS(SVGNS, tag)
      el.setAttribute('class', cls)
      svg.appendChild(el)
      return el
    }
    const d = `M${pad + rad} ${pad}` + arcs(pad, pad, w - pad * 2, h - pad * 2, rad)
    const fwd = mk('path', 'case__frame-line') as SVGPathElement
    const back = mk('path', 'case__frame-line') as SVGPathElement
    const thumb = mk('path', 'case__frame-line') as SVGPathElement
    fwd.setAttribute('d', d)
    back.setAttribute('d', d)
    const nibA = mk('circle', 'case__frame-nib')
    const nibB = mk('circle', 'case__frame-nib')
    const nibC = mk('circle', 'case__frame-nib')
    ;[nibA, nibB, nibC].forEach((n) => n.setAttribute('r', '3.5'))
    nibC.setAttribute('opacity', '0')
    wrap.appendChild(svg)
    frame = svg

    const L = fwd.getTotalLength()
    const wrapL = (v: number) => ((v % L) + L) % L
    const nearest = (tx: number, ty: number) => {
      let best = Infinity
      let at = 0
      for (let i = 0; i < 360; i++) {
        const pt = fwd.getPointAtLength((L * i) / 360)
        const dist = (pt.x - tx) ** 2 + (pt.y - ty) ** 2
        if (dist < best) { best = dist; at = (L * i) / 360 }
      }
      return at
    }

    // thumbnail outline (drawn after the panel outline, same stroke)
    const gap = 5
    const tx = hr ? hr.left - pr.left - gap : 0
    const ty = hr ? hr.top - pr.top - gap : 0
    const tw = hr ? hr.width + gap * 2 : 0
    const th = hr ? hr.height + gap * 2 : 0
    const tr = 20 + gap
    let s0: number
    if (hr) {
      const sMeet = nearest(tx + tr, ty)
      s0 = wrapL(sMeet + L / 2)
      const meet = fwd.getPointAtLength(sMeet)
      const sx = tx + tr
      const sy = ty
      thumb.setAttribute('d', `M${meet.x} ${meet.y}Q${sx} ${meet.y} ${sx} ${sy}` + arcs(tx, ty, tw, th, tr))
    } else {
      const cx = anchor ? Math.min(Math.max(anchor.left + anchor.width / 2 - pr.left, 0), w) : w / 2
      const cy = anchor ? Math.min(Math.max(anchor.top + anchor.height / 2 - pr.top, 0), h) : 0
      s0 = nearest(cx, cy)
    }
    const origin = fwd.getPointAtLength(s0)
    const T = hr ? thumb.getTotalLength() : 0

    const state = { len: 0, t: 0 }
    const paint = () => {
      const len = state.len
      fwd.style.strokeDasharray = `${len} ${L - len + 2}`
      fwd.style.strokeDashoffset = `${-s0}`
      back.style.strokeDasharray = `${len} ${L - len + 2}`
      back.style.strokeDashoffset = `${-(s0 - len)}`
      const a = fwd.getPointAtLength(wrapL(s0 + len))
      const b = fwd.getPointAtLength(wrapL(s0 - len))
      nibA.setAttribute('cx', `${a.x}`); nibA.setAttribute('cy', `${a.y}`)
      nibB.setAttribute('cx', `${b.x}`); nibB.setAttribute('cy', `${b.y}`)
      if (hr) {
        const t = state.t
        thumb.style.strokeDasharray = `${T} ${T + 2}`
        thumb.style.strokeDashoffset = `${T * (1 - t) + (t <= 0 ? 4 : 0)}`
        thumb.style.opacity = t > 0 ? '1' : '0'
        const c = thumb.getPointAtLength(T * t)
        nibC.setAttribute('cx', `${c.x}`); nibC.setAttribute('cy', `${c.y}`)
        nibC.setAttribute('opacity', t > 0 && t < 1 ? '1' : '0')
        const dual = t > 0 ? '0' : '1'
        nibA.setAttribute('opacity', dual); nibB.setAttribute('opacity', dual)
      }
    }
    paint()
    return { svg, state, paint, origin, half: L / 2 }
  }

  function finish(): void {
    busy = null
    dropFrame()
    gsap.set([panel, content, ...content.querySelectorAll('[data-reveal]')], { clearProps: 'all' })
  }

  function animateOpen(from?: HTMLElement | null): void {
    busy?.kill()
    dropFrame()
    const hero = content.querySelector<HTMLElement>('.case__hero')
    const parts = revealTargets()
    const tl = gsap.timeline({ onComplete: finish })
    busy = tl
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0)
    if (reducedMotion || !hero) {
      tl.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0)
      return
    }

    const pr = panel.getBoundingClientRect()
    const hr = hero.getBoundingClientRect()
    const shot = shotOf(from)
    const src = shot ? shot.getBoundingClientRect() : null
    const { svg, state, paint, origin, half } = makeFrame(pr, hr, null)
    const cx = hr.left - pr.left + hr.width / 2
    const cy = hr.top - pr.top + hr.height / 2
    const rHero = Math.hypot(hr.width / 2, hr.height / 2) + 8
    const reach = Math.hypot(Math.max(cx, pr.width - cx), Math.max(cy, pr.height - cy)) + 8
    void origin

    // panel hidden until the glass floods; hero + content waiting
    panel.style.clipPath = `circle(0px at ${cx}px ${cy}px)`
    gsap.set(hero, { visibility: 'hidden' })
    gsap.set(parts, { opacity: 0, y: 16 })

    // 0: the card's thumbnail is cloned and lifts off
    const c = makeClone(hero, src ?? { left: hr.left + hr.width * 0.06, top: hr.top + hr.height * 0.06, width: hr.width * 0.88, height: hr.height * 0.88 })
    if (!src) gsap.set(c, { opacity: 0 })
    const target = { left: hr.left, top: hr.top, width: hr.width, height: hr.height }
    let swapped = false
    const swap = () => {
      if (swapped) return
      swapped = true
      gsap.set(hero, { visibility: 'visible' })
      if (clone) { clone.remove(); clone = null }
    }

    // 0.05–0.75: panel outline from the point nearest the card, two dashes growing together
    tl.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.05)
    tl.to(state, { len: half, duration: 0.7, ease: 'power2.inOut', onUpdate: paint }, 0.05)
    // 0.7–1.15: pen carries on to the thumbnail outline while the clone lands in its slot
    tl.to(state, { t: 1, duration: 0.45, ease: 'power1.inOut', onUpdate: paint }, 0.7)
    tl.to(c, { ...target, opacity: 1, duration: 0.45, ease: 'expo.out' }, 0.7)
    // 1.1–1.5: glass floods from the thumbnail; clone swaps for the real image once covered
    const flood = { r: 0 }
    tl.to(flood, {
      r: reach, duration: 0.55, ease: 'power2.out',
      onUpdate: () => {
        panel.style.clipPath = `circle(${flood.r}px at ${cx}px ${cy}px)`
        if (flood.r >= rHero) swap()
      },
    }, 1.1)
    tl.to(parts, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.05 }, 1.2)
    // the drawn line settles into the normal glass border
    tl.to(svg, { opacity: 0, duration: 0.45, ease: 'power1.inOut' }, 1.55)
    if (isMobile()) tl.timeScale(1.7)
  }

  function animateClose(id: string, done: () => void): void {
    busy?.kill()
    dropFrame()
    gsap.set([panel, content, ...content.querySelectorAll('[data-reveal]')], { clearProps: 'all' })
    const hero = content.querySelector<HTMLElement>('.case__hero')
    const parts = revealTargets()
    const shot = shotOf(opener)
    const shotHost = shot?.closest<HTMLElement>('[data-id]')
    const tl = gsap.timeline({ onComplete: () => { dropFrame(); done() } })
    busy = tl
    tl.to(backdrop, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0.1)
    if (reducedMotion || !hero) {
      tl.to(panel, { opacity: 0, duration: 0.15 }, 0)
      return
    }
    const pr = panel.getBoundingClientRect()
    const hr = hero.getBoundingClientRect()
    const cx = hr.left - pr.left + hr.width / 2
    const cy = hr.top - pr.top + hr.height / 2
    const reach = Math.hypot(Math.max(cx, pr.width - cx), Math.max(cy, pr.height - cy)) + 8
    const src = shot && (!shotHost || shotHost.dataset.id === id) ? shot.getBoundingClientRect() : null
    const { svg, state, paint, half } = makeFrame(pr, null, src)
    state.len = half
    paint()
    panel.style.clipPath = `circle(${reach}px at ${cx}px ${cy}px)`
    const c = makeClone(hero, hr)
    gsap.set(hero, { visibility: 'hidden' })
    // content out, glass recedes into the thumbnail
    tl.to(parts, { opacity: 0, y: 8, duration: 0.14, ease: 'power1.in', stagger: 0.01 }, 0)
    const flood = { r: reach }
    tl.to(flood, { r: 0, duration: 0.3, ease: 'power2.in', onUpdate: () => { panel.style.clipPath = `circle(${flood.r}px at ${cx}px ${cy}px)` } }, 0.1)
    // thumbnail flies back to its card
    if (src) tl.to(c, { left: src.left, top: src.top, width: src.width, height: src.height, duration: 0.35, ease: 'power3.inOut' }, 0.1)
    else tl.to(c, { opacity: 0, scale: 0.92, duration: 0.25, ease: 'power2.in' }, 0.1)
    // outline erases back to where it started
    tl.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0)
    tl.to(state, { len: 0, duration: 0.3, ease: 'power2.inOut', onUpdate: paint }, 0.15)
    tl.to(svg, { opacity: 0, duration: 0.08 }, 0.4)
    tl.to(c, { opacity: 0, duration: 0.08 }, 0.4)
    if (isMobile()) tl.timeScale(1.1)
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
    const closing = currentId
    currentId = null
    opener = null
    document.removeEventListener('keydown', trap)
    clearHash()
    animateClose(closing, () => {
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
  window.addEventListener('resize', () => { if (busy) busy.progress(1) })

  // The pen's intro releases scroll when it finishes; keep it locked while a case is open.
  on('intro:done', () => { if (currentId) lockScroll(true) })

  if (HASH.test(location.hash)) fromHash()
}
