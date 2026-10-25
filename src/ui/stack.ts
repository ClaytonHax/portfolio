import { gsap, ScrollTrigger, reducedMotion } from '../core/motion'
import { animate, stagger } from 'animejs'
import { profile } from '../data/profile'
import { onEnterOnce, reveal } from './fx/reveal'

export function initStack(): void {
  const el = document.getElementById('stack')!
  const cats = Object.entries(profile.skills)
  const total = cats.reduce((n, [, v]) => n + v.length, 0)

  const tree = cats
    .map(([cat, items], ci) => {
      const lastCat = ci === cats.length - 1
      const rows = items
        .map((it, i) => {
          const last = i === items.length - 1
          return `<li class="tree__row tree__item" data-cat="${cat}"><span class="tree__g" aria-hidden="true">${lastCat ? ' ' : '│'}   ${last ? '└──' : '├──'}</span> <span class="tree__n">${it}</span></li>`
        })
        .join('')
      return `<li class="tree__cat-wrap"><button type="button" class="tree__row tree__cat" data-cat="${cat}" aria-pressed="false"><span class="tree__g" aria-hidden="true">${lastCat ? '└──' : '├──'}</span> <span class="tree__c">${cat}/</span> <span class="tree__count dim">${items.length}</span></button><ul class="tree__items">${rows}</ul></li>`
    })
    .join('')

  el.innerHTML = `
    <div class="container sect">
      <header class="section-head">
        <p class="prompt"><span class="path">~/stack</span> $ tree</p>
        <h2 id="stack-title">The <span class="accent">toolbox.</span></h2>
      </header>
      <div class="stack__grid">
        <div class="term stack__term">
          <div class="term__bar"><span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span><span>zsh — tree skills/</span></div>
          <div class="term__body">
            <p class="stack__cmd"><span class="red">$</span> tree skills/</p>
            <ul class="tree"><li class="tree__root tree__row">skills/<ul class="tree__cats">${tree}</ul></li></ul>
            <p class="dim tree__sum">${cats.length} directories, ${total} files</p>
            <p class="stack__hint mono dim">tip: pick a directory to light it up on the sphere →</p>
          </div>
        </div>
        <div class="sphere-wrap">
          <div class="sphere" data-cursor="drag" aria-hidden="true"></div>
          <p class="sphere__cap mono dim" aria-hidden="true"><span class="red">⟲</span> drag to spin</p>
        </div>
      </div>
    </div>`

  // ---- Tag sphere (CSS transforms, fibonacci layout, manual 3D projection) ----
  const sphere = el.querySelector<HTMLElement>('.sphere')!
  const tags = cats.flatMap(([cat, items]) => items.map((name) => ({ name, cat })))
  const n = tags.length
  const nodes = tags.map((t) => {
    const s = document.createElement('span')
    s.className = 'sphere__tag'
    s.textContent = t.name
    sphere.appendChild(s)
    return s
  })
  const pts = tags.map((_, i) => {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const th = i * 2.399963
    return { x: Math.cos(th) * r, y, z: Math.sin(th) * r }
  })
  let rotX = 0.3,
    rotY = 0,
    vx = 0,
    vy = reducedMotion ? 0 : 0.0035
  let dragging = false,
    lastX = 0,
    lastY = 0,
    active: string | null = null,
    visible = false,
    radius = 200

  const size = () => (radius = Math.min(sphere.clientWidth, sphere.clientHeight) / 2 - 36)
  const render = () => {
    const cx = Math.cos(rotX),
      sx = Math.sin(rotX),
      cy = Math.cos(rotY),
      sy = Math.sin(rotY)
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      // rotate Y then X
      const x1 = p.x * cy + p.z * sy
      const z1 = -p.x * sy + p.z * cy
      const y2 = p.y * cx - z1 * sx
      const z2 = p.y * sx + z1 * cx
      const k = 2.6 / (2.6 - z2)
      const hot = active === tags[i].cat
      const dim = active && !hot
      const depth = (z2 + 1) / 2
      const node = nodes[i]
      node.style.transform = `translate(-50%,-50%) translate(${(x1 * radius * k).toFixed(1)}px,${(y2 * radius * k).toFixed(1)}px) scale(${(0.7 + depth * 0.55).toFixed(3)})`
      node.style.opacity = String(dim ? 0.12 + depth * 0.15 : 0.28 + depth * 0.72)
      node.style.zIndex = String(Math.round(depth * 100))
      node.classList.toggle('is-hot', hot)
    }
  }
  const tick = () => {
    if (!visible) return
    if (!dragging) {
      rotY += vy + vx
      vx *= 0.95
      rotX += (0.3 - rotX) * 0.01
    }
    render()
  }
  gsap.ticker.add(tick)
  size()
  addEventListener('resize', size)
  render()
  ScrollTrigger.create({ trigger: sphere, start: 'top bottom', end: 'bottom top', onToggle: (s) => (visible = s.isActive) })

  sphere.style.touchAction = 'pan-y'
  sphere.addEventListener('pointerdown', (e) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    sphere.setPointerCapture(e.pointerId)
  })
  sphere.addEventListener('pointermove', (e) => {
    if (!dragging) return
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    rotY += dx * 0.008
    rotX = Math.max(-1.2, Math.min(1.2, rotX - dy * 0.006))
    vx = dx * 0.0016
    render()
  })
  const end = () => (dragging = false)
  sphere.addEventListener('pointerup', end)
  sphere.addEventListener('pointercancel', end)

  // Tree <-> sphere link
  const setActive = (c: string | null) => {
    active = c
    el.querySelectorAll<HTMLElement>('.tree__cat').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.cat === c)
      b.setAttribute('aria-pressed', String(b.dataset.cat === c))
    })
    el.querySelectorAll<HTMLElement>('.tree__item').forEach((r) => r.classList.toggle('is-active', r.dataset.cat === c))
    if (!visible || reducedMotion) render()
  }
  let sticky: string | null = null
  el.querySelectorAll<HTMLElement>('.tree__cat').forEach((b) => {
    b.addEventListener('pointerenter', () => setActive(b.dataset.cat!))
    b.addEventListener('pointerleave', () => setActive(sticky))
    b.addEventListener('focus', () => setActive(b.dataset.cat!))
    b.addEventListener('blur', () => setActive(sticky))
    b.addEventListener('click', () => {
      sticky = sticky === b.dataset.cat ? null : b.dataset.cat!
      setActive(sticky ?? b.dataset.cat!)
      if (!sticky) setActive(null)
    })
  })

  // ---- Reveal ----
  if (!reducedMotion) {
    const rows = el.querySelectorAll<HTMLElement>('.tree__row')
    rows.forEach((r) => (r.style.opacity = '0'))
    onEnterOnce(el.querySelector('.stack__term')!, () => {
      animate(rows, {
        opacity: [0, 1],
        translateX: [-14, 0],
        delay: stagger(28),
        duration: 500,
        ease: 'outExpo',
      })
    }, 'top 78%')
    reveal(el.querySelector('.stack__term'), { start: 'top 90%' })
    reveal(el.querySelector('.sphere-wrap'), { start: 'top 90%' })
  }
}
