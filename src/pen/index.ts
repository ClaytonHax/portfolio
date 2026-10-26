/**
 * Owner: pen agent. Lays out and plays the intro handwriting, then builds the scroll-driven line
 * through every [data-pen-stop] anchor. Resolves once the intro is running (not finished).
 */
import './pen.css'
import { emit, on } from '../core/bus'
import { gsap, ScrollTrigger, isMobile, lockScroll, reducedMotion } from '../core/motion'
import { NS, type Pt, type Rect } from './glyph'
import { buildIntro, computeLayout, createTimeline, type IntroDOM } from './intro'
import { buildJourney, lengthAtKey, pointAtLength, rescaleJourney, type Anchor, type Journey, type Side, type TraceShape } from './journey'
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

/** Position and size of `el` inside `root` from layout offsets (no transforms). Falls back to bounding boxes. */
function offsetWithin(el: HTMLElement, root: HTMLElement): Rect | null {
  const w = el.offsetWidth
  const h = el.offsetHeight
  if (!w && !h) return null
  let x = 0
  let y = 0
  let n: HTMLElement | null = el
  while (n && n !== root) {
    x += n.offsetLeft
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  if (n === root) return { x, y, w, h }
  const r = el.getBoundingClientRect()
  const m = root.getBoundingClientRect()
  return { x: r.left - m.left, y: r.top - m.top, w: r.width, h: r.height }
}

interface Pin {
  D: number
  /** window scroll at which the stage's pin starts */
  S0: number
}

/** The trace stop: stage box from its pin-spacer (stable while pinned), shapes by offsets within the stage. */
function traceAnchor(el: HTMLElement, main: HTMLElement, mobile: boolean): { anchor: Anchor; pin: Pin | null } | null {
  const spacer = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : null
  const base = relRect(spacer ?? el, main)
  if (!base) return null
  const rect: Rect = { x: base.x, y: base.y, w: base.w, h: el.offsetHeight || base.h }
  const INF = 4
  const shapes: TraceShape[] = []
  el.querySelectorAll<HTMLElement>('[data-pen-shape]').forEach((sh) => {
    if (mobile && !sh.hasAttribute('data-pen-shape-mobile')) return
    const o = offsetWithin(sh, el)
    if (!o || o.w < 2 || o.h < 2) return
    // the phone carousel scrolls sideways; the traced hero is the snapped, centred one
    const ox = mobile ? (rect.w - o.w) / 2 : o.x
    const r = Number(sh.dataset.penR)
    shapes.push({
      id: sh.dataset.penShape || '',
      x: rect.x + ox - INF,
      y: rect.y + o.y - INF,
      w: o.w + INF * 2,
      h: o.h + INF * 2,
      r: (Number.isFinite(r) && sh.dataset.penR ? r : o.w * 0.17) + INF,
    })
  })
  if (!shapes.length) return null
  const D = mobile ? 0 : Math.max(0, Number(el.dataset.penPin) || 0)
  const T = Number(el.dataset.penPinTop) || 0
  // extra pinned scroll after the line has left the stage (the phones zoom there); the line waits at the stage's exit
  const Z = D > 0 ? Math.max(0, Number(el.dataset.penHold) || 0) : 0
  const vh = window.innerHeight
  const gap = Number(el.dataset.penGap)
  const mainTop = main.getBoundingClientRect().top + window.scrollY
  const anchor: Anchor = {
    id: el.dataset.penStop || '',
    side: 'trace',
    gap: Number.isFinite(gap) && el.dataset.penGap ? gap : 28,
    rect,
    shapes,
    phone: mobile,
  }
  if (D > 0) {
    anchor.pinD = D
    anchor.pinHold = Z
    anchor.pinKey = rect.y - T + vh * TIP_FRAC
  }
  return { anchor, pin: D > 0 ? { D: D + Z, S0: mainTop + rect.y - T } : null }
}

function readAnchors(main: HTMLElement): { anchors: Anchor[]; pin: Pin | null } {
  const mobile = isMobile()
  const out: Anchor[] = []
  let pin: Pin | null = null
  const st = mobile && document.getElementById('intro-stage')
  const sr = st ? relRect(st, main) : null
  // phone: swing out to the left edge right under the name, before the tagline, so the line never crosses it
  if (sr) out.push({ id: '', side: 'left', gap: 0, rect: { x: 0, y: sr.y + sr.h - 90, w: 1, h: 2 } })
  let traced = false
  document.querySelectorAll<HTMLElement>('[data-pen-stop]').forEach((el) => {
    if (el.dataset.penSide === 'trace' && !traced) {
      const t = traceAnchor(el, main, mobile)
      if (t) {
        traced = true
        out.push(t.anchor)
        pin = t.pin
        return
      }
    }
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
  return { anchors: out, pin }
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
  // the line is three path pairs sharing one dash clock: A (before the trace), B (the traced shapes, rides with the
  // pinned stage), C (after). Glow is a wide faint stroke underneath each stroke.
  const mkPath = (cls: string) => {
    const el = document.createElementNS(NS, 'path')
    el.setAttribute('class', cls)
    return el
  }
  const glows = [mkPath('pen-glow'), mkPath('pen-glow'), mkPath('pen-glow')]
  const strokes = [mkPath('pen-stroke'), mkPath('pen-stroke'), mkPath('pen-stroke')]
  const gB = document.createElementNS(NS, 'g')
  gB.setAttribute('class', 'pen-trace')
  gB.append(glows[1], strokes[1])
  art.append(introG, glows[0], strokes[0], gB, glows[2], strokes[2])
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
  const setLw = (m: number) => {
    for (const el of strokes) el.style.strokeWidth = (baseLw * m).toFixed(2)
    for (const el of glows) el.style.strokeWidth = (baseLw * (3 + m)).toFixed(2)
  }
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
        setLw(1 + 0.4 * pulse.w)
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
  /** native lengths of the A / B / C pieces */
  let nat = [0, 0, 0]
  let pin: { D: number; S0: number } | null = null
  let trY = -1
  let dimmed = false
  const shapeP = new Map<string, number>()
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
    const { anchors, pin: pn } = readAnchors(main!)
    const sig = [
      W,
      H,
      st.x,
      st.y,
      st.w,
      st.h,
      pn ? `${pn.D}:${Math.round(pn.S0)}` : '',
      ...anchors.flatMap((a) => [
        a.id,
        a.side,
        a.gap,
        a.rect.x,
        a.rect.y,
        a.rect.w,
        a.rect.h,
        ...(a.shapes ?? []).flatMap((q) => [q.id, q.x, q.y, q.w, q.h, q.r]),
      ]),
    ].join('|')
    return { W, H, st, anchors, pin: pn, sig }
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
    setLw(1)
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
    pin = m.pin
    const ds = [journey.dA, journey.dB, journey.dC]
    nat = ds.map((d, i) => {
      glows[i].setAttribute('d', d)
      strokes[i].setAttribute('d', d)
      const n = d ? Math.max(1, strokes[i].getTotalLength()) : 0
      glows[i].style.strokeDasharray = strokes[i].style.strokeDasharray = `${n} ${n}`
      return n
    })
    rescaleJourney(journey, nat[0], nat[1], nat[2])
    nativeLen = Math.max(1, nat[0] + nat[1] + nat[2])
    shapeP.clear()
    trY = -1

    maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    quiet = true
    tgtL = computeTarget()
    curL = tgtL
    render(0)
    quiet = false
  }

  /** the traced piece rides with the pinned stage */
  function applyTrans() {
    const t = !pin || reducedMotion ? 0 : clamp(window.scrollY - pin.S0, 0, pin.D)
    if (Math.abs(t - trY) < 0.05) return
    trY = t
    gB.setAttribute('transform', `translate(0 ${t.toFixed(2)})`)
  }
  const inBy = (l: number) => (journey && l > journey.aLen && l <= journey.bLen ? trY : 0)

  on('pen:dim', ({ id, on: dim }) => {
    if (!journey || id !== journey.traceId || dim === dimmed) return
    dimmed = dim
    gsap.to(gB, { opacity: dim ? 0 : 1, duration: 0.3, ease: 'power1.out', overwrite: true })
  })

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
    applyTrans()
    let off = 0
    for (let i = 0; i < 3; i++) {
      const v = clamp(curL - off, 0, nat[i])
      const o = String(nat[i] - v)
      glows[i].style.strokeDashoffset = strokes[i].style.strokeDashoffset = o
      glows[i].style.visibility = strokes[i].style.visibility = v > 0.01 ? 'visible' : 'hidden'
      off += nat[i]
    }
    if (!held && moved !== 0 && curL > 0 && curL < nativeLen - 0.5 && !reducedMotion) {
      pointAtLength(j, curL, tmp)
      ink.tip(tmp.x, tmp.y + mainTop + inBy(curL))
    }
    // stops
    for (const s of j.stops) {
      const hit = curL >= s.len - 0.5 && curL > 0
      if (hit && !reached.has(s.id)) {
        reached.add(s.id)
        if (!quiet && !reducedMotion && !held) {
          ink.burst(s.pt.x, s.pt.y + mainTop + (s.inB ? trY : 0), 40, 5, 3)
          inkDrop()
        }
        if (s.id) emit('pen:reach', { id: s.id })
      } else if (!hit && reached.has(s.id)) {
        reached.delete(s.id)
        if (s.id) emit('pen:leave', { id: s.id })
      }
    }
    // progress of the line round each traced shape
    for (const sh of j.shapes) {
      const q = clamp((curL - sh.start) / Math.max(1e-6, sh.end - sh.start), 0, 1)
      const old = shapeP.get(sh.id)
      if (old === undefined || Math.abs(q - old) > 0.0015 || ((q === 0 || q === 1) && q !== old)) {
        shapeP.set(sh.id, q)
        emit('pen:shape', { id: sh.id, p: q })
      }
    }
    const p = curL / nativeLen
    if (Math.abs(p - lastP) > 0.0007 || p === 0 || p === 1) {
      lastP = p
      if (phase === 'done') emit('pen:progress', { p })
    }
  }

  function onScroll() {
    applyTrans()
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
    if (deferred) {
      deferred = false
      rebuild()
    }
    // Skipping fast-forwards through the whole timeline; make sure the drawn state is final.
    intro?.all.forEach((s) => s.set(1))
    lockScroll(false)
    emit('intro:done', { skipped })
    shapeP.clear()
    render(0)
    ScrollTrigger.refresh()
    quiet = false
    tgtL = computeTarget()
    wake()
  }

  /* ── wiring ── */
  let raf = 0
  /** a layout change arrived mid-intro; applied once the intro is done */
  let deferred = false
  const schedule = (urgent = false) => {
    // Late fonts/images fire layout changes while the name is being written. Rebuilding then tears down and
    // recreates the whole intro timeline mid-stroke (a visible hitch on a cold load), so wait until it is done.
    if (!urgent && (phase === 'playing' || phase === 'skipping')) {
      deferred = true
      return
    }
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
    resizeTimer = window.setTimeout(() => schedule(true), 90)
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
    shapeP.clear()
    render(0)
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
