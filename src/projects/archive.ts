import { animate, stagger } from 'animejs'
import { reducedMotion, isTouch } from '../core/motion'
import { emit } from '../core/bus'
import type { Project } from '../data/projects'
import { esc, scramble } from './util'
import { openProject } from './modal'

function sizeOf(p: Project): string {
  const n = p.stack.length * 3.1 + p.highlights.length * 4.7 + p.description.length / 40
  return n.toFixed(1) + 'K'
}
function perms(p: Project): string {
  const dir = p.url ? 'd' : '-'
  const x = p.repo ? 'rwxr-xr-x' : p.url ? 'rwxr-xr-x' : 'rw-r--r--'
  return dir + x
}

export function mountArchive(host: HTMLElement, items: Project[]) {
  host.innerHTML = `
    <div class="container">
      <div class="section-head">
        <p class="prompt"><span class="path">~/archive</span> $ ls -la</p>
        <h2 id="archive-title">The <span class="accent">archive</span></h2>
      </div>
      <div class="term ls">
        <div class="term__bar"><span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span><span>clayton@harare: ~/archive</span><span class="ls__spacer"></span><span class="ls__count">${items.length} entries</span></div>
        <div class="term__body ls__body">
          <p class="ls__cmd"><span class="path">clayton@harare</span> <span class="dim">~/archive</span> $ ls -la<span class="caret" aria-hidden="true">▍</span></p>
          <p class="ls__total" aria-hidden="true">total ${(items.length * 8).toString()}</p>
          <ul class="ls__list" role="list">
            <li class="ls__row ls__row--head" aria-hidden="true"><span class="c-perm">mode</span><span class="c-own">owner</span><span class="c-size">size</span><span class="c-year">year</span><span class="c-name">name</span><span class="c-tag">description</span></li>
            ${items
              .map(
                (p) => `
            <li>
              <button type="button" class="ls__row" data-open="${p.id}" aria-haspopup="dialog">
                <span class="c-perm" aria-hidden="true">${perms(p)}</span>
                <span class="c-own" aria-hidden="true">clayton</span>
                <span class="c-size" aria-hidden="true">${sizeOf(p)}</span>
                <span class="c-year">${p.year}</span>
                <span class="c-name${p.url ? ' is-dir' : ''}"><span class="nm" data-t="${esc(p.title)}">${esc(p.title)}</span>${p.url ? '<i aria-hidden="true">/</i>' : ''}</span>
                <span class="c-tag">${esc(p.tagline)}</span>
                <span class="c-cat">${esc(p.category)}</span>
              </button>
            </li>`,
              )
              .join('')}
          </ul>
        </div>
      </div>
    </div>`

  const rows = [...host.querySelectorAll<HTMLButtonElement>('button.ls__row')]
  rows.forEach((r, i) => {
    const p = items[i]
    const nm = r.querySelector<HTMLElement>('.nm')!
    r.addEventListener('click', () => openProject(p.id, r))
    const enter = () => {
      emit('project:hover', { id: p.id, accent: p.accent })
      emit('cursor:state', { state: 'link', label: 'OPEN' })
      scramble(nm, p.title, 420)
    }
    const leave = () => {
      emit('project:hover', { id: null })
      emit('cursor:state', { state: 'default' })
    }
    r.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && !isTouch) enter()
    })
    r.addEventListener('pointerleave', leave)
    r.addEventListener('focus', enter)
    r.addEventListener('blur', leave)
  })

  // staggered reveal
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const list = host.querySelector('.ls__list')!
    rows.forEach((r) => (r.style.opacity = '0'))
    const io = new IntersectionObserver(
      (es) => {
        if (!es[0].isIntersecting) return
        io.disconnect()
        animate(rows, {
          opacity: [0, 1],
          translateX: [-16, 0],
          duration: 650,
          delay: stagger(70),
          ease: 'outExpo',
        })
        rows.forEach((r, i) => {
          const nm = r.querySelector<HTMLElement>('.nm')!
          setTimeout(() => scramble(nm, items[i].title, 500), i * 70)
        })
      },
      { threshold: 0.12 },
    )
    io.observe(list)
  }
}
