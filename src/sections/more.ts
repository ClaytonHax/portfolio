import { projects, type ProjectCategory } from '../data/projects'
import { emit } from '../core/bus'
import { Flip, gsap, reducedMotion } from '../core/motion'
import { reveal } from './reveal'
import { projectImage, sectionHead, shine } from './ui'

export function initMore(): void {
  const sec = document.getElementById('more')
  if (!sec) return
  const rest = projects.filter((p) => p.tier === 'more')
  const order: ProjectCategory[] = ['Web App', 'Simulation', 'Tool', 'Website', 'AI']
  const cats = order.filter((c) => rest.some((p) => p.category === c))

  sec.innerHTML = `
    <div class="container sec-in">
      ${sectionHead('05', 'More things I\'ve made', 'Smaller builds, same care.', 'more-title', 'Client sites, tools and experiments.')}
      <div class="filters" role="group" aria-label="Filter projects by category">
        ${['All', ...cats].map((c, i) => `<button type="button" class="filter" data-cat="${c}" aria-pressed="${i === 0}">${c}</button>`).join('')}
      </div>
      <div class="tiles rvg" data-pen-stop="more" data-pen-side="right" data-pen-side-mobile="through">
        ${rest
          .map(
            (p, i) => `
          <button type="button" class="tile glass rvc" style="--i:${i % 4}" data-id="${p.id}" data-cat="${p.category}">
            ${projectImage(p, '(min-width: 1024px) 30vw, (min-width: 769px) 44vw, 92vw')}
            <span class="tile__body">
              <span class="tile__top"><span class="eyebrow">${p.category}</span><span class="eyebrow">${p.year}</span></span>
              <span class="tile__title">${p.title}</span>
              <span class="tile__tag">${p.tagline}</span>
              <span class="sr-only">, open case study</span>
            </span>
          </button>`,
          )
          .join('')}
      </div>
    </div>`

  reveal(sec.querySelector<HTMLElement>('.sec-head')!)
  const grid = sec.querySelector<HTMLElement>('.tiles')!
  reveal(grid, { stop: 'more' })

  const tiles = [...grid.querySelectorAll<HTMLButtonElement>('.tile')]
  tiles.forEach((t) => {
    shine(t)
    t.addEventListener('click', () => emit('case:open', { id: t.dataset.id!, from: t }))
  })

  const buttons = [...sec.querySelectorAll<HTMLButtonElement>('.filter')]
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const cat = b.dataset.cat!
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
      const apply = () => tiles.forEach((t) => (t.hidden = cat !== 'All' && t.dataset.cat !== cat))
      if (reducedMotion) {
        apply()
        emit('layout:change')
        return
      }
      const state = Flip.getState(tiles)
      apply()
      Flip.from(state, {
        duration: 0.55,
        ease: 'power3.inOut',
        absolute: true,
        scale: false,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.45, clearProps: 'opacity,transform' }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.3 }),
        onComplete: () => emit('layout:change'),
      })
      emit('layout:change')
    }),
  )
}
