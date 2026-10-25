import './styles/tokens.css'
import './styles/base.css'
import { initTheme } from './core/theme'
import { initMotion, ScrollTrigger } from './core/motion'
import { emit } from './core/bus'
import { initSections } from './sections'
import { initCase } from './case'
import { initPen } from './pen'

async function start() {
  initTheme()
  // DOM first, so the pen can measure real anchors.
  initSections()
  initCase()
  initMotion()

  // Anchors move when fonts arrive; wait for them before laying out the line.
  await document.fonts.ready
  ScrollTrigger.refresh()

  try {
    await initPen()
  } catch (err) {
    // The line is decoration. Without it, everything still reads and works.
    console.warn('[pen] disabled:', err)
    document.documentElement.classList.add('no-pen')
    emit('intro:done', { skipped: true })
  }

  // Late image loads can shift anchors.
  window.addEventListener('load', () => emit('layout:change'))
}

start()
