import { projects } from '../data/projects'
import { emit, on } from '../core/bus'
import { gsap, ScrollTrigger, reducedMotion } from '../core/motion'
import { reveal } from './reveal'
import { sectionHead } from './ui'

/** Phone-first apps, in display order (the middle one is the hero). */
const APPS: { id: string; note: string; feats: string[] }[] = [
  { id: 'gym', note: 'Log the set, keep the streak.', feats: ['Home-screen install', 'Streaks & heatmap'] },
  { id: 'lapel', note: 'Ask what to wear. It dresses you from your own wardrobe.', feats: ['Installable PWA', 'Offline page', 'Weather-aware'] },
  { id: 'pathway', note: 'Won first prize at the Arundel hackathon. Jobs and learnerships, one thumb at a time.', feats: ['1st prize', 'Thumb-first cards', 'Match scoring'] },
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
        <div class="mob__veil" aria-hidden="true"></div>
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
        <div class="mob__focus" aria-hidden="true">
          ${apps
            .map(
              (a) => `
          <div class="mob__fx" data-id="${a.id}">
            <p class="eyebrow">${a.p.category} <span aria-hidden="true">&middot;</span> ${a.p.year}</p>
            <h3 class="mob__fx-name">${a.p.title}</h3>
            <p class="mob__fx-note">${a.note}</p>
            <ul class="chips">${a.feats.map((f) => `<li class="chip">${f}</li>`).join('')}</ul>
          </div>`,
            )
            .join('')}
        </div>
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

  // ── desktop: size the row to the viewport and pin it while the line traces the phones, then zoom in on each one ──
  if (!reducedMotion) {
    const focus = [...stage.querySelectorAll<HTMLElement>('.mob__fx')]
    gsap.matchMedia().add('(min-width: 769px)', () => {
      let T = 0
      let D = 0
      let Z = 0
      let dirty = false
      /** camera targets per phone: where its centre sits in the stage, and the scale that fills the viewport height */
      let cam: { x: number; y: number; s: number }[] = []
      let home = { x: 0, y: 0 }
      let dimmed = false
      const compute = () => {
        const vh = window.innerHeight
        const vw = window.innerWidth
        D = Math.round(vh * 2.4)
        Z = Math.round(vh * 3.2)
        T = Math.max(96, Math.round((vh - stage.offsetHeight) / 2))
        const changed = stage.dataset.penPin !== String(D) || stage.dataset.penPinTop !== String(T) || stage.dataset.penHold !== String(Z)
        stage.dataset.penPin = String(D)
        stage.dataset.penPinTop = String(T)
        stage.dataset.penHold = String(Z)
        if (changed) dirty = true
        // layout offsets ignore transforms, so these stay valid mid-zoom
        const at = (el: HTMLElement) => {
          let x = 0
          let y = 0
          for (let n: HTMLElement | null = el; n && n !== stage; n = n.offsetParent as HTMLElement | null) {
            x += n.offsetLeft
            y += n.offsetTop
          }
          return { x, y }
        }
        const sl = stage.getBoundingClientRect().left
        const to = at(track)
        home = { x: to.x, y: to.y }
        cam = phones.map((ph) => {
          const o = at(ph)
          return { x: o.x + ph.offsetWidth / 2, y: o.y + ph.offsetHeight / 2, s: (vh * 0.8) / Math.max(1, ph.offsetHeight) }
        })
        stage.style.setProperty('--sl', sl + 'px')
        stage.style.setProperty('--st', T + 'px')
        stage.style.setProperty('--vw', vw + 'px')
        stage.style.setProperty('--vh', vh + 'px')
        // the phone being studied sits right of centre, its caption on the left
        stage.style.setProperty('--gx', vw * 0.66 - sl + 'px')
        stage.style.setProperty('--gy', vh / 2 + 36 - T + 'px')
        stage.style.setProperty('--fl', vw * 0.07 - sl + 'px')
        stage.style.setProperty('--fw', Math.min(vw * 0.34, 440) + 'px')
      }

      // keyframes over the zoom range: -1 = the resting trio, 0..2 = that phone filling the frame
      const KEYS: [number, number][] = [
        [0, -1],
        [0.15, 0],
        [0.33, 0],
        [0.45, 1],
        [0.63, 1],
        [0.75, 2],
        [0.87, 2],
        [1, -1],
      ]
      const ease = (x: number) => {
        const t = Math.min(1, Math.max(0, x))
        return t * t * t * (t * (t * 6 - 15) + 10)
      }
      const weights = (z: number): number[] => {
        let i = 1
        while (i < KEYS.length - 1 && z > KEYS[i][0]) i++
        const [a, ka] = KEYS[i - 1]
        const [b, kb] = KEYS[i]
        const e = ka === kb ? 0 : ease((z - a) / (b - a))
        return phones.map((_, k) => (ka === k ? 1 - e : 0) + (kb === k ? e : 0))
      }

      /** z 0..1 through the zoom: push the row so the weighted phone lands on the focus point */
      const frame = (z: number) => {
        const w = weights(z)
        const zm = w.reduce((a, b) => a + b, 0)
        const gX = parseFloat(stage.style.getPropertyValue('--gx')) || 0
        const gY = parseFloat(stage.style.getPropertyValue('--gy')) || 0
        // rest: identity about the row's own origin
        const r = 1 - zm
        let s = r
        let fx = r * home.x
        let fy = r * home.y
        let gx = r * home.x
        let gy = r * home.y
        let idx = 0
        w.forEach((q, k) => {
          s += q * cam[k].s
          fx += q * cam[k].x
          fy += q * cam[k].y
          gx += q * gX
          gy += q * gY
          idx += q * k
        })
        const focal = zm > 0.0001 ? idx / zm : 0
        track.style.transform = zm > 0.0001 ? `translate(${(gx - home.x - s * (fx - home.x)).toFixed(2)}px, ${(gy - home.y - s * (fy - home.y)).toFixed(2)}px) scale(${s.toFixed(4)})` : ''
        stage.style.setProperty('--zm', zm.toFixed(3))
        items.forEach((it, k) => {
          it.style.setProperty('--f', w[k].toFixed(3))
          focus[k]?.style.setProperty('--f', w[k].toFixed(3))
          // the 3D tilt only exists while a phone is travelling: a flat phone keeps a crisp, re-rasterised screen
          const ry = Math.max(-1, Math.min(1, k - focal)) * -20 * zm
          if (Math.abs(ry) > 0.4) it.style.setProperty('--tf', `perspective(1400px) rotateY(${ry.toFixed(2)}deg)`)
          else it.style.removeProperty('--tf')
        })
        const dim = zm > 0.001
        if (dim !== dimmed) {
          dimmed = dim
          emit('pen:dim', { id: 'mobile', on: dim })
        }
      }

      compute()
      const zoomAt = () => D * 0.9
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
        end: () => '+=' + (D + Z),
        onRefresh: (self) => {
          frame(Math.min(1, Math.max(0, (self.scroll() - self.start - zoomAt()) / (D + Z - zoomAt()))))
          if (dirty) {
            dirty = false
            queueMicrotask(() => emit('layout:change'))
          }
        },
        onUpdate: (self) => frame(Math.min(1, Math.max(0, (self.scroll() - self.start - zoomAt()) / (D + Z - zoomAt())))),
      })
      stage.classList.add('is-zoom')
      queueMicrotask(() => emit('layout:change'))
      return () => {
        st.kill()
        stage.classList.remove('is-zoom')
        track.style.transform = ''
        stage.style.removeProperty('--zm')
        items.forEach((it) => {
          it.style.removeProperty('--f')
          it.style.removeProperty('--tf')
        })
        focus.forEach((fx) => fx.style.removeProperty('--f'))
        if (dimmed) emit('pen:dim', { id: 'mobile', on: false })
        delete stage.dataset.penPin
        delete stage.dataset.penPinTop
        delete stage.dataset.penHold
        emit('layout:change')
      }
    })
  }
}
