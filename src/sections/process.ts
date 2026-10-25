/** STORY agent. #process: pinned horizontal chapter "03 How I work" with an ink line drawn across four glass panels. */
import { emit } from '../core/bus'
import { gsap, ScrollTrigger } from '../core/motion'

const STEPS = [
  { t: 'Find the real problem', d: 'Talk to the people living it. The brief is rarely the problem.' },
  { t: 'Shape the smallest fix', d: 'Sketch it, cut it down, decide what not to build.' },
  { t: 'Build it properly', d: 'Typed, tested, secure by default, fast on a cheap phone.' },
  { t: 'Ship and stay', d: 'Real users, real feedback, and the next version.' },
]
const VB_H = 70
const BASE_Y = 35

export function initProcess(): void {
  const sec = document.getElementById('process')
  if (!sec) return

  // Two stops frame the pin. The vertical line dives down the left edge into the pinned chapter (hidden behind it, where the
  // horizontal line takes over from the left) and re-emerges down the right edge, where the horizontal line leaves.
  if (!document.querySelector('.proc-stop')) {
    const stop = document.createElement('div')
    stop.className = 'proc-stop'
    stop.setAttribute('aria-hidden', 'true')
    stop.dataset.penStop = 'process'
    stop.dataset.penSide = 'left'
    sec.before(stop)
  }
  let exit = document.querySelector<HTMLElement>('.proc-exit')
  if (!exit) {
    exit = document.createElement('div')
    exit.className = 'proc-exit'
    exit.setAttribute('aria-hidden', 'true')
    exit.dataset.penStop = 'process-out'
    exit.dataset.penSide = 'left'
    ;(sec.parentElement?.classList.contains('pin-spacer') ? sec.parentElement : sec).after(exit)
  }
  const exitEl = exit

  sec.innerHTML = `
    <div class="proc__bg" aria-hidden="true"></div>
    <span class="proc__numeral" aria-hidden="true">03</span>
    <div class="proc__stage">
      <header class="proc__head">
        <p class="eyebrow">03 <span aria-hidden="true">/</span> How I work</p>
        <h2 id="process-title" class="sec-title">How I work</h2>
      </header>
      <div class="proc__viewport">
        <div class="proc__track">
          <div class="proc__lane" aria-hidden="true">
            <svg class="proc__line" viewBox="0 0 1000 ${VB_H}" preserveAspectRatio="none" focusable="false">
              <path class="proc__path" d="" pathLength="1" />
            </svg>
            ${STEPS.map(() => '<span class="proc__node"></span>').join('')}
            <span class="proc__nib"></span>
          </div>
          <ol class="proc__panels">
            ${STEPS.map(
              (s, i) => `
            <li class="proc__panel glass">
              <div class="proc__lift">
                <span class="proc__num">0${i + 1}</span>
                <h3 class="proc__title">${s.t}</h3>
              </div>
              <p class="proc__desc">${s.d}</p>
              <svg class="proc__stroke" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M2 6 C 20 0, 36 12, 60 6 S 100 0, 118 6" pathLength="1" /></svg>
            </li>`,
            ).join('')}
          </ol>
        </div>
      </div>
    </div>`

  const $ = <T extends HTMLElement | SVGElement>(s: string) => sec.querySelector<T>(s)!
  const track = $<HTMLElement>('.proc__track')
  const path = $<SVGPathElement>('.proc__path')
  const svg = $<SVGSVGElement>('.proc__line')
  const nib = $<HTMLElement>('.proc__nib')
  const numeral = $<HTMLElement>('.proc__numeral')
  const panels = Array.from(sec.querySelectorAll<HTMLElement>('.proc__panel'))
  const nodes = Array.from(sec.querySelectorAll<HTMLElement>('.proc__node'))
  const strokes = Array.from(sec.querySelectorAll<SVGPathElement>('.proc__stroke path'))

  const mm = gsap.matchMedia()
  let pending = 0
  const relayout = () => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(() => {
      ScrollTrigger.refresh()
      emit('layout:change')
    })
  }

  // ── Desktop: pinned horizontal scroll ─────────────────────────
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    sec.classList.add('proc--h')
    exitEl.dataset.penSide = 'right'
    let centers: number[] = []
    let W = 1
    let dist = 0
    let vw = 1

    const build = () => {
      vw = window.innerWidth
      W = track.scrollWidth
      dist = Math.max(0, W - vw)
      centers = panels.map((p) => p.offsetLeft + p.offsetWidth / 2)
      svg.setAttribute('viewBox', `0 0 ${W} ${VB_H}`)
      // gentle cursive-feeling waves; control points alternate above/below so tangents stay smooth
      let d = `M0 ${BASE_Y}`
      const pts = [0, ...centers, W]
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]
        const b = pts[i]
        const dir = i % 2 ? -1 : 1
        d += ` Q${((a + b) / 2).toFixed(1)} ${BASE_Y + dir * 24} ${b.toFixed(1)} ${BASE_Y}`
      }
      path.setAttribute('d', d)
      nodes.forEach((n, i) => (n.style.left = `${(centers[i] / W) * 100}%`))
      gsap.set(numeral, { x: 0 })
      // the exit stop sits at the lane's height so the vertical line picks up exactly where the horizontal one leaves
      const lane = svg.getBoundingClientRect().top - sec.getBoundingClientRect().top + (BASE_Y / VB_H) * svg.getBoundingClientRect().height
      exitEl.style.top = `${(lane - sec.offsetHeight).toFixed(1)}px`
    }
    build()

    const nibPos = (frac: number) => {
      const pt = path.getPointAtLength(frac * path.getTotalLength())
      nib.style.left = `${(pt.x / W) * 100}%`
      nib.style.top = `${(pt.y / VB_H) * 100}%`
    }
    const on = new Array(panels.length).fill(false)
    const apply = (p: number) => {
      const tipX = dist * p + vw * (0.2 + 0.8 * p)
      const frac = Math.min(1, Math.max(0, tipX / W))
      path.style.strokeDashoffset = String(1 - frac)
      nibPos(frac)
      nib.style.opacity = p >= 0.995 ? '0.0' : '1'
      gsap.set(numeral, { x: -dist * 0.22 * p })
      const tipU = frac * W
      centers.forEach((c, i) => {
        const hit = tipU >= c - 6
        if (hit !== on[i]) {
          on[i] = hit
          panels[i].classList.toggle('is-on', hit)
          nodes[i].classList.toggle('is-on', hit)
        }
      })
    }
    path.style.strokeDasharray = '1'
    path.style.strokeDashoffset = '1'

    const tween = gsap.to(track, { x: () => -dist, ease: 'none', paused: true })
    const st = ScrollTrigger.create({
      trigger: sec,
      start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * 2.5),
      pin: true,
      scrub: 0.6,
      animation: tween,
      refreshPriority: 10,
      invalidateOnRefresh: true,
      onRefreshInit: build,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
      onEnter: () => emit('pen:hold', { on: true }),
      onEnterBack: () => emit('pen:hold', { on: true }),
      onLeave: () => emit('pen:hold', { on: false }),
      onLeaveBack: () => emit('pen:hold', { on: false }),
    })
    apply(0)
    relayout()

    return () => {
      st.kill()
      tween.kill()
      sec.classList.remove('proc--h')
      exitEl.dataset.penSide = 'left'
      exitEl.style.top = ''
      panels.forEach((p) => p.classList.remove('is-on'))
      nodes.forEach((n) => n.removeAttribute('style'))
      path.removeAttribute('style')
      nib.removeAttribute('style')
      numeral.removeAttribute('style')
      track.removeAttribute('style')
      emit('pen:hold', { on: false })
      relayout()
    }
  })

  // ── Mobile / reduced motion: vertical list, short strokes draw as each panel enters ──
  mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panels.forEach((p) => p.classList.add('is-on'))
    if (reduce) {
      strokes.forEach((s) => (s.style.strokeDashoffset = '0'))
      return
    }
    strokes.forEach((s, i) => {
      gsap.set(s, { strokeDasharray: 1, strokeDashoffset: 1 })
      gsap.to(s, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: { trigger: panels[i], start: 'top 85%', end: 'top 45%', scrub: 0.4 },
      })
    })
    return () => {
      strokes.forEach((s) => s.removeAttribute('style'))
    }
  })

  window.addEventListener('load', relayout)
  document.fonts?.ready.then(relayout).catch(() => {})
}
