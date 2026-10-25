import { reducedMotion } from '../core/motion'
import { animate } from 'animejs'
import { profile } from '../data/profile'
import { reveal, onEnterOnce } from './fx/reveal'
import { typeInto, sleep } from './fx/typewriter'

export function initAbout(): void {
  const el = document.getElementById('about')!
  el.innerHTML = `
    <div class="container sect">
      <header class="section-head">
        <p class="prompt"><span class="path">~/about</span> $ cat README.md</p>
        <h2 id="about-title">Builder, <span class="accent">end to end.</span></h2>
      </header>
      <div class="about__grid">
        <div class="term about__term">
          <div class="term__bar"><span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span><span>README.md</span></div>
          <div class="term__body">
            <p class="about__cmd"><span class="red">$</span> cat README.md</p>
            ${profile.about.map(() => '<p class="about__p"></p>').join('')}
            <p class="about__cmd about__cmd--end" aria-hidden="true"><span class="red">$</span> <span class="caret">▍</span></p>
          </div>
        </div>
        <div class="about__side">
          <ul class="stats" aria-label="Stats">
            ${profile.stats
              .map((s) => `<li class="stat"><span class="stat__v" data-to="${s.value}" data-suffix="${s.suffix}">${s.value}${s.suffix}</span><span class="stat__l">${s.label}</span></li>`)
              .join('')}
          </ul>
          <p class="about__loc mono"><span class="chip"><span class="red">◉</span> ${profile.location}</span> <span class="chip"><i class="pulse-dot"></i> open to work</span></p>
        </div>
      </div>
    </div>`

  const paras = [...el.querySelectorAll<HTMLElement>('.about__p')]
  paras.forEach((p, i) => {
    if (reducedMotion) {
      p.textContent = profile.about[i]
    } else {
      // Reserve space; text is typed when the terminal scrolls into view.
      p.setAttribute('aria-label', profile.about[i])
      p.innerHTML = `<span class="tw-ghost" aria-hidden="true">${profile.about[i]}</span><span class="tw-live" aria-hidden="true"></span>`
    }
  })

  const term = el.querySelector<HTMLElement>('.about__term')!
  const stats = [...el.querySelectorAll<HTMLElement>('.stat__v')]
  if (!reducedMotion) {
    stats.forEach((s) => (s.textContent = '0' + s.dataset.suffix))
    onEnterOnce(term, async () => {
      for (let i = 0; i < paras.length; i++) {
        await typeInto(paras[i], profile.about[i], { speed: 9 })
        await sleep(120)
      }
    })
    const side = el.querySelector('.stats')!
    onEnterOnce(side, () => {
      stats.forEach((s, i) => {
        const o = { v: 0 }
        animate(o, {
          v: Number(s.dataset.to),
          duration: 1800,
          delay: i * 140,
          ease: 'outExpo',
          onUpdate: () => (s.textContent = Math.round(o.v) + (s.dataset.suffix ?? '')),
        })
      })
    }, 'top 85%')
    reveal(term, { start: 'top 88%' })
    reveal(el.querySelectorAll('.stat'), { start: 'top 88%', trigger: side, stagger: 0.1 })
    reveal(el.querySelector('.about__loc'), { start: 'top 95%' })
  }
}
