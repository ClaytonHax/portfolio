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
      ${sectionHead('02', 'Work', 'Selected work', 'work-title', 'Four things I shipped end to end. Open any of them for the story behind it.')}
      <div class="work-list">
        ${flagship
          .map((p, i) => {
            const side = i % 2 === 0 ? 'right' : 'left'
            return `
        <div class="work-item work-item--${i % 2 === 0 ? 'l' : 'r'} rv" data-pen-stop="work-${p.id}" data-pen-side="${side}" data-pen-side-mobile="through" data-pen-gap="28">
          <article class="card glass" data-id="${p.id}" aria-labelledby="card-${p.id}-t">
            ${projectImage(p, '(min-width: 769px) 56vw, 92vw', i === 0)}
            <div class="card__body">
              <div class="card__meta">
                <p class="eyebrow">${p.category} <span aria-hidden="true">&middot;</span> ${p.year}</p>
                ${p.badge ? `<span class="medal" title="${p.badge}">${icons.medal}${p.badge}</span>` : ''}
              </div>
              <h3 id="card-${p.id}-t" class="card__title">${p.title}</h3>
              <p class="card__tag">${p.tagline}</p>
              <ul class="chips" aria-label="Stack">${p.stack.map((s) => `<li class="chip">${s}</li>`).join('')}</ul>
              <div class="card__actions">
                <button type="button" class="btn btn--primary" data-open="${p.id}">Read case study</button>
                ${p.url ? `<a class="btn btn--ghost" href="${p.url}" target="_blank" rel="noopener noreferrer">Visit site ${icons.arrowUpRight}<span class="sr-only"> (opens in a new tab)</span></a>` : ''}
                ${p.repo ? `<a class="btn btn--ghost" href="${p.repo}" target="_blank" rel="noopener noreferrer">Code ${icons.arrowUpRight}<span class="sr-only"> (opens in a new tab)</span></a>` : ''}
              </div>
            </div>
          </article>
        </div>`
          })
          .join('')}
      </div>
    </div>`

  reveal(sec.querySelector<HTMLElement>('.sec-head')!)

  const finePointer = !isTouch && window.matchMedia('(hover: hover) and (pointer: fine)').matches

  sec.querySelectorAll<HTMLElement>('.work-item').forEach((item) => {
    const card = item.querySelector<HTMLElement>('.card')!
    const id = card.dataset.id!
    // Cards appear when the pen is level with their middle; the safety net waits for the same point.
    reveal(item, { stop: item.dataset.penStop })
    shine(card)

    const open = (from: HTMLElement) => emit('case:open', { id, from })
    card.querySelector<HTMLButtonElement>('[data-open]')!.addEventListener('click', (e) => {
      e.stopPropagation()
      open(card)
    })
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a, button')) return
      open(card)
    })

    if (finePointer && !reducedMotion) {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' })
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' })
      gsap.set(card, { transformPerspective: 1100 })
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        const ny = (e.clientY - r.top) / r.height - 0.5
        ry(nx * 5)
        rx(-ny * 4)
      })
      card.addEventListener('pointerleave', () => {
        rx(0)
        ry(0)
      })
    }
  })
}
