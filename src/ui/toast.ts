import { gsap, reducedMotion } from '../core/motion'

let el: HTMLElement | null = null
let t: gsap.core.Tween | null = null

export function toast(msg: string): void {
  if (!el) {
    el = document.createElement('div')
    el.className = 'toast'
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    document.body.appendChild(el)
    gsap.set(el, { xPercent: -50 })
  }
  el.innerHTML = `<span class="spin-red">✻</span> ${msg}`
  t?.kill()
  if (reducedMotion) {
    el.style.opacity = '1'
    t = gsap.delayedCall(2.2, () => (el!.style.opacity = '0'))
    return
  }
  t = gsap.fromTo(
    el,
    { autoAlpha: 0, y: 16 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out', onComplete: () => void (t = gsap.to(el, { autoAlpha: 0, y: 8, delay: 2.2, duration: 0.4 })) },
  )
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {}
    ta.remove()
    return ok
  }
}
