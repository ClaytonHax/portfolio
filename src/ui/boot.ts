import { gsap, reducedMotion } from '../core/motion'
import { emit } from '../core/bus'
import { scramble } from './fx/scramble'
import { SPINNER } from './icons'

const LINES: [string, string][] = [
  ['ok', 'mounting /dev/creativity'],
  ['ok', 'loading kernel modules: typescript, python, three.js'],
  ['ok', 'checking vibes ........ immaculate'],
  ['ok', 'linking gpu: webgl2 · particles x 100000'],
  ['ok', 'spawning agents: sabine, simon'],
  ['ok', 'compiling shaders'],
  ['ok', 'tuning bloom, grain, chromatic aberration'],
  ['ok', 'syncing time zone: Africa/Harare'],
  ['..', 'warming up the core'],
  ['ok', 'portfolio ready'],
]

const KEY = 'cb-booted'

let shouldBoot = false
let nodes: { root: HTMLElement; log: HTMLElement; spin: HTMLElement; bar: HTMLElement; pct: HTMLElement; name: HTMLElement; spinner: number } | null = null

/** Called synchronously from initUI so the overlay covers the page while WebGL loads. */
export function prepareBoot(): void {
  const root = document.getElementById('boot')!
  let seen = false
  try {
    seen = sessionStorage.getItem(KEY) === '1'
    sessionStorage.setItem(KEY, '1')
  } catch {}
  shouldBoot = !(reducedMotion || seen)
  if (!shouldBoot) {
    root.style.display = 'none'
    return
  }
  root.innerHTML = `
    <div class="boot__inner">
      <div class="boot__head"><span class="boot__spin" aria-hidden="true">✻</span> <span>clayton-os 1.0 — boot</span><span class="boot__skip">press any key to skip</span></div>
      <div class="boot__log" aria-hidden="true"></div>
      <div class="boot__bar" aria-hidden="true"><i></i></div>
      <div class="boot__pct" aria-hidden="true">0%</div>
      <div class="boot__name" aria-label="Clayton Banks"><span aria-hidden="true"></span></div>
    </div>`
  root.classList.add('is-on')
  const spin = root.querySelector<HTMLElement>('.boot__spin')!
  let si = 0
  nodes = {
    root,
    spin,
    log: root.querySelector<HTMLElement>('.boot__log')!,
    bar: root.querySelector<HTMLElement>('.boot__bar i')!,
    pct: root.querySelector<HTMLElement>('.boot__pct')!,
    name: root.querySelector<HTMLElement>('.boot__name span')!,
    spinner: window.setInterval(() => (spin.textContent = SPINNER[++si % SPINNER.length]), 90),
  }
}

export async function runBoot(): Promise<void> {
  if (!shouldBoot || !nodes) return
  const { root, log, bar, pct, name, spinner } = nodes
  const state = { p: 0 }
  const tl = gsap.timeline()
  tl.to(state, {
    p: 1,
    duration: 1.9,
    ease: 'power1.inOut',
    onUpdate: () => {
      bar.style.transform = `scaleX(${state.p})`
      pct.textContent = Math.round(state.p * 100) + '%'
    },
  })
  LINES.forEach(([tag, msg], i) => {
    tl.call(
      () => {
        const row = document.createElement('div')
        row.className = 'boot__row'
        row.innerHTML = `<span class="${tag === 'ok' ? 'ok' : 'wait'}">[${tag}]</span> ${msg}`
        log.appendChild(row)
        while (log.children.length > 9) log.firstElementChild!.remove()
      },
      undefined,
      0.08 + i * 0.18,
    )
  })
  tl.addLabel('name', 1.95)
  tl.call(
    () => {
      root.classList.add('is-name')
      void scramble(name, 'CLAYTON BANKS', { duration: 700 })
      emit('glitch', { strength: 0.8 })
    },
    undefined,
    'name',
  )
  tl.addLabel('exit', '+=1.0')
  tl.call(() => emit('glitch', { strength: 1 }), undefined, 'exit')
  tl.to(root, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 'exit+=0.08')

  await new Promise<void>((resolve) => {
    const finish = () => {
      cleanup()
      clearInterval(spinner)
      root.style.display = 'none'
      resolve()
    }
    const skip = () => {
      cleanup()
      // fast-forward straight to the exit wipe
      if (tl.time() < tl.labels.exit) {
        tl.time(tl.labels.name, false)
        tl.timeScale(1.6)
      }
    }
    const cleanup = () => {
      removeEventListener('pointerdown', skip)
      removeEventListener('keydown', skip)
    }
    addEventListener('pointerdown', skip)
    addEventListener('keydown', skip)
    tl.eventCallback('onComplete', finish)
  })
}
