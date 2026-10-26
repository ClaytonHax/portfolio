import { projects } from '../data/projects'
import { emit } from '../core/bus'
import { gsap, reducedMotion, isTouch } from '../core/motion'
import { reveal } from './reveal'
import { projectImage, sectionHead, shine } from './ui'
import { icons } from './icons'

export function initWork(): void {
  const sec = document.getElementById('work')
  if (!sec) return
  const flagship = projects.filter((p) => p.tier === 'flagship')

  sec.innerHTML = `
    <div class="container sec-in">
      ${sectionHead('04', 'Selected work', 'Four problems, built end to end.', 'work-title', 'Open any of them for the story behind it.')}
      <div class="splits">
        ${flagship
          .map((p, i) => {
            const mediaLeft = i % 2 === 0
            return `
        <article class="split split--${mediaLeft ? 'l' : 'r'} rv" data-id="${p.id}" aria-labelledby="card-${p.id}-t">
          <div class="split__media glass" data-pen-stop="work-${p.id}" data-pen-side="${mediaLeft ? 'left' : 'right'}" data-pen-side-mobile="through" data-pen-gap="28">
            ${projectImage(p, '(min-width: 1024px) 56vw, 92vw', i === 0)}
          </div>
          <div class="split__body">
            <div class="card__meta">
              <p class="eyebrow">${String(i + 1).padStart(2, '0')} <span aria-hidden="true">/</span> ${p.category} <span aria-hidden="true">&middot;</span> ${p.year}</p>
              ${p.badge ? `<span class="medal" title="${p.badge}">${icons.medal}${p.badge}</span>` : ''}
            </div>
            <h3 id="card-${p.id}-t" class="split__title">${p.title}</h3>
            <p class="split__tag">${p.tagline}</p>
            <ul class="chips" aria-label="Stack">${p.stack.map((s) => `<li class="chip">${s}</li>`).join('')}</ul>
            <div class="card__actions">
              <button type="button" class="btn btn--primary" data-open="${p.id}">Read case study</button>
              ${p.url ? `<a class="btn btn--ghost" href="${p.url}" target="_blank" rel="noopener noreferrer">Visit site ${icons.arrowUpRight}<span class="sr-only"> (opens in a new tab)</span></a>` : ''}
              ${p.repo ? `<a class="btn btn--ghost" href="${p.repo}" target="_blank" rel="noopener noreferrer">Code ${icons.arrowUpRight}<span class="sr-only"> (opens in a new tab)</span></a>` : ''}
            </div>
          </div>
        </article>`
          })
          .join('')}
      </div>
    </div>`

  reveal(sec.querySelector<HTMLElement>('.sec-head')!)

  const finePointer = !isTouch && window.matchMedia('(hover: hover) and (pointer: fine)').matches

  sec.querySelectorAll<HTMLElement>('.split').forEach((item) => {
    const media = item.querySelector<HTMLElement>('.split__media')!
    const id = item.dataset.id!
    // Rows appear when the pen is level with the image; the safety net waits for the same point.
    reveal(item, { stop: `work-${id}` })
    shine(media)

    // Open from the button: it's both the expand origin and where focus returns on close.
    const btn = item.querySelector<HTMLButtonElement>('[data-open]')!
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      emit('case:open', { id, from: btn })
    })
    media.style.cursor = 'pointer'
    media.addEventListener('click', () => emit('case:open', { id, from: btn }))

    if (finePointer && !reducedMotion) {
      const rx = gsap.quickTo(media, 'rotationX', { duration: 0.5, ease: 'power3.out' })
      const ry = gsap.quickTo(media, 'rotationY', { duration: 0.5, ease: 'power3.out' })
      gsap.set(media, { transformPerspective: 1400 })
      media.addEventListener('pointermove', (e) => {
        const r = media.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        const ny = (e.clientY - r.top) / r.height - 0.5
        ry(nx * 4)
        rx(-ny * 3)
      })
      media.addEventListener('pointerleave', () => {
        rx(0)
        ry(0)
      })
    }
  })
}
