import { projects } from '../data/projects'
import { reducedMotion, ScrollTrigger } from '../core/motion'
import { on } from '../core/bus'
import { mountShowcase, type ShowcaseCtl } from './showcase'
import { mountGrid } from './grid'
import { mountArchive } from './archive'
import { initModal } from './modal'
import { getShot } from './art'
import { pad2 } from './util'
import './projects.css'

/** Owned by the Projects agent. Renders #work, #archive and #project-modal. */
export function initProjects(): void {
  const work = document.getElementById('work')
  const archive = document.getElementById('archive')
  const modal = document.getElementById('project-modal')
  if (!work || !archive || !modal) return

  const flagship = projects.filter((p) => p.tier === 'flagship')
  const featured = projects.filter((p) => p.tier === 'featured')
  const more = projects.filter((p) => p.tier === 'more')

  projects.forEach(getShot) // start screenshot loads / art generation

  work.innerHTML = `
    <div class="container work__head">
      <div class="section-head">
        <p class="prompt"><span class="path">~/work</span> $ ls --featured</p>
        <h2 id="work-title">Selected <span class="accent">work</span></h2>
      </div>
      <p class="work__lede"><span class="ok">✻</span> ${pad2(flagship.length)} flagship builds, ${pad2(featured.length)} featured. Scroll to run the sequence, click anything to open the case file.</p>
    </div>
    <div class="showcase" aria-label="Flagship projects"></div>
    <div class="container work__grid"></div>`

  const showcaseHost = work.querySelector<HTMLElement>('.showcase')!
  mountGrid(work.querySelector<HTMLElement>('.work__grid')!, featured)
  mountArchive(archive, more)
  initModal(modal)

  // Pinned WebGL showcase on wide screens, simple stack otherwise / reduced motion.
  const mq = window.matchMedia('(min-width: 901px)')
  let ctl: ShowcaseCtl | null = null
  const build = () => {
    ctl?.destroy()
    ctl = mountShowcase(showcaseHost, flagship, !mq.matches || reducedMotion)
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }
  build()
  mq.addEventListener('change', build)
  document.fonts?.ready.then(() => ScrollTrigger.refresh())
  on('boot:done', () => ScrollTrigger.refresh())
}
