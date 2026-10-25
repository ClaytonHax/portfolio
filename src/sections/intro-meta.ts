import { profile } from '../data/profile'
import { revealAfterIntro } from './reveal'
import { scrollTo } from '../core/motion'

export function initIntroMeta(): void {
  const el = document.getElementById('intro-meta')
  if (!el) return
  el.classList.add('intro-meta')
  el.innerHTML = `
    <p class="intro-meta__role rvc" style="--i:0">${profile.role.split(' & ')[0]} <span aria-hidden="true">&middot;</span> ${profile.location}</p>
    <p class="intro-meta__open glass rvc" style="--i:1"><span class="pulse" aria-hidden="true"></span>Open to work</p>
    <a class="intro-meta__cue rvc" style="--i:2" href="#about" aria-label="Scroll to About">
      <span>Scroll</span><i aria-hidden="true"></i>
    </a>`
  revealAfterIntro(el)
  el.querySelector('.intro-meta__cue')!.addEventListener('click', (e) => {
    e.preventDefault()
    scrollTo('#about')
  })
}
