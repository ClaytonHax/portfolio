import './styles/base.css'
import { initMotion, ScrollTrigger } from './core/motion'
import { emit } from './core/bus'
import { initWebGL } from './webgl'
import { initProjects } from './projects'
import { initUI, runBoot } from './ui'

async function start() {
  document.body.classList.add('is-booting')

  // Render all DOM first so ScrollTrigger measures real layout.
  initUI()
  initProjects()
  initMotion()

  const canvas = document.getElementById('webgl') as HTMLCanvasElement
  try {
    await initWebGL(canvas)
  } catch (err) {
    // No WebGL: the site still works, it just loses the 3D layer.
    console.warn('[webgl] disabled:', err)
    canvas.remove()
  }

  await runBoot()
  document.body.classList.remove('is-booting')
  ScrollTrigger.refresh()
  emit('boot:done')
}

start()
