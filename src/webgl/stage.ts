import * as THREE from 'three'
import { on } from '../core/bus'
import { isMobile, reducedMotion } from '../core/motion'
import { createCore } from './core'
import { createShell, createRings, createPulse } from './shell'
import { createStars, createPackets } from './stars'
import { createGrid } from './grid'
import { createPost } from './post'

/** Per-section look. x/y are NDC-ish fractions of the half viewport at z=0. */
interface Look {
  x: number; y: number; scale: number; shape: number; opacity: number
  grid: number; intensity: number; tilt: number; packets: number; camY: number; lookY: number
}
const D: Look = { x: 0.5, y: 0.02, scale: 0.92, shape: 0, opacity: 1, grid: 0, intensity: 1, tilt: 0.15, packets: 0.35, camY: 0, lookY: 0 }
const LOOKS: Record<string, Partial<Look>> = {
  hero: {},
  about: { x: -0.55, scale: 0.95, shape: 1, opacity: 0.9, tilt: 0.3, packets: 0.4 },
  work: { x: 0.74, y: 0.5, scale: 0.3, shape: 0, opacity: 0.8, grid: 1, intensity: 1.1, packets: 1, camY: -0.1, lookY: -0.7, tilt: 0.1 },
  archive: { x: 0.52, y: 0, scale: 0.8, shape: 3, opacity: 0.5, tilt: 1.05, packets: 0.5 },
  stack: { x: 0.55, y: 0, scale: 0.85, shape: 2, opacity: 0.6, tilt: 0.0, packets: 0.4 },
  contact: { x: 0, y: 0.04, scale: 1.05, shape: 0, opacity: 0.7, intensity: 1.5, tilt: 0.2, packets: 0.9 },
}
const MOBILE_OPACITY = 0.45

function lookFor(id: string): Look {
  const l = { ...D, ...(LOOKS[id] ?? {}) }
  if (isMobile) {
    l.x = id === 'work' ? 0.6 : 0
    l.y = id === 'work' ? 0.62 : 0.2
    l.scale *= 0.62
    l.opacity *= MOBILE_OPACITY
  }
  return l
}

export async function createStage(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  const baseDpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75)
  let dpr = baseDpr
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(0x0a0a0b, 1)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1

  const scene = new THREE.Scene()
  const FOV = 45, CAM_Z = 9
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200)
  camera.position.set(0, 0, CAM_Z)

  const count = isMobile ? 20000 : 90000
  const core = await createCore(count)
  const shell = createShell()
  const rings = createRings(() => dpr)
  const pulse = createPulse()
  const stars = createStars(isMobile ? 1200 : 3200)
  const packets = createPackets(isMobile ? 8 : 16)
  const grid = createGrid()

  // anchor: position/scale/opacity from choreography; spin: rotation.
  const anchor = new THREE.Group()
  const spin = new THREE.Group()
  spin.add(core.points, rings.group)
  anchor.add(spin, shell.mesh, pulse.mesh)
  scene.add(stars.points, packets.points, grid.mesh, anchor)

  let w = innerWidth, h = innerHeight
  const post = createPost(renderer, scene, camera, w, h)
  const setPR = () => {
    for (const u of [core.uniforms, stars.uniforms, packets.uniforms]) u.uPR.value = dpr
    post.fx.uniforms.uRes.value.set(w * dpr, h * dpr)
  }
  const resize = () => {
    w = innerWidth; h = innerHeight
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    post.composer.setPixelRatio(dpr)
    post.composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    setPR()
  }
  resize()

  // ---------- state ----------
  let tgt = lookFor('hero')
  const cur: Look = { ...tgt }
  let section = 'hero'
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 }
  let sv = 0, svTarget = 0, progress = 0, glitch = 0, hoverT = 0, hover = 0, scrollOffset = 0
  let time = 0, lastPulse = 0, ptrSeen = false, ptrK = 0

  const setSection = (id: string) => {
    section = id
    tgt = lookFor(id)
    core.morphTo(tgt.shape, reducedMotion)
    if (id === 'contact' && !reducedMotion) pulse.fire(0.7)
    if (reducedMotion) { Object.assign(cur, tgt); renderFrame(0) }
  }
  on('section:change', ({ id }) => setSection(id))
  on('scroll', ({ progress: p, velocity }) => {
    progress = p
    svTarget = Math.min(Math.abs(velocity) / 28, 1)
  })
  on('pointer', ({ x, y }) => { ptr.tx = x; ptr.ty = y; ptrSeen = true })
  on('glitch', ({ strength }) => { glitch = Math.max(glitch, Math.min(strength, 1.2)) })
  on('boot:done', () => { if (!reducedMotion) pulse.fire(0.9) })
  on('project:hover', ({ id, accent }) => {
    hoverT = id ? 1 : 0
    if (id) {
      if (accent) try { core.uniforms.uAccent.value.set(accent) } catch { /* keep previous */ }
      if (!reducedMotion) pulse.fire(0.5)
    }
  })

  // ---------- adaptive quality ----------
  const fixedQuality = location.search.includes('fixedq')
  let level = 0, acc = 0, accN = 0, warm = 0
  const LEVELS = [{ dpr: 1, draw: 1 }, { dpr: 0.8, draw: 0.8 }, { dpr: 0.62, draw: 0.6 }, { dpr: 0.5, draw: 0.4 }]
  const adapt = (dt: number) => {
    if (fixedQuality || level >= LEVELS.length - 1) return
    if (++warm < 120) return
    acc += dt; accN++
    if (accN >= 60) {
      if (acc / accN > 0.024) { // averaging worse than ~42fps: step down (never back up, avoids flapping)
        level++
        dpr = Math.max(0.75, baseDpr * LEVELS[level].dpr)
        core.setDrawFraction(LEVELS[level].draw)
        resize()
      }
      acc = 0; accN = 0
    }
  }

  // ---------- frame ----------
  const halfH0 = Math.tan((FOV * Math.PI) / 360) * CAM_Z
  function renderFrame(dt: number) {
    const k = (r: number) => 1 - Math.exp(-dt * r)
    const aspect = w / h
    const halfW0 = halfH0 * aspect

    if (dt > 0) {
      for (const key of ['x', 'y', 'scale', 'opacity', 'grid', 'intensity', 'tilt', 'packets', 'camY', 'lookY'] as const) {
        cur[key] += (tgt[key] - cur[key]) * k(key === 'opacity' || key === 'grid' ? 2.2 : 2.6)
      }
      ptr.x += (ptr.tx - ptr.x) * k(4); ptr.y += (ptr.ty - ptr.y) * k(4)
      sv += (svTarget - sv) * k(svTarget > sv ? 14 : 3.2)
      svTarget *= Math.exp(-dt * 6) // velocity events stop when scrolling stops
      glitch *= Math.exp(-dt * 5)
      hover += (hoverT - hover) * k(6)
    }

    // camera: pointer parallax + section tilt
    camera.position.set(ptr.x * 0.4, ptr.y * 0.22 + cur.camY, CAM_Z)
    camera.lookAt(0, cur.lookY, 0)

    // core placement
    const fit = Math.min(1, Math.max(0.6, aspect / 1.5))
    const s = cur.scale * fit
    anchor.position.set(cur.x * halfW0, cur.y * halfH0, 0)
    anchor.scale.setScalar(s)
    spin.rotation.set(cur.tilt - ptr.y * 0.12, time * 0.1 + progress * Math.PI * 1.6 + ptr.x * 0.3, 0)
    shell.mesh.rotation.set(time * 0.05, -time * 0.07, 0)

    // pointer in world space (plane through the core)
    const dist = CAM_Z
    const pu = core.uniforms
    pu.uPointer.value.set(ptr.x * halfH0 * aspect * (dist / CAM_Z) + camera.position.x, ptr.y * halfH0 + camera.position.y, 0)
    pu.uPointerR.value = 1.5 * Math.max(0.55, Math.min(1, cur.scale + 0.2))
    ptrK += ((ptrSeen && !reducedMotion ? 1 : 0) - ptrK) * (dt > 0 ? k(3) : 1)
    pu.uPointerK.value = ptrK

    // uniforms
    pu.uTime.value = time; pu.uVel.value = sv; pu.uGlitch.value = glitch; pu.uHover.value = hover
    pu.uOpacity.value = Math.min(cur.opacity, 1); pu.uIntensity.value = cur.intensity
    const beat = section === 'contact' && !reducedMotion ? Math.pow(Math.max(0, Math.sin(time * 1.8)), 8) * 0.8 : 0
    pu.uPulse.value = beat
    shell.uniforms.uTime.value = time; shell.uniforms.uOpacity.value = cur.opacity * 0.85 * (1 + beat * 0.5); shell.uniforms.uHover.value = hover
    rings.update(time, cur.opacity)
    stars.uniforms.uTime.value = time
    stars.uniforms.uOpacity.value = 1 - cur.grid * 0.2
    stars.uniforms.uOff.value.set(-ptr.x * 1.2, -ptr.y * 0.7 + progress * 7, 0)
    packets.uniforms.uTime.value = time
    packets.uniforms.uAmount.value = cur.packets
    const g = grid.uniforms
    g.uTime.value = time; g.uOpacity.value = cur.grid * 0.9
    g.uScroll.value = -time * 1.4 - scrollOffset
    g.uPx.value = ptr.x
    grid.mesh.visible = cur.grid > 0.01

    // post
    post.bloom.strength = (isMobile ? 0.75 : 0.95) * (0.85 + 0.25 * cur.intensity) + sv * 0.25 + glitch * 0.4
    const f = post.fx.uniforms
    f.uTime.value = time
    f.uAberration.value = 0.0007 + sv * 0.011 + glitch * 0.02
    f.uGlitch.value = glitch

    post.composer.render()
  }

  // ---------- loop ----------
  let raf = 0, last = 0, running = false
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick)
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.12); last = now
    time += dt
    scrollOffset += sv * dt * 14
    if (section === 'contact' && time - lastPulse > 3.5) { lastPulse = time; pulse.fire(0.55) }
    renderFrame(dt)
    adapt(dt)
  }
  const start = () => { if (running || reducedMotion) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick) }
  const stop = () => { running = false; cancelAnimationFrame(raf) }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()))

  let rt = 0
  addEventListener('resize', () => {
    clearTimeout(rt)
    rt = window.setTimeout(() => {
      // mobile URL-bar show/hide changes only the height: ignore small height-only changes
      if (isMobile && innerWidth === w && Math.abs(innerHeight - h) < 160) return
      resize()
      if (reducedMotion) renderFrame(0)
    }, 120)
  })

  // first frame (also the still frame for reduced motion)
  time = reducedMotion ? 2.5 : 0
  Object.assign(cur, tgt)
  renderFrame(0)
  start()
}
