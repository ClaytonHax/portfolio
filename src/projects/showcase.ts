import * as THREE from 'three'
import { animate, stagger } from 'animejs'
import { gsap, ScrollTrigger, lenis, reducedMotion } from '../core/motion'
import { emit, on } from '../core/bus'
import type { Project } from '../data/projects'
import { getShot, makeThumb } from './art'
import { chipsHTML, esc, linksHTML, pad2, splitChars, typeInto } from './util'
import { openProject } from './modal'

const VERT = /* glsl */ `
varying vec2 vUv;
uniform float uTime, uVel, uTrans;
uniform vec2 uMouse;
uniform float uRipple;
void main(){
  vUv = uv;
  vec3 p = position;
  // scroll-velocity wave
  p.z += sin(uv.x*6.0 + uTime*2.0) * uVel * 0.06 + sin(uv.y*8.0 - uTime*1.5) * uVel * 0.04;
  // pointer bulge
  float d = distance(uv, uMouse);
  p.z += exp(-d*6.0) * uRipple * 0.08;
  // transition squeeze
  p.y *= 1.0 - sin(uTrans*3.14159) * 0.04;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`

// RGB shift + ripple + CRT row-wipe transition. Inspired by common Codrops image-distortion demos.
const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB;
uniform float uTime, uVel, uTrans, uRipple;
uniform vec2 uMouse;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
vec3 sampleMix(vec2 uv, float t){
  // rows below the wipe line show B, above show A
  float line = 1.0 - t;
  float m = step(uv.y, line);
  return mix(texture2D(uB, uv).rgb, texture2D(uA, uv).rgb, m);
}
void main(){
  vec2 uv = vUv;
  float v = clamp(uVel, -1.5, 1.5);
  // pointer ripple
  vec2 dir = uv - uMouse;
  float d = length(dir * vec2(1.6, 1.0));
  uv += normalize(dir + 1e-5) * sin(d*38.0 - uTime*7.0) * exp(-d*5.0) * uRipple * 0.012;
  // wave from velocity
  uv.x += sin(uv.y*14.0 + uTime*3.0) * abs(v) * 0.006;
  // CRT transition: horizontal tearing near the wipe line + flicker
  float tr = uTrans;
  float edge = abs(uv.y - (1.0 - tr));
  float tear = smoothstep(0.18, 0.0, edge) * sin(tr*3.14159);
  uv.x += (hash(vec2(floor(uv.y*90.0), floor(uTime*24.0))) - 0.5) * 0.06 * tear;
  float shift = abs(v)*0.006 + tear*0.014 + 0.0006;
  vec3 col;
  col.r = sampleMix(uv + vec2(shift, 0.0), tr).r;
  col.g = sampleMix(uv, tr).g;
  col.b = sampleMix(uv - vec2(shift, 0.0), tr).b;
  // bright scan line at wipe edge
  float line = smoothstep(0.012, 0.0, edge) * step(0.001, tr) * step(tr, 0.999);
  col += vec3(1.0, 0.25, 0.22) * line * 1.2;
  // scanlines + vignette
  col *= 0.92 + 0.08 * sin(vUv.y * 900.0);
  float vig = smoothstep(1.15, 0.35, distance(vUv, vec2(0.5)));
  col *= mix(0.78, 1.0, vig);
  // mild red tint toward the edges to keep the palette tight
  col += vec3(0.05, 0.0, 0.0) * (1.0 - vig);
  gl_FragColor = vec4(col, 1.0);
}`

export interface ShowcaseCtl {
  destroy(): void
}

export function mountShowcase(host: HTMLElement, items: Project[], stacked: boolean): ShowcaseCtl {
  const n = items.length
  host.innerHTML = ''
  host.classList.toggle('showcase--stacked', stacked)

  const slidesHTML = items
    .map(
      (p, i) => `
    <article class="slide" data-i="${i}" data-id="${p.id}" aria-labelledby="sl-${p.id}">
      <div class="slide__media"></div>
      <div class="slide__top">
        <span class="slide__idx" aria-hidden="true">${pad2(i + 1)}</span>
        <span class="slide__meta">${esc(p.category)} · ${p.year} · flagship ${pad2(i + 1)}/${pad2(n)}</span>
      </div>
      <h3 class="slide__title" id="sl-${p.id}">${esc(p.title)}</h3>
      <p class="slide__tag">${esc(p.tagline)}</p>
      <ul class="slide__log" aria-label="Highlights">
        ${p.highlights.map((h) => `<li><span class="ok">[ok]</span> <span class="txt" data-full="${esc(h)}">${esc(h)}</span></li>`).join('')}
      </ul>
      ${chipsHTML(p.stack)}
      <div class="slide__links">${linksHTML(p, true)}</div>
    </article>`,
    )
    .join('')

  host.innerHTML = `
    <div class="showcase__inner">
      <div class="showcase__text">${slidesHTML}</div>
      ${
        stacked
          ? ''
          : `<div class="showcase__stage term">
        <div class="term__bar"><span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="stage__path">~/work/<b></b></span><span class="stage__hint">click to open</span></div>
        <div class="stage__view"><canvas class="stage__canvas" aria-hidden="true"></canvas><span class="stage__corner stage__corner--tl"></span><span class="stage__corner stage__corner--br"></span></div>
      </div>
      <nav class="showcase__rail" aria-label="Flagship projects">
        ${items.map((p, i) => `<button type="button" class="rail__tick" data-go="${i}" aria-label="Show ${esc(p.title)}"><span>${pad2(i + 1)}</span><i></i></button>`).join('')}
      </nav>`
      }
    </div>`

  const slides = [...host.querySelectorAll<HTMLElement>('.slide')]
  const cleanups: Array<() => void> = []

  // Open buttons
  host.querySelectorAll<HTMLElement>('[data-open]').forEach((b) =>
    b.addEventListener('click', () => openProject(b.dataset.open!, b)),
  )

  const prepSlide = (s: HTMLElement) => {
    const p = items[+s.dataset.i!]
    const title = s.querySelector<HTMLElement>('.slide__title')!
    const chars = splitChars(title, p.title)
    return chars
  }
  const allChars = slides.map(prepSlide)

  /* ------------------------------------------------------------ stacked */
  if (stacked) {
    slides.forEach((s, i) => {
      s.querySelector('.slide__media')!.appendChild(makeThumb(items[i], 900))
      s.classList.add('is-active')
    })
    return { destroy: () => (host.innerHTML = '') }
  }

  /* ---------------------------------------------------------- pinned/WebGL */
  const stage = host.querySelector<HTMLElement>('.showcase__stage')!
  const view = host.querySelector<HTMLElement>('.stage__view')!
  const canvas = host.querySelector<HTMLCanvasElement>('.stage__canvas')!
  const pathB = host.querySelector<HTMLElement>('.stage__path b')!
  const ticks = [...host.querySelectorAll<HTMLButtonElement>('.rail__tick')]

  let renderer: THREE.WebGLRenderer | null = null
  let u: Record<string, THREE.IUniform> = {}
  let mesh: THREE.Mesh | null = null
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1.6, 0.1, 20)
  camera.position.z = 5
  const PLANE_W = 2 * Math.tan(THREE.MathUtils.degToRad(15)) * 5 * 1.6 // fills the view at z=0
  const textures: THREE.CanvasTexture[] = []
  let current = -1
  let hadWebGL = true

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    renderer.setClearColor(0x000000, 0)
    items.forEach((p) => {
      const shot = getShot(p)
      const t = new THREE.CanvasTexture(shot.canvas)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      textures.push(t)
      const sub = () => (t.needsUpdate = true)
      shot.subs.add(sub)
      cleanups.push(() => shot.subs.delete(sub))
    })
    u = {
      uA: { value: textures[0] },
      uB: { value: textures[0] },
      uTime: { value: 0 },
      uVel: { value: 0 },
      uTrans: { value: 0 },
      uRipple: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    }
    mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(PLANE_W, PLANE_W / 1.6, 48, 30),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u }),
    )
    scene.add(mesh)
  } catch (e) {
    hadWebGL = false
    console.warn('[projects] showcase WebGL unavailable, using 2D art', e)
  }

  if (!hadWebGL) {
    view.innerHTML = ''
    const thumbs = items.map((p) => makeThumb(p, 1000))
    thumbs.forEach((t, i) => {
      t.className = 'thumb stage__fallback'
      t.dataset.i = String(i)
      view.appendChild(t)
    })
  }

  const resize = () => {
    if (!renderer) return
    const w = view.clientWidth
    const h = view.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // contain the 1.6 plane inside the view
    const fitH = camera.aspect >= 1.6
    camera.fov = fitH ? 30 : (2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * (1.6 / camera.aspect)) * 180) / Math.PI
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(view)
  resize()

  /* pointer */
  const target = { x: 0.5, y: 0.5, rx: 0, ry: 0 }
  let hovering = false
  const onMove = (e: PointerEvent) => {
    const r = view.getBoundingClientRect()
    target.x = (e.clientX - r.left) / r.width
    target.y = 1 - (e.clientY - r.top) / r.height
    target.ry = (target.x - 0.5) * 0.18
    target.rx = -(target.y - 0.5) * 0.12
  }
  stage.addEventListener('pointermove', onMove)
  stage.addEventListener('pointerenter', () => {
    hovering = true
    emit('cursor:state', { state: 'view', label: 'OPEN' })
    emit('project:hover', { id: items[current]?.id ?? null, accent: items[current]?.accent })
  })
  stage.addEventListener('pointerleave', () => {
    hovering = false
    target.rx = target.ry = 0
    emit('cursor:state', { state: 'default' })
    emit('project:hover', { id: null })
  })
  stage.addEventListener('click', () => openProject(items[current].id, stage))

  /* render loop (only while stage is on screen) */
  let visible = false
  let vel = 0
  let rip = 0
  const offScroll = on('scroll', (s) => (vel = s.velocity))
  cleanups.push(offScroll)
  const tick = (time: number) => {
    if (!renderer || !visible || !mesh) return
    const dt = 0.016
    u.uTime.value = time
    const v = THREE.MathUtils.clamp(vel * 0.06, -1.5, 1.5)
    u.uVel.value += (v - u.uVel.value) * 0.12
    rip += ((hovering ? 1 : 0) - rip) * 0.08
    u.uRipple.value = rip
    const m = u.uMouse.value as THREE.Vector2
    m.x += (target.x - m.x) * 0.15
    m.y += (target.y - m.y) * 0.15
    mesh.rotation.y += (target.ry - mesh.rotation.y) * 0.08
    mesh.rotation.x += (target.rx - mesh.rotation.x) * 0.08
    void dt
    renderer.render(scene, camera)
  }
  if (renderer) {
    gsap.ticker.add(tick)
    cleanups.push(() => gsap.ticker.remove(tick))
  }

  /* slide switching */
  let transTween: gsap.core.Tween | null = null
  let typers: Array<{ pause(): unknown } | null> = []
  const setSlide = (idx: number, instant = false) => {
    if (idx === current) return
    const prev = current
    current = idx
    pathB.textContent = items[idx].id
    ticks.forEach((t, i) => {
      t.classList.toggle('is-active', i === idx)
      t.setAttribute('aria-current', i === idx ? 'true' : 'false')
    })

    // WebGL / fallback transition
    if (renderer && u.uA) {
      if (prev < 0 || instant) {
        u.uA.value = textures[idx]
        u.uB.value = textures[idx]
        u.uTrans.value = 0
      } else {
        transTween?.kill()
        u.uA.value = textures[prev]
        u.uB.value = textures[idx]
        u.uTrans.value = 0
        transTween = gsap.to(u.uTrans, { value: 1, duration: 0.95, ease: 'power2.inOut' })
        emit('glitch', { strength: 0.6 })
      }
    } else if (!renderer) {
      view.querySelectorAll<HTMLElement>('.stage__fallback').forEach((el, i) => el.classList.toggle('is-on', i === idx))
    }
    if (hovering) emit('project:hover', { id: items[idx].id, accent: items[idx].accent })

    // text
    slides.forEach((s, i) => {
      const active = i === idx
      s.classList.toggle('is-active', active)
      if (active) s.removeAttribute('inert')
      else s.setAttribute('inert', '')
    })
    playIn(slides[idx], allChars[idx], prev >= 0 && !reducedMotion)
  }

  const playIn = (s: HTMLElement, chars: HTMLElement[], animated: boolean) => {
    typers.forEach((t) => t?.pause())
    typers = []
    const lines = [...s.querySelectorAll<HTMLElement>('.slide__log li')]
    if (!animated) return
    animate(chars, {
      translateY: ['60%', '0%'],
      opacity: [0, 1],
      duration: 700,
      delay: stagger(28),
      ease: 'outExpo',
    })
    animate(s.querySelectorAll('.slide__idx, .slide__meta, .slide__tag, .chips li, .slide__links .btn'), {
      translateY: ['14px', '0px'],
      opacity: [0, 1],
      duration: 700,
      delay: stagger(36, { start: 180 }),
      ease: 'outExpo',
    })
    lines.forEach((li, k) => {
      const txt = li.querySelector<HTMLElement>('.txt')!
      li.style.opacity = '0'
      animate(li, { opacity: [0, 1], duration: 200, delay: 420 + k * 260, ease: 'linear' })
      typers.push(typeInto(txt, txt.dataset.full!, 420 + k * 260, 16))
    })
  }

  const st = ScrollTrigger.create({
    trigger: host,
    start: 'top top',
    end: () => `+=${innerHeight * (n - 1) * 0.9 + innerHeight * 0.35}`,
    pin: host.querySelector('.showcase__inner') as HTMLElement,
    pinSpacing: true,
    anticipatePin: 1,
    onUpdate: (self) => {
      const i = Math.min(n - 1, Math.floor(self.progress * n))
      setSlide(i)
      host.style.setProperty('--p', String(self.progress))
    },
    onToggle: (self) => {
      if (self.isActive) emit('cursor:state', { state: 'default' })
    },
  })
  cleanups.push(() => st.kill())

  // Render once even before the pin is reached (stage is visible above the fold of the pin).
  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting
  })
  io.observe(stage)
  cleanups.push(() => io.disconnect())

  ticks.forEach((t) =>
    t.addEventListener('click', () => {
      const i = +t.dataset.go!
      const y = st.start + ((i + 0.5) / n) * (st.end - st.start)
      if (lenis) lenis.scrollTo(y, { duration: 1.4 })
      else window.scrollTo({ top: y, behavior: 'smooth' })
    }),
  )

  setSlide(0, true)
  // first slide shows immediately (no hidden state)
  slides[0].classList.add('is-active')

  return {
    destroy() {
      cleanups.forEach((f) => f())
      transTween?.kill()
      typers.forEach((t) => t?.pause())
      ro.disconnect()
      textures.forEach((t) => t.dispose())
      mesh?.geometry.dispose()
      ;(mesh?.material as THREE.Material | undefined)?.dispose()
      renderer?.dispose()
      host.innerHTML = ''
    },
  }
}
