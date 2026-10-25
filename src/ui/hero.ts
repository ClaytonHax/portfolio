import { gsap, scrollTo, reducedMotion } from '../core/motion'
import { on, emit } from '../core/bus'
import { profile } from '../data/profile'
import { icons } from './icons'
import { split } from './fx/split'
import { scramble } from './fx/scramble'
import { typeInto } from './fx/typewriter'
import { magnetic } from './fx/magnetic'

export function initHero(): void {
  const hero = document.getElementById('hero')!
  hero.innerHTML = `
    <div class="hero__inner">
      <div class="hero__copy">
        <p class="hero__prompt mono"><span class="spin-red" aria-hidden="true">✻</span> <span class="dim">clayton@harare</span> <span class="red">~</span> <span class="dim">$</span> ./intro --live</p>
        <h1 class="hero__title" aria-label="${profile.name}">
          <span class="hero__line" aria-hidden="true">CLAYTON</span>
          <span class="hero__line" aria-hidden="true">BANKS<span class="hero__dot">.</span></span>
        </h1>
        <p class="hero__role mono"><span class="red">&gt;</span> <span class="hero__role-t"></span></p>
        <p class="hero__tag">${profile.tagline}</p>
        <div class="hero__cta">
          <a class="btn btn--primary" href="#work" data-go="work">View work ${icons.arrow}</a>
          <a class="btn" href="#contact" data-go="contact">Get in touch</a>
        </div>
        <div class="term hero__term" aria-label="Terminal: whoami">
          <div class="term__bar"><span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span><span>zsh — whoami</span></div>
          <div class="term__body hero__term-body" aria-hidden="true">
            <div class="l1"><span class="red">$</span> whoami</div>
            <div class="l2 dim">${profile.handle} · ${profile.role}</div>
            <div class="l3"><span class="red">$</span> status</div>
            <div class="l4"><i class="pulse-dot"></i> online · shipping · ${profile.location}</div>
          </div>
        </div>
      </div>
    </div>
    <a class="hero__scroll mono" href="#about" data-go="about" aria-label="Scroll to about"><span>scroll</span><i></i></a>`

  hero.querySelectorAll<HTMLAnchorElement>('[data-go]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      scrollTo(document.getElementById(a.dataset.go!)!)
    })
    if (a.classList.contains('btn')) magnetic(a, 0.3)
  })

  const lines = hero.querySelectorAll<HTMLElement>('.hero__line')
  const roleT = hero.querySelector<HTMLElement>('.hero__role-t')!
  const roleText = profile.role
  const rest = hero.querySelectorAll<HTMLElement>('.hero__prompt, .hero__tag, .hero__cta, .hero__term, .hero__scroll')
  const termLines = hero.querySelectorAll<HTMLElement>('.hero__term-body > div')

  if (reducedMotion) {
    roleT.textContent = roleText
    return
  }

  // chars: split each line, hide everything until boot:done
  const chars = [...lines].flatMap((l) => {
    const t = (l.textContent ?? '').replace(/\.$/, '')
    const dot = l.querySelector('.hero__dot')
    const r = split(l, t)
    if (dot) l.appendChild(dot)
    return r.chars
  })
  gsap.set(chars, { yPercent: 110, opacity: 0 })
  gsap.set(hero.querySelector('.hero__dot'), { opacity: 0 })
  gsap.set(termLines, { opacity: 0 })
  gsap.set(rest, { autoAlpha: 0, y: 24 })
  roleT.textContent = ''

  on('boot:done', async () => {
    const orig = chars.map((c) => c.textContent!)
    const tl = gsap.timeline()
    tl.to(hero.querySelector('.hero__prompt'), { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' })
    tl.to(chars, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.045 }, 0.05)
    tl.to(hero.querySelector('.hero__dot'), { opacity: 1, duration: 0.2 }, '>-0.3')
    tl.to(hero.querySelectorAll('.hero__tag, .hero__cta'), { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.12 }, 0.6)
    tl.to(hero.querySelectorAll('.hero__term, .hero__scroll'), { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.15 }, 1.0)
    // scramble each char as it lands
    chars.forEach((c, i) => {
      const ch = orig[i]
      tl.call(() => void scramble(c, ch, { duration: 520 }), undefined, 0.05 + i * 0.045)
    })
    emit('glitch', { strength: 0.35 })
    void typeInto(roleT, roleText, { speed: 28 })
    // whoami terminal typing
    gsap.to(termLines, { opacity: 1, duration: 0.35, stagger: 0.45, delay: 1.3 })
  })
}
