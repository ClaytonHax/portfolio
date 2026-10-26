import { projects } from '../data/projects'
import { emit, on } from '../core/bus'
import { gsap, ScrollTrigger, reducedMotion } from '../core/motion'
import { reveal } from './reveal'
import { sectionHead } from './ui'

/** Phone-first apps, in display order (the middle one is the hero). */
const APPS: { id: string; note: string; feats: string[] }[] = [
  { id: 'gym', note: 'Log the set, keep the streak.', feats: ['Home-screen install', 'Streaks & heatmap'] },
  { id: 'lapel', note: 'Ask what to wear. It dresses you from your own wardrobe.', feats: ['Installable PWA', 'Offline page', 'Weather-aware'] },
  { id: 'pathway', note: 'Jobs and learnerships, one thumb at a time.', feats: ['Thumb-first cards', 'Match scoring'] },
]

export function initMobile(): void {
  const sec = document.getElementById('mobile')
  if (!sec) return
  const apps = APPS.map((a) => ({ ...a, p: projects.find((p) => p.id === a.id)! })).filter((a) => a.p)

  sec.innerHTML = `
    <div class="container sec-in">
      ${sectionHead('04', 'Also shipped', 'Also shipped.', 'mobile-title', 'Most of what I build gets opened on a phone first, so these are laid out for one hand, installable to the home screen, and fast on a patchy connection. Then they scale up to desktop.')}
      <div class="mob" data-pen-stop="mobile" data-pen-side="trace">
        <div class="mob__glow" aria-hidden="true"></div>
        <ul class="mob__track" role="list" aria-label="Phone app screens">
          ${apps
            .map(
              (a, i) => `
          <li class="mob__item rvc${a.id === 'lapel' ? ' mob__item--hero' : ''}" style="--i:${i}" data-id="${a.id}">
            <button type="button" class="phone" data-open="${a.id}" data-pen-shape="mobile:${a.id}"${a.id === 'lapel' ? ' data-pen-shape-mobile' : ''} data-pen-r="48" aria-label="${a.p.title}, open case study">
              <span class="phone__halo" aria-hidden="true"></span>
              <span class="phone__shadow" aria-hidden="true"></span>
              <span class="phone__ghost" aria-hidden="true"></span>
              <span class="phone__dev" aria-hidden="true"><span class="phone__bezel"></span></span>
              <span class="phone__screen">
                <img src="/shots/phone/${a.id}.webp" srcset="/shots/phone/${a.id}-sm.webp 390w, /shots/phone/${a.id}.webp 780w" sizes="(min-width: 769px) 26vw, 72vw" width="780" height="1688" alt="${a.p.title} on a phone" loading="lazy" decoding="async">
              </span>
              <span class="phone__shine" aria-hidden="true"><i></i></span>
            </button>
            <div class="mob__cap">
              <p class="eyebrow">${a.p.category} <span aria-hidden="true">&middot;</span> ${a.p.year}</p>
              <h3 class="mob__name">${a.p.title}</h3>
              <p class="mob__note">${a.note}</p>
              <ul class="chips" aria-label="Mobile features">${a.feats.map((f) => `<li class="chip">${f}</li>`).join('')}</ul>
            </div>
          </li>`,
            )
            .join('')}
        </ul>
        <div class="mob__dots" aria-hidden="true">${apps.map(() => '<i></i>').join('')}</div>
      </div>
    </div>`

  reveal(sec.querySelector<HTMLElement>('.sec-head')!)
  const stage = sec.querySelector<HTMLElement>('.mob')!
  reveal(stage, { stop: 'mobile' })

  const track = stage.querySelector<HTMLElement>('.mob__track')!
  const items = [...track.querySelectorAll<HTMLElement>('.mob__item')]
  const dots = [...stage.querySelectorAll<HTMLElement>('.mob__dots i')]
  const heroIdx = Math.max(0, items.findIndex((it) => it.classList.contains('mob__item--hero')))
  const phones = items.map((it) => it.querySelector<HTMLElement>('.phone')!)
  const mq = window.matchMedia('(max-width: 768px)')
  const root = document.documentElement

  items.forEach((it) =>
    it.querySelector<HTMLButtonElement>('[data-open]')!.addEventListener('click', (e) =>
      emit('case:open', { id: it.dataset.id!, from: e.currentTarget as HTMLElement }),
    ),
  )

  // ── fill choreography ─────────────────────────────────────────────────
  // The journey line traces each phone (pen:shape p 0..1). We turn p into CSS vars and CSS does the rest:
  // body mask follows the pen tip's angle, screenshot wipes in top-down, then shine / caption / glow on close.
  const armed = !reducedMotion && root.classList.contains('js') && !root.classList.contains('no-pen')
  const tables: Float32Array[] = []
  const N = 256

  /** Angle (deg swept clockwise from the left-middle, 0..360, around the centre) of the point at perimeter fraction i/N of a rounded rect. */
  function buildTable(w: number, h: number, r: number): Float32Array {
    r = Math.max(0, Math.min(r, w / 2, h / 2))
    const hw = w / 2
    const hh = h / 2
    type Seg = { len: number; at: (t: number) => [number, number] }
    const line = (x0: number, y0: number, x1: number, y1: number): Seg => ({
      len: Math.hypot(x1 - x0, y1 - y0),
      at: (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t],
    })
    const arc = (cx: number, cy: number, a0: number): Seg => ({
      len: (Math.PI / 2) * r,
      at: (t) => {
        const a = ((a0 + 90 * t) * Math.PI) / 180
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
      },
    })
    const segs: Seg[] = [
      line(-hw, 0, -hw, -hh + r),
      arc(-hw + r, -hh + r, 180),
      line(-hw + r, -hh, hw - r, -hh),
      arc(hw - r, -hh + r, -90),
      line(hw, -hh + r, hw, hh - r),
      arc(hw - r, hh - r, 0),
      line(hw - r, hh, -hw + r, hh),
      arc(-hw + r, hh - r, 90),
      line(-hw, hh - r, -hw, 0),
    ]
    const total = segs.reduce((a, s) => a + s.len, 0)
    const out = new Float32Array(N + 1)
    let prev = 0
    for (let i = 0; i <= N; i++) {
      let d = (i / N) * total
      let x = -hw
      let y = 0
      for (const sg of segs) {
        if (d <= sg.len || sg === segs[segs.length - 1]) {
          ;[x, y] = sg.at(sg.len ? Math.min(1, d / sg.len) : 0)
          break
        }
        d -= sg.len
      }
      // degrees swept clockwise from the left-middle (0 .. 360), unwrapped
      let a = (Math.atan2(x, -y) * 180) / Math.PI - 270
      while (a < 0) a += 360
      if (i > 0) {
        while (a < prev - 180) a += 360
        if (a < prev) a = prev
      }
      out[i] = prev = a
    }
    out[0] = 0
    out[N] = 360
    return out
  }
  const angleOf = (idx: number, p: number): number => {
    const t = tables[idx]
    if (!t) return p * 360
    const f = Math.min(1, Math.max(0, p)) * N
    const i = Math.min(N - 1, Math.floor(f))
    return t[i] + (t[i + 1] - t[i]) * (f - i)
  }

  /** Layout-derived data for the pen, and the angle tables for the masks. */
  const measure = () => {
    phones.forEach((ph, i) => {
      const r = parseFloat(getComputedStyle(ph).borderTopLeftRadius) || ph.offsetWidth * 0.17
      ph.dataset.penR = String(Math.round(r * 10) / 10)
      tables[i] = buildTable(ph.offsetWidth + 8, ph.offsetHeight + 8, r + 4)
    })
  }

  const ss = (x: number) => {
    const t = Math.min(1, Math.max(0, x))
    return t * t * (3 - 2 * t)
  }
  const last: number[] = items.map(() => -1)
  const setPhone = (i: number, p: number) => {
    const ph = phones[i]
    const closed = p >= 0.999
    if (last[i] === (closed ? 1 : p)) return
    last[i] = closed ? 1 : p
    if (closed) {
      ph.style.setProperty('--a', '380deg')
      ph.style.setProperty('--sp', '1')
      ph.style.setProperty('--bp', '1')
    } else {
      const a = p <= 0 ? -16 : angleOf(i, p)
      ph.style.setProperty('--a', a + 'deg')
      ph.style.setProperty('--ra', Math.min(1, Math.max(0, a / 14)).toFixed(2))
      ph.style.setProperty('--sp', ss((p - 0.5) / 0.5).toFixed(3))
      ph.style.setProperty('--bp', ss(p * 1.6).toFixed(3))
    }
    items[i].classList.toggle('is-filled', closed)
    items[i].classList.toggle('is-drawing', !closed && p > 0)
  }
  const fillAll = () => items.forEach((_, i) => setPhone(i, 1))
  let seen = false
  let heroP = 0

  if (armed) {
    stage.classList.add('is-armed')
    items.forEach((_, i) => setPhone(i, 0))
    on('pen:shape', ({ id, p }) => {
      seen = true
      const i = items.findIndex((it) => 'mobile:' + it.dataset.id === id)
      if (i < 0) return
      if (mq.matches) {
        // phone: only the hero is traced; the others appear filled once it closes
        if (i !== heroIdx) return
        heroP = p
        items.forEach((_, j) => setPhone(j, j === heroIdx ? p : p >= 0.999 ? 1 : 0))
        return
      }
      setPhone(i, p)
    })
    // safety net: if the pen never reports (broken, rewound past, deep link), fill once the stage has been fully in view for a while
    let timer = 0
    const io = new IntersectionObserver(
      (es) => {
        window.clearTimeout(timer)
        if (es[0].isIntersecting && !seen) timer = window.setTimeout(() => !seen && fillAll(), 2500)
      },
      { threshold: mq.matches ? 0.9 : 0.8 },
    )
    io.observe(stage)
    // pen died after we armed
    new MutationObserver(() => {
      if (root.classList.contains('no-pen')) fillAll()
    }).observe(root, { attributes: true, attributeFilter: ['class'] })
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mobShape = (id: string, p: number) => emit('pen:shape', { id: 'mobile:' + id, p })
  }

  // ── phone: swipeable snap carousel; the centred device grows, the others recede ──
  let raf = 0
  let onHero = true
  const centre = () => {
    raf = 0
    const mid = track.scrollLeft + track.clientWidth / 2
    let best = 0
    let bestD = Infinity
    items.forEach((it, i) => {
      const d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - mid) / it.offsetWidth
      it.style.setProperty('--s', mq.matches ? String(Math.max(0.86, 1 - d * 0.14)) : '1')
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    dots.forEach((d, i) => d.classList.toggle('is-on', i === best))
    const nowHero = !mq.matches || best === heroIdx
    if (nowHero !== onHero) {
      onHero = nowHero
      emit('pen:dim', { id: 'mobile', on: !nowHero })
    }
  }
  const queue = () => {
    if (!raf) raf = requestAnimationFrame(centre)
  }
  track.addEventListener('scroll', queue, { passive: true })
  window.addEventListener('resize', queue)
  const start = () => {
    if (mq.matches) {
      const hero = track.querySelector<HTMLElement>('.mob__item--hero')
      if (hero) track.scrollLeft = hero.offsetLeft - (track.clientWidth - hero.offsetWidth) / 2
    }
    queue()
    if (armed) {
      // switching between phone and desktop layouts: re-derive the fills
      if (mq.matches) items.forEach((_, j) => setPhone(j, j === heroIdx ? heroP : heroP >= 0.999 ? 1 : 0))
    }
  }
  requestAnimationFrame(start)
  mq.addEventListener('change', start)

  // keep the pen's radius data and our angle tables in step with layout
  measure()
  ScrollTrigger.addEventListener('refreshInit', measure)
  window.addEventListener('resize', measure)
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(phones[heroIdx])

  // ── desktop: size the row to the viewport and pin it while the line traces the phones ──
  if (!reducedMotion) {
    gsap.matchMedia().add('(min-width: 769px)', () => {
      let T = 0
      let D = 0
      let dirty = false
      const compute = () => {
        const vh = window.innerHeight
        D = Math.round(vh * 2.4)
        T = Math.max(96, Math.round((vh - stage.offsetHeight) / 2))
        const changed = stage.dataset.penPin !== String(D) || stage.dataset.penPinTop !== String(T)
        stage.dataset.penPin = String(D)
        stage.dataset.penPinTop = String(T)
        if (changed) dirty = true
      }
      compute()
      const st = ScrollTrigger.create({
        trigger: stage,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        start: () => {
          measure()
          compute()
          return 'top top+=' + T
        },
        end: () => '+=' + D,
        onRefresh: () => {
          if (dirty) {
            dirty = false
            queueMicrotask(() => emit('layout:change'))
          }
        },
      })
      queueMicrotask(() => emit('layout:change'))
      return () => {
        st.kill()
        delete stage.dataset.penPin
        delete stage.dataset.penPinTop
        emit('layout:change')
      }
    })
  }
}
