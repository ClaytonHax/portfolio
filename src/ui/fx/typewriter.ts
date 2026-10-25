import { reducedMotion } from '../../core/motion'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Type `text` into `el`. A hidden ghost copy reserves the final height so layout never jumps.
 * Host gets aria-label with the full text; inner spans are aria-hidden.
 */
export async function typeInto(
  el: HTMLElement,
  text: string,
  opts: { speed?: number; instant?: boolean } = {},
): Promise<void> {
  const { speed = 14, instant = reducedMotion } = opts
  el.setAttribute('aria-label', text)
  el.textContent = ''
  const ghost = document.createElement('span')
  ghost.className = 'tw-ghost'
  ghost.setAttribute('aria-hidden', 'true')
  ghost.textContent = text
  const live = document.createElement('span')
  live.className = 'tw-live'
  live.setAttribute('aria-hidden', 'true')
  el.append(ghost, live)
  if (instant) {
    live.textContent = text
    return
  }
  el.classList.add('is-typing')
  for (let i = 1; i <= text.length; i++) {
    live.textContent = text.slice(0, i)
    const ch = text[i - 1]
    await sleep(speed * (ch === '.' || ch === ',' ? 6 : ch === ' ' ? 0.6 : 1) * (0.6 + Math.random() * 0.8))
  }
  el.classList.remove('is-typing')
}

export { sleep }
