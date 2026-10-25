import { animate, svg } from 'animejs'
import { gsap, isTouch, reducedMotion } from '../core/motion'
import { Flip } from 'gsap/Flip'
import { emit } from '../core/bus'
import type { Project, ProjectCategory } from '../data/projects'
import { makeThumb } from './art'
import { chipsHTML, esc, pad2, revealOnEnter } from './util'
import { openProject } from './modal'

gsap.registerPlugin(Flip)

const PATTERN = [8, 4, 4, 4, 4, 6, 6]

function assignSpans(visible: HTMLElement[]) {
  let row = 0
  let rowStart = 0
  visible.forEach((el, i) => {
    let span = PATTERN[i % PATTERN.length]
    if (row + span > 12) {
      // close previous row by stretching its last card
      if (row < 12 && i > rowStart) visible[i - 1].style.setProperty('--span', String(+visible[i - 1].style.getPropertyValue('--span') + (12 - row)))
      row = 0
      rowStart = i
    }
    row += span
    if (row === 12) {
      row = 0
      rowStart = i + 1
    }
    el.style.setProperty('--span', String(span))
  })
  if (row > 0 && row < 12 && visible.length) {
    const last = visible[visible.length - 1]
    last.style.setProperty('--span', String(+last.style.getPropertyValue('--span') + (12 - row)))
  }
}

export function mountGrid(host: HTMLElement, items: Project[]) {
  const cats = (['AI', 'Web App', 'Simulation', 'Tool', 'Website'] as ProjectCategory[]).filter((c) =>
    items.some((p) => p.category === c),
  )
  const filters = ['All', ...cats]

  host.innerHTML = `
    <div class="grid-head">
      <p class="prompt" aria-hidden="true"><span class="path">~/work</span> $ ls --featured <span class="dim">--filter=</span><span class="grid-head__f">all</span></p>
      <div class="filters" role="group" aria-label="Filter projects by category">
        ${filters
          .map(
            (f, i) =>
              `<button type="button" class="filter${i === 0 ? ' is-on' : ''}" data-f="${esc(f)}" aria-pressed="${i === 0}">${esc(f)}<span class="filter__n">${f === 'All' ? items.length : items.filter((p) => p.category === f).length}</span></button>`,
          )
          .join('')}
      </div>
    </div>
    <p class="sr-only" role="status" aria-live="polite" id="grid-status"></p>
    <div class="bento">
      ${items
        .map(
          (p, i) => `
        <article class="card" data-id="${p.id}" data-cat="${esc(p.category)}">
          <div class="card__tilt term">
            <div class="term__bar"><span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="card__path">~/work/${p.id}</span><span class="card__cat">${esc(p.category)}</span></div>
            <div class="card__thumb"></div>
            <div class="card__body">
              <div class="card__row"><span class="card__idx" aria-hidden="true">${pad2(i + 4)}</span><span class="card__year">${p.year}</span></div>
              <h3 class="card__title"><button type="button" class="card__open" data-open="${p.id}" aria-haspopup="dialog">${esc(p.title)}</button></h3>
              <p class="card__tag">${esc(p.tagline)}</p>
              ${chipsHTML(p.stack, 4)}
            </div>
            <span class="card__glare" aria-hidden="true"></span>
            <svg class="card__trace" aria-hidden="true" focusable="false"><rect x="1" y="1" rx="15" ry="15" width="10" height="10" /></svg>
          </div>
        </article>`,
        )
        .join('')}
    </div>`

  const cards = [...host.querySelectorAll<HTMLElement>('.card')]
  const status = host.querySelector<HTMLElement>('#grid-status')!
  const fLabel = host.querySelector<HTMLElement>('.grid-head__f')!
  const bento = host.querySelector<HTMLElement>('.bento')!

  cards.forEach((c, i) => {
    c.querySelector('.card__thumb')!.appendChild(makeThumb(items[i], 720))
    const tilt = c.querySelector<HTMLElement>('.card__tilt')!
    const rect = c.querySelector<SVGRectElement>('.card__trace rect')!
    const trace = c.querySelector<SVGSVGElement>('.card__trace')!
    const p = items[i]

    // border trace sized to the card
    const sizeTrace = () => {
      const w = tilt.offsetWidth
      const h = tilt.offsetHeight
      if (!w) return
      trace.setAttribute('viewBox', `0 0 ${w} ${h}`)
      rect.setAttribute('width', String(w - 2))
      rect.setAttribute('height', String(h - 2))
    }
    new ResizeObserver(sizeTrace).observe(tilt)
    sizeTrace()
    const [drawable] = svg.createDrawable(rect)
    drawable.setAttribute('draw', '0 0')
    let traceAnim: ReturnType<typeof animate> | null = null

    let hovered = false
    const enter = () => {
      if (hovered) return
      hovered = true
      emit('project:hover', { id: p.id, accent: p.accent })
      emit('cursor:state', { state: 'view', label: 'VIEW' })
      c.classList.add('is-hot')
      if (!reducedMotion) {
        traceAnim?.pause()
        sizeTrace()
        traceAnim = animate(drawable, { draw: ['0 0', '0 1'], duration: 900, ease: 'outExpo' })
      } else drawable.setAttribute('draw', '0 1')
    }
    const leave = () => {
      if (!hovered) return
      hovered = false
      emit('project:hover', { id: null })
      emit('cursor:state', { state: 'default' })
      c.classList.remove('is-hot')
      tilt.style.transform = ''
      traceAnim?.pause()
      traceAnim = reducedMotion ? null : animate(drawable, { draw: ['0 1', '1 1'], duration: 450, ease: 'outQuad' })
      if (reducedMotion) drawable.setAttribute('draw', '0 0')
    }

    c.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') enter()
    })
    c.addEventListener('pointerleave', leave)
    c.addEventListener('focusin', () => {
      enter()
    })
    c.addEventListener('focusout', leave)
    if (!isTouch && !reducedMotion) {
      const qx = gsap.quickTo(tilt, 'rotationY', { duration: 0.5, ease: 'power3.out' })
      const qy = gsap.quickTo(tilt, 'rotationX', { duration: 0.5, ease: 'power3.out' })
      gsap.set(tilt, { transformPerspective: 900, transformOrigin: '50% 50%' })
      c.addEventListener('pointermove', (e) => {
        const r = tilt.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        qx((px - 0.5) * 12)
        qy(-(py - 0.5) * 10)
        tilt.style.setProperty('--mx', `${px * 100}%`)
        tilt.style.setProperty('--my', `${py * 100}%`)
      })
      c.addEventListener('pointerleave', () => {
        qx(0)
        qy(0)
      })
    }
    c.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a')) return
      openProject(p.id, tilt)
    })
  })

  /* filtering with FLIP */
  const apply = (f: string, animateIt: boolean) => {
    const state = animateIt && !reducedMotion ? Flip.getState(cards) : null
    const vis: HTMLElement[] = []
    cards.forEach((c) => {
      const show = f === 'All' || c.dataset.cat === f
      c.classList.toggle('is-hidden', !show)
      c.toggleAttribute('hidden', !show)
      if (show) vis.push(c)
    })
    assignSpans(vis)
    fLabel.textContent = f.toLowerCase().replace(' ', '-')
    status.textContent = `${vis.length} project${vis.length === 1 ? '' : 's'} shown`
    if (state)
      Flip.from(state, {
        duration: 0.7,
        ease: 'expo.out',
        absolute: true,
        scale: false,
        nested: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 24, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'expo.out' }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.3 }),
      })
  }
  apply('All', false)

  host.querySelectorAll<HTMLButtonElement>('.filter').forEach((b) =>
    b.addEventListener('click', () => {
      host.querySelectorAll('.filter').forEach((o) => {
        o.classList.toggle('is-on', o === b)
        o.setAttribute('aria-pressed', String(o === b))
      })
      apply(b.dataset.f!, true)
    }),
  )

  revealOnEnter(cards.slice(), () => {})
  void bento
}
