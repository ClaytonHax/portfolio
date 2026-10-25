import { profile } from '../data/profile'
import { gsap, reducedMotion } from '../core/motion'
import { reveal } from './reveal'
import { sectionHead, shine } from './ui'
import { icons } from './icons'

export function initAbout(): void {
  const sec = document.getElementById('about')
  if (!sec) return
  sec.innerHTML = `
    <div class="container sec-in">
      ${sectionHead('01', 'About', 'Built end to end.', 'about-title')}
      <div class="about glass rv" data-pen-stop="about" data-pen-side="through">
        <div class="about__text">
          ${profile.about.map((t, i) => `<p class="${i === 0 ? 'about__lead' : ''}">${t}</p>`).join('')}
          <p class="about__loc"><span class="chip">${icons.pin}${profile.location}</span></p>
        </div>
        <dl class="stats">
          ${profile.stats
            .map(
              (s) => `<div class="stat"><dt>${s.label}</dt><dd><span class="stat__n" data-to="${s.value}" data-suffix="${s.suffix}">${s.value}${s.suffix}</span></dd></div>`,
            )
            .join('')}
        </dl>
      </div>
    </div>`

  const panel = sec.querySelector<HTMLElement>('.about')!
  shine(panel)

  const nums = [...sec.querySelectorAll<HTMLElement>('.stat__n')]
  if (!reducedMotion) nums.forEach((n) => (n.textContent = '0'))
  const count = () => {
    if (reducedMotion) return
    nums.forEach((n, i) => {
      const to = Number(n.dataset.to)
      const suffix = n.dataset.suffix ?? ''
      const o = { v: 0 }
      gsap.to(o, {
        v: to,
        duration: 1.6,
        delay: 0.15 + i * 0.12,
        ease: 'power3.out',
        onUpdate: () => (n.textContent = String(Math.round(o.v))),
        onComplete: () => (n.textContent = `${to}${suffix}`),
      })
    })
  }
  reveal(panel, { stop: 'about', onIn: count })
  reveal(sec.querySelector<HTMLElement>('.sec-head')!)
}
