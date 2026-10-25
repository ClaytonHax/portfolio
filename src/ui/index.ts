import './ui.css'
import { on } from '../core/bus'
import { reducedMotion } from '../core/motion'
import { initFxOverlay } from './fx-overlay'
import { initCursor } from './cursor'
import { initNav } from './nav'
import { initHero } from './hero'
import { initAbout } from './about'
import { initStack } from './stack'
import { initContact } from './contact'
import { initFooter } from './footer'

import { prepareBoot } from './boot'

export { runBoot } from './boot'

/** Renders #nav, #hero, #about, #stack, #contact, #footer, #cursor, .fx-overlay. */
export function initUI(): void {
  prepareBoot()
  initFxOverlay()
  initCursor()
  initNav()
  initHero()
  initAbout()
  initStack()
  initContact()
  initFooter()

  if (!reducedMotion) {
    on('glitch', ({ strength }) => {
      const b = document.body
      b.classList.add('is-glitch')
      setTimeout(() => b.classList.remove('is-glitch'), 120 + strength * 160)
    })
  }
}
