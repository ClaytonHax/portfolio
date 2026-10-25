import { on } from '../core/bus'

/** Fixed background: three soft radial blobs drifting with transform-only keyframes. */
export function initBackground(): void {
  const bg = document.getElementById('bg')
  if (!bg) return
  bg.innerHTML = '<div class="blobs"><i class="blob blob--1"></i><i class="blob blob--2"></i><i class="blob blob--3"></i></div>'
  on('theme:change', () => {
    bg.classList.remove('is-swap')
    void bg.offsetWidth
    bg.classList.add('is-swap')
  })
}
