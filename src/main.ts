import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
import './styles/tokens.css'
import './styles/base.css'
import { initTheme } from './core/theme'
import { initMotion, ScrollTrigger } from './core/motion'
import { emit, on } from './core/bus'
import { initSections } from './sections'
import { initPen } from './pen'

async function start() {
  initTheme()
  // DOM first, so the pen can measure real anchors.
  initSections()
  initMotion()
  lazyCase()

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

/** The case-study dialog (and its copy) loads on first use, or early for #case-* deep links. */
function lazyCase() {
  let ready: Promise<void> | null = null
  const load = () => (ready ??= import('./case').then((m) => m.initCase()))
  const off = on('case:open', (payload) => {
    off()
    load().then(() => emit('case:open', payload))
  })
  if (location.hash.startsWith('#case-')) load()
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#case-')) load()
  })
  // Warm it up once the intro is out of the way, so the first open is instant.
  on('intro:done', () => window.setTimeout(load, 1200))
}

start()
