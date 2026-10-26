/** Owner: sections agent. Renders #bg, #nav, #intro-meta, #about, #work, #more, #stack, #contact, #footer. Synchronous. */
import './sections.css'
import './story.css'
import './mobile.css'
import { initReveal } from './reveal'
import { initBackground } from './background'
import { initNav } from './nav'
import { initIntroMeta } from './intro-meta'
import { initAbout } from './about'
import { initWork } from './work'
import { initMore } from './more'
import { initMobile } from './mobile'
import { initStack } from './stack'
import { initContact } from './contact'
import { initFooter } from './footer'
import { magnetic } from './ui'
import { initProcess } from './process'
import { initChapters } from './chapters'

export function initSections(): void {
  initReveal()
  initBackground()
  initNav()
  initIntroMeta()
  initAbout()
  initWork()
  initMore()
  initMobile()
  initStack()
  initContact()
  initFooter()
  magnetic()
  initProcess()
  initChapters()
}
