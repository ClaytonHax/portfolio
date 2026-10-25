/** Text scramble / decode effect (idea: Justin Windle's TextScramble, reimplemented). */
const GLYPHS = '!<>-_\\/[]{}=+*^?#01'

export function scramble(
  el: HTMLElement,
  text: string,
  opts: { duration?: number; delay?: number; instant?: boolean } = {},
): Promise<void> {
  const { duration = 900, delay = 0, instant = false } = opts
  if (instant) {
    el.textContent = text
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const n = text.length
    const start = performance.now() + delay
    const prev = (el as any).__scr as number | undefined
    if (prev) cancelAnimationFrame(prev)
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      let out = ''
      for (let i = 0; i < n; i++) {
        const c = text[i]
        if (c === ' ') out += c
        else if (i / n < t) out += c
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0]
      }
      el.textContent = out
      if (t < 1) (el as any).__scr = requestAnimationFrame(tick)
      else {
        el.textContent = text
        resolve()
      }
    }
    ;(el as any).__scr = requestAnimationFrame(tick)
  })
}
