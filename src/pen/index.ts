/**
 * Owner: pen agent. Lays out and plays the intro handwriting, then builds the scroll-driven line
 * through every [data-pen-stop] anchor. Resolves once the intro is running (not finished).
 */
import './pen.css'
import { emit, on } from '../core/bus'
import { gsap, ScrollTrigger, isMobile, lockScroll, reducedMotion } from '../core/motion'
import { NS, type Pt, type Rect } from './glyph'
import { buildIntro, computeLayout, createTimeline, type IntroDOM } from './intro'
import { buildJourney, lengthAtKey, pointAtLength, type Anchor, type Journey, type Side } from './journey'
import { createInk } from './ink'
import { initCursor } from './cursor'
import { initSignature } from './signature'

/** scroll position saved on unload, so a reload can tell whether it was at the top before the browser restores it */
const SCROLL_KEY = 'cb-y'
/** where the pen tip sits while scrolling, as a fraction of the viewport height */
const TIP_FRAC = 0.62

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const smooth = (t: number) => t * t * (3 - 2 * t)

/** Position of `el` inside `root` from layout offsets, so transforms (reveals, tilt) never skew the line. */
function relRect(el: HTMLElement, root: HTMLElement): Rect | null {
  let x = 0
  let y = 0
  let n: HTMLElement | null = el
  const w = el.offsetWidth
  const h = el.offsetHeight
  while (n && n !== root) {
    x += n.offsetLeft
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  if (n !== root || (!w && !h)) {
    const r = el.getBoundingClientRect()
    const m = root.getBoundingClientRect()
    if (!r.width && !r.height) return null
    return { x: r.left - m.left, y: r.top - m.top, w: r.width, h: r.height }
  }
  return { x, y, w, h }
}

function readAnchors(main: HTMLElement): Anchor[] {
  const mobile = isMobile()
  const out: Anchor[] = []
  const st = mobile && document.getElementById('intro-stage')
  const sr = st ? relRect(st, main) : null
  // phone: swing out to the left edge right under the name, before the tagline, so the line never crosses it
  if (sr) out.push({ id: '', side: 'left', gap: 0, rect: { x: 0, y: sr.y + sr.h - 90, w: 1, h: 2 } })
  document.querySelectorAll<HTMLElement>('[data-pen-stop]').forEach((el) => {
    const rect = relRect(el, main)
    if (!rect || (rect.w < 2 && rect.h < 2)) return
    const raw = (mobile && el.dataset.penSideMobile) || el.dataset.penSide || 'through'
    const side: Side = raw === 'left' || raw === 'right' || raw === 'end' ? raw : 'through'
    const gap = Number(el.dataset.penGap)
    // phone: the only free column is the gutter, so the line rides the left edge and never crosses copy
    if (mobile && side !== 'end') {
      out.push({ id: el.dataset.penStop || '', side: 'left', gap: 0, rect: { ...rect, x: 0 } })
      return
    }
    out.push({ id: el.dataset.penStop || '', side, gap: Number.isFinite(gap) && el.dataset.penGap ? gap : 28, rect })
  })
  return out
}

export async function initPen(): Promise<void> {
  const main = document.getElementById('main')
  const layer = document.getElementById('pen-layer')
  const stage = document.getElementById('intro-stage')
  const canvas = document.getElementById('ink') as HTMLCanvasElement | null
  if (!main || !layer || !stage || !canvas) throw new Error('pen: layout elements missing')

  /* ── DOM: one svg, one glow group, intro nodes + the journey path ── */
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const art = document.createElementNS(NS, 'g')
  art.setAttribute('class', 'pen-art')
  const introG = document.createElementNS(NS, 'g')
  introG.setAttribute('class', 'pen-intro')
  const jGlow = document.createElementNS(NS, 'path')
  jGlow.setAttribute('class', 'pen-glow')
  const jPath = document.createElementNS(NS, 'path')
  jPath.setAttribute('class', 'pen-stroke')
  art.append(introG, jGlow, jPath)
  svg.appendChild(art)
  layer.replaceChildren(svg)

  const ink = createInk(canvas)
  let held = false
  let baseLw = 3
  on('pen:hold', ({ on: h }) => {
    held = h
    ink.hold(h)
  })
  initCursor(ink)
  initSignature()
  const pulse = { w: 0 }
  function inkDrop() {
    if (reducedMotion) return
    gsap.killTweensOf(pulse)
    pulse.w = 1
    gsap.to(pulse, {
      w: 0,
      duration: 0.25,
      ease: 'power2.out',
      onUpdate: () => {
        jPath.style.strokeWidth = (baseLw * (1 + 0.4 * pulse.w)).toFixed(2)
        jGlow.style.strokeWidth = (baseLw * (4 + 0.4 * pulse.w)).toFixed(2)
      },
    })
  }

  /* ── state ── */
  type Phase = 'idle' | 'playing' | 'skipping' | 'done'
  let phase: Phase = 'idle'
  let intro: IntroDOM | null = null
  let tl: gsap.core.Timeline | null = null
  let journey: Journey | null = null
  let nativeLen = 1
  let mainTop = 0
  let maxScroll = 0
  let lastSig = ''
  let curL = 0
  let tgtL = 0
  let quiet = true
  let lastP = -1
  const reached = new Set<string>()
  const tmp: Pt = { x: 0, y: 0 }

  const hooks = {
    pen(p: Pt, inking: boolean) {
      if (held) return
      ink.tip(p.x, p.y + mainTop, !inking)
    },
    burst(p: Pt) {
      if (held) return
      ink.burst(p.x, p.y + mainTop, 60, 7, 3.4)
    },
    finish() {
      finishIntro()
    },
  }

  /* ── measure + (re)build everything that depends on layout ── */
  function measure() {
    const W = main!.offsetWidth
    const H = main!.offsetHeight
    const st = relRect(stage!, main!) ?? { x: 0, y: 0, w: W, h: window.innerHeight }
    const anchors = readAnchors(main!)
    const sig = [W, H, st.x, st.y, st.w, st.h, ...anchors.flatMap((a) => [a.id, a.side, a.gap, a.rect.x, a.rect.y, a.rect.w, a.rect.h])].join('|')
    return { W, H, st, anchors, sig }
  }

  function rebuild(force = false) {
    const m = measure()
    if (!force && m.sig === lastSig) return
    lastSig = m.sig
    mainTop = main!.getBoundingClientRect().top + window.scrollY
    svg.setAttribute('viewBox', `0 0 ${m.W} ${m.H}`)
    svg.setAttribute('width', String(m.W))
    svg.setAttribute('height', String(m.H))

    // intro words, connectors, circle, flick
    const prog = phase === 'playing' && tl ? tl.progress() : 0
    const wasPlaying = phase === 'playing'
    tl?.kill()
    tl = null
    introG.replaceChildren()
    const layout = computeLayout(m.st, m.W)
    intro = buildIntro(introG, layout)
    baseLw = layout.lw
    jPath.style.strokeWidth = baseLw.toFixed(2)
    jGlow.style.strokeWidth = (baseLw * 4).toFixed(2)
    if (phase === 'done') intro.all.forEach((s) => s.set(1))
    else {
      intro.all.forEach((s) => s.set(0))
      if (phase === 'playing' || phase === 'skipping') {
        tl = createTimeline(intro, hooks)
        tl.progress(prog)
        if (wasPlaying) tl.play()
      }
    }

    // journey
    journey = buildJourney(intro.F, intro.tan, m.anchors, m.W, m.H)
    jPath.setAttribute('d', journey.d)
    jGlow.setAttribute('d', journey.d)
    nativeLen = Math.max(1, jPath.getTotalLength())
    const k = nativeLen / Math.max(1, journey.total)
    for (let i = 0; i < journey.len.length; i++) journey.len[i] *= k
    for (const s of journey.stops) s.len *= k
    journey.approachLen *= k
    jPath.style.strokeDasharray = jGlow.style.strokeDasharray = `${nativeLen} ${nativeLen}`

    maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    quiet = true
    tgtL = computeTarget()
    curL = tgtL
    render(0)
    quiet = false
  }

  /* ── scroll → path length ── */
  function computeTarget(): number {
    const j = journey
    if (!j || !intro) return 0
    if (reducedMotion) return nativeLen
    if (phase !== 'done') return 0
    const vh = window.innerHeight
    const s = window.scrollY
    maxScroll = Math.max(0, document.documentElement.scrollHeight - vh)
    if (s >= maxScroll - 1 && maxScroll > 0) return nativeLen
    // the tip rises from the flick's own height to TIP_FRAC, and is pulled lower near the end so the underline always completes
    const fStart = clamp((intro.F.y + mainTop) / vh, 0.25, TIP_FRAC)
    const fEnd = clamp((j.keyEnd + mainTop + 6 - maxScroll) / vh, TIP_FRAC, 0.97)
    const frac =
      fStart + (TIP_FRAC - fStart) * smooth(clamp(s / (vh * 0.5), 0, 1)) + (fEnd - TIP_FRAC) * smooth(clamp((s - (maxScroll - vh * 0.9)) / (vh * 0.9), 0, 1))
    return clamp(lengthAtKey(j, s + vh * frac - mainTop), 0, nativeLen)
  }

  let ticking = false
  function wake() {
    if (ticking) return
    ticking = true
    gsap.ticker.add(step)
  }
  function step(_t: number, dtMs: number) {
    const dt = Math.min(0.05, dtMs / 1000)
    const d = tgtL - curL
    const prev = curL
    curL = Math.abs(d) < 0.3 ? tgtL : curL + d * (1 - Math.exp(-dt * 24))
    render(curL - prev)
    if (curL === tgtL) {
      ticking = false
      gsap.ticker.remove(step)
    }
  }

  function render(moved: number) {
    const j = journey
    if (!j) return
    jPath.style.strokeDashoffset = jGlow.style.strokeDashoffset = String(nativeLen - curL)
    if (!held && moved !== 0 && curL > 0 && curL < nativeLen - 0.5 && !reducedMotion) {
      pointAtLength(j, curL, tmp)
      ink.tip(tmp.x, tmp.y + mainTop)
    }
    // stops
    for (const s of j.stops) {
      const hit = curL >= s.len - 0.5 && curL > 0
      if (hit && !reached.has(s.id)) {
        reached.add(s.id)
        if (!quiet && !reducedMotion && !held) {
          ink.burst(s.pt.x, s.pt.y + mainTop, 40, 5, 3)
          inkDrop()
        }
        if (s.id) emit('pen:reach', { id: s.id })
      } else if (!hit && reached.has(s.id)) {
        reached.delete(s.id)
        if (s.id) emit('pen:leave', { id: s.id })
      }
    }
    const p = curL / nativeLen
    if (Math.abs(p - lastP) > 0.0007 || p === 0 || p === 1) {
      lastP = p
      if (phase === 'done') emit('pen:progress', { p })
    }
  }

  function onScroll() {
    if (phase !== 'done' || reducedMotion) return
    tgtL = computeTarget()
    if (tgtL !== curL) wake()
  }

  /* ── intro lifecycle ── */
  let skipBtn: HTMLButtonElement | null = null
  const skipEvents = ['wheel', 'touchmove', 'keydown', 'click'] as const
  const onSkipEvent = (e: Event) => {
    if (e.type === 'keydown') {
      const k = (e as KeyboardEvent).key
      if (k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'Meta') return
    }
    skip()
  }

  function skip() {
    if (phase !== 'playing' || !tl) return
    phase = 'skipping'
    const t = tl
    t.pause()
    gsap.to(t, { progress: 1, duration: 0.3, ease: 'power2.out', overwrite: true })
  }

  function finishIntro() {
    if (phase === 'done') return
    const skipped = phase === 'skipping'
    phase = 'done'
    skipEvents.forEach((ev) => window.removeEventListener(ev, onSkipEvent))
    skipBtn?.remove()
    skipBtn = null
    // Skipping fast-forwards through the whole timeline; make sure the drawn state is final.
    intro?.all.forEach((s) => s.set(1))
    lockScroll(false)
    emit('intro:done', { skipped })
    ScrollTrigger.refresh()
    quiet = false
    tgtL = computeTarget()
    wake()
  }

  /* ── wiring ── */
  let raf = 0
  const schedule = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const before = lastSig
      rebuild()
      if (lastSig !== before) onScroll()
    })
  }
  let resizeTimer = 0
  window.addEventListener('resize', () => {
    ink.resize()
    clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(schedule, 90)
  })
  on('layout:change', () => {
    clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(schedule, 60)
  })
  on('theme:change', () => ink.refreshTheme())
  ScrollTrigger.addEventListener('refresh', () => schedule())
  if ('ResizeObserver' in window) {
    let first = true
    new ResizeObserver(() => {
      if (first) {
        first = false
        return
      }
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(schedule, 120)
    }).observe(main)
  }
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: onScroll })

  /* ── go ── */
  // The intro replays on every load that starts at the top, including reloads; never mid-page.
  let lastY = 0
  try {
    lastY = Number(sessionStorage.getItem(SCROLL_KEY)) || 0
  } catch {
    /* private mode */
  }
  window.addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)))
    } catch {
      /* private mode */
    }
  })
  const deepLinked = window.location.hash.length > 1
  const autoplay = !reducedMotion && !deepLinked && window.scrollY < 40 && lastY < 40

  if (!autoplay) {
    phase = 'done'
    rebuild(true)
    lockScroll(false)
    emit('intro:done', { skipped: true })
    onScroll()
    return
  }

  phase = 'playing'
  lockScroll(true)
  rebuild(true)
  skipEvents.forEach((ev) => window.addEventListener(ev, onSkipEvent, { passive: true }))
  skipBtn = document.createElement('button')
  skipBtn.type = 'button'
  skipBtn.className = 'pen-skip'
  skipBtn.textContent = 'Skip intro'
  document.body.appendChild(skipBtn)
  window.setTimeout(() => skipBtn?.classList.add('is-on'), 900)
  const t0 = tl as gsap.core.Timeline | null
  t0?.play()
}
