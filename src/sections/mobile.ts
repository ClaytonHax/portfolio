import { projects } from '../data/projects'
import { emit } from '../core/bus'
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
      <div class="mob" data-pen-stop="mobile" data-pen-side="right" data-pen-side-mobile="through" data-pen-gap="28">
        <div class="mob__glow" aria-hidden="true"></div>
        <ul class="mob__track" role="list" aria-label="Phone app screens">
          ${apps
            .map(
              (a, i) => `
          <li class="mob__item rvc${a.id === 'lapel' ? ' mob__item--hero' : ''}" style="--i:${i}" data-id="${a.id}">
            <button type="button" class="phone" data-open="${a.id}" aria-label="${a.p.title}, open case study">
              <span class="phone__screen">
                <img src="/shots/phone/${a.id}.webp" srcset="/shots/phone/${a.id}-sm.webp 390w, /shots/phone/${a.id}.webp 780w" sizes="(min-width: 769px) 26vw, 72vw" width="780" height="1688" alt="${a.p.title} on a phone" loading="lazy" decoding="async">
              </span>
              <span class="phone__shine" aria-hidden="true"></span>
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

  items.forEach((it) =>
    it.querySelector<HTMLButtonElement>('[data-open]')!.addEventListener('click', (e) =>
      emit('case:open', { id: it.dataset.id!, from: e.currentTarget as HTMLElement }),
    ),
  )

  // each device is sketched in as the row scrolls in: a quick pen stroke round the bezel, then it fades back
  if (!reducedMotion) {
    const NS = 'http://www.w3.org/2000/svg'
    const PAD = 7
    items.forEach((it, i) => {
      const phone = it.querySelector<HTMLElement>('.phone')!
      const svg = document.createElementNS(NS, 'svg')
      svg.setAttribute('class', 'phone__draw')
      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('focusable', 'false')
      const rect = document.createElementNS(NS, 'rect')
      rect.setAttribute('pathLength', '1')
      svg.append(rect)
      phone.append(svg)
      gsap.set(rect, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 1 })
      ScrollTrigger.create({
        trigger: it,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          const w = phone.offsetWidth
          const h = phone.offsetHeight
          svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`)
          rect.setAttribute('width', String(w))
          rect.setAttribute('height', String(h))
          rect.setAttribute('rx', String(w * 0.17))
          gsap
            .timeline({ delay: i * 0.12, onComplete: () => svg.remove() })
            .to(rect, { strokeDashoffset: 0, duration: 0.85, ease: 'power2.inOut' })
            .to(rect, { opacity: 0, duration: 0.5, ease: 'power1.out' }, '-=0.1')
        },
      })
    })
  }

  const mq = window.matchMedia('(max-width: 768px)')

  // phone: swipeable snap carousel; the centred device grows, the others recede
  let raf = 0
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
  }
  requestAnimationFrame(start)
  mq.addEventListener('change', start)

  // desktop: the side phones drift against the scroll so the row feels layered
  if (!reducedMotion) {
    gsap.matchMedia().add('(min-width: 769px)', () => {
      items.forEach((it, i) => {
        const dir = i === 1 ? 0 : i === 0 ? 1 : -1
        const amp = i === 1 ? 0 : 56
        gsap.fromTo(
          it.querySelector('.phone'),
          { '--py': `${-amp * dir}px` },
          { '--py': `${amp * dir}px`, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true } },
        )
      })
    })
  }
}
