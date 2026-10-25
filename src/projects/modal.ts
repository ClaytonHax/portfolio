import { animate, stagger } from 'animejs'
import { gsap, lockScroll, reducedMotion } from '../core/motion'
import { emit } from '../core/bus'
import { projects } from '../data/projects'
import type { Project } from '../data/projects'
import { makeThumb } from './art'
import { chipsHTML, esc, ICON_ARROW, pad2 } from './util'

let root: HTMLElement
let dlg: HTMLElement
let content: HTMLElement
let backdrop: HTMLElement
let isOpen = false
let busy = false
let idx = 0
let opener: HTMLElement | null = null
let origin: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'

export function initModal(host: HTMLElement) {
  root = host
  root.innerHTML = `
    <div class="pm" hidden>
      <div class="pm__backdrop"></div>
      <div class="pm__dialog term" role="dialog" aria-modal="true" aria-labelledby="pm-title" tabindex="-1" data-lenis-prevent>
        <div class="term__bar pm__bar">
          <span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="pm__path"></span>
          <span class="pm__spacer"></span>
          <button type="button" class="pm__close" aria-label="Close project (Escape)"><span aria-hidden="true">[esc]</span> close</button>
        </div>
        <div class="pm__scroll"><div class="pm__content"></div></div>
        <div class="pm__nav">
          <button type="button" class="pm__step" data-step="-1"><span aria-hidden="true">←</span><span class="pm__step-l"><small>prev</small><b></b></span></button>
          <span class="pm__count" aria-live="polite"></span>
          <button type="button" class="pm__step pm__step--next" data-step="1"><span class="pm__step-l"><small>next</small><b></b></span><span aria-hidden="true">→</span></button>
        </div>
      </div>
    </div>`
  const pm = root.querySelector<HTMLElement>('.pm')!
  dlg = pm.querySelector<HTMLElement>('.pm__dialog')!
  backdrop = pm.querySelector<HTMLElement>('.pm__backdrop')!
  content = pm.querySelector<HTMLElement>('.pm__content')!

  backdrop.addEventListener('click', () => closeProject())
  dlg.querySelector('.pm__close')!.addEventListener('click', () => closeProject())
  dlg.querySelectorAll<HTMLElement>('[data-step]').forEach((b) =>
    b.addEventListener('click', () => step(+b.dataset.step!)),
  )
  document.addEventListener('keydown', onKey)

  // delegated open buttons anywhere (e.g. UI contact terminal `projects`)
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-open-project]')
    if (t) openProject(t.dataset.openProject!, t)
  })
}

function onKey(e: KeyboardEvent) {
  if (!isOpen) return
  if (e.key === 'Escape') {
    e.preventDefault()
    closeProject()
  } else if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'Tab') {
    const f = [...dlg.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === dlg)
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    const a = document.activeElement
    if (e.shiftKey && (a === first || a === dlg)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && a === last) {
      e.preventDefault()
      first.focus()
    } else if (!dlg.contains(a)) {
      e.preventDefault()
      first.focus()
    }
  }
}

function render(p: Project) {
  const i = projects.indexOf(p)
  const prev = projects[(i - 1 + projects.length) % projects.length]
  const next = projects[(i + 1) % projects.length]
  dlg.querySelector('.pm__path')!.textContent = `~/work/${p.id}`
  dlg.querySelector('.pm__count')!.textContent = `${pad2(i + 1)} / ${pad2(projects.length)}`
  dlg.querySelectorAll('.pm__step b')[0].textContent = prev.title
  dlg.querySelectorAll('.pm__step b')[1].textContent = next.title
  content.innerHTML = `
    <div class="pm__media"></div>
    <div class="pm__grid">
      <div class="pm__main">
        <p class="pm__kicker">${esc(p.category)} · ${p.year} · ${p.tier}</p>
        <h2 class="pm__title" id="pm-title">${esc(p.title)}</h2>
        <p class="pm__tag">${esc(p.tagline)}</p>
        <p class="pm__desc">${esc(p.description)}</p>
        <ul class="pm__log" aria-label="Highlights">
          ${p.highlights.map((h) => `<li><span class="ok">[ok]</span> ${esc(h)}</li>`).join('')}
        </ul>
      </div>
      <aside class="pm__side" aria-label="Project details">
        <h3 class="pm__h">stack</h3>
        ${chipsHTML(p.stack)}
        <h3 class="pm__h">links</h3>
        <div class="pm__links">
          ${p.url ? `<a class="btn btn--solid" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Visit live site ${ICON_ARROW}</a>` : ''}
          ${p.repo ? `<a class="btn" href="${esc(p.repo)}" target="_blank" rel="noopener noreferrer">View source ${ICON_ARROW}</a>` : ''}
          ${!p.url && !p.repo ? '<span class="pm__none">no public link — ask me for a walkthrough</span>' : ''}
        </div>
      </aside>
    </div>`
  content.querySelector('.pm__media')!.appendChild(makeThumb(p, 1200))
  dlg.querySelector<HTMLElement>('.pm__scroll')!.scrollTop = 0
}

function stagger_in() {
  if (reducedMotion) return
  animate(content.querySelectorAll('.pm__kicker, .pm__title, .pm__tag, .pm__desc, .pm__log li, .pm__h, .chips li, .pm__links .btn'), {
    opacity: [0, 1],
    translateY: [12, 0],
    duration: 600,
    delay: stagger(32, { start: 150 }),
    ease: 'outExpo',
  })
}

function insetFrom(el: HTMLElement | null): string {
  const d = dlg.getBoundingClientRect()
  if (!el) return 'inset(50% 50% 50% 50% round 16px)'
  const r = el.getBoundingClientRect()
  const t = Math.max(0, r.top - d.top)
  const l = Math.max(0, r.left - d.left)
  const b = Math.max(0, d.bottom - r.bottom)
  const rt = Math.max(0, d.right - r.right)
  return `inset(${t}px ${rt}px ${b}px ${l}px round 14px)`
}

export function openProject(id: string, from?: HTMLElement | null) {
  const p = projects.find((x) => x.id === id)
  if (!p || busy) return
  if (isOpen) {
    idx = projects.indexOf(p)
    swap(p)
    return
  }
  busy = true
  idx = projects.indexOf(p)
  opener = (document.activeElement as HTMLElement) || from || null
  origin = from ?? null
  const pm = root.querySelector<HTMLElement>('.pm')!
  render(p)
  pm.hidden = false
  isOpen = true
  lockScroll(true)
  emit('project:open', { id: p.id })
  emit('cursor:state', { state: 'default' })

  if (reducedMotion) {
    gsap.set(backdrop, { opacity: 1 })
    gsap.set(dlg, { clearProps: 'all' })
    busy = false
  } else {
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' })
    const from_ = insetFrom(origin)
    gsap.fromTo(
      dlg,
      { clipPath: from_, opacity: 0.4 },
      {
        clipPath: 'inset(0px 0px 0px 0px round 16px)',
        opacity: 1,
        duration: 0.75,
        ease: 'expo.out',
        onComplete: () => {
          dlg.style.clipPath = ''
          busy = false
        },
      },
    )
    stagger_in()
  }
  dlg.focus({ preventScroll: true })
  // move focus to close button for quick dismissal / SR context
  requestAnimationFrame(() => dlg.querySelector<HTMLElement>('.pm__close')?.focus({ preventScroll: true }))
}

function swap(p: Project) {
  if (busy) return
  busy = true
  emit('project:open', { id: p.id })
  emit('glitch', { strength: 0.5 })
  const done = () => {
    render(p)
    gsap.fromTo(content, { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out', onComplete: () => (busy = false) })
    stagger_in()
  }
  if (reducedMotion) {
    render(p)
    busy = false
  } else gsap.to(content, { opacity: 0, x: -14, duration: 0.18, ease: 'power2.in', onComplete: done })
  origin = null
}

function step(dir: number) {
  if (!isOpen || busy) return
  idx = (idx + dir + projects.length) % projects.length
  swap(projects[idx])
}

export function closeProject() {
  if (!isOpen || busy) return
  busy = true
  const pm = root.querySelector<HTMLElement>('.pm')!
  const finish = () => {
    pm.hidden = true
    dlg.style.clipPath = ''
    isOpen = false
    busy = false
    lockScroll(false)
    emit('project:close')
    const back = opener && document.contains(opener) ? opener : origin
    back?.focus?.({ preventScroll: true })
  }
  if (reducedMotion) return finish()
  gsap.to(backdrop, { opacity: 0, duration: 0.45, ease: 'power2.in' })
  const target = origin && document.contains(origin) && origin.offsetParent !== null ? origin : null
  gsap.to(dlg, {
    clipPath: insetFrom(target),
    opacity: target ? 0.6 : 0,
    duration: 0.5,
    ease: 'expo.inOut',
    onComplete: finish,
  })
}
