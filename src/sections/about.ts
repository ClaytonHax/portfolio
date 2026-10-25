import { profile } from '../data/profile'
import { on } from '../core/bus'
import { gsap, reducedMotion } from '../core/motion'
import { reveal } from './reveal'
import { shine } from './ui'
import { icons } from './icons'

export function initAbout(): void {
  const sec = document.getElementById('about')
  if (!sec) return
  sec.innerHTML = `
    <div class="container sec-in">
      <div class="about">
        <div class="about__text">
          <header class="sec-head rv">
            <h2 id="about-title" class="sec-title">${profile.aboutHeading}</h2>
          </header>
          <div class="about__copy rv">
            ${profile.about.map((t, i) => `<p class="${i === 0 ? 'about__lead' : ''}">${t}</p>`).join('')}
            <p class="about__loc"><span class="chip">${icons.pin}${profile.location}</span></p>
          </div>
        </div>
        <dl class="stats glass rv" data-pen-stop="about" data-pen-side="left" data-pen-side-mobile="left" data-pen-gap="26">
          ${profile.stats
            .map(
              (s) => `<div class="stat"><dd><span class="stat__n" data-to="${s.value}" data-suffix="${s.suffix}">${s.value}${s.suffix}</span></dd><dt>${s.label}</dt></div>`,
            )
            .join('')}
        </dl>
      </div>
    </div>`

  const panel = sec.querySelector<HTMLElement>('.stats')!
  shine(panel)

  const nums = [...sec.querySelectorAll<HTMLElement>('.stat__n')]
  const live = !reducedMotion && !document.documentElement.classList.contains('no-pen')
  if (live) nums.forEach((n) => (n.textContent = '0'))
  let counted = false
  const count = () => {
    if (counted) return
    counted = true
    nums.forEach((n, i) => {
      const to = Number(n.dataset.to)
      const suffix = n.dataset.suffix ?? ''
      if (!live) {
        n.textContent = `${to}${suffix}`
        return
      }
      const o = { v: 0 }
      gsap.to(o, {
        v: to,
        duration: 1.8,
        delay: 0.1 + i * 0.12,
        ease: 'power3.out',
        onUpdate: () => (n.textContent = `${Math.round(o.v)}${suffix}`),
        onComplete: () => (n.textContent = `${to}${suffix}`),
      })
    })
  }
  // Count when the pen reaches the stop; if the pen never does (no-pen, slow), fall back a couple of seconds after it scrolls in.
  on('pen:reach', ({ id }) => id === 'about' && count())
  let fallback = 0
  reveal(panel, { stop: 'about', onIn: () => (fallback = window.setTimeout(count, live ? 2600 : 0)) })
  window.addEventListener('pagehide', () => window.clearTimeout(fallback))
  reveal(sec.querySelector<HTMLElement>('.sec-head')!)
  reveal(sec.querySelector<HTMLElement>('.about__copy')!)
}
