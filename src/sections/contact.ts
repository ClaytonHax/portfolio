import { profile } from '../data/profile'
import { reveal } from './reveal'
import { toast } from './ui'
import { icons } from './icons'

export function initContact(): void {
  const sec = document.getElementById('contact')
  if (!sec) return
  sec.innerHTML = `
    <div class="container sec-in contact">
      <div class="contact__in rvg">
        <p class="eyebrow rvc" style="--i:0">05 <span aria-hidden="true">/</span> Contact</p>
        <h2 id="contact-title" class="contact__title rvc" style="--i:1" data-pen-stop="contact-head" data-pen-side="left" data-pen-gap="34">Let&rsquo;s talk<span class="dot">.</span></h2>
        <p class="contact__copy rvc" style="--i:2">Got a product that needs building, or a hard problem that needs an owner? I read every message.</p>
        <p class="contact__mail-wrap rvc" style="--i:3"><a class="contact__mail" href="mailto:${profile.email}" data-pen-stop="contact" data-pen-side="end">${profile.email}</a></p>
        <div class="contact__actions rvc" style="--i:4">
          <button type="button" class="btn btn--primary" data-copy>${icons.copy}<span>Copy email</span></button>
          <a class="btn btn--ghost" href="${profile.github}" target="_blank" rel="noopener noreferrer">${icons.github}GitHub<span class="sr-only"> (opens in a new tab)</span></a>
          <a class="btn btn--ghost" href="${profile.linkedin}" target="_blank" rel="noopener noreferrer">${icons.linkedin}LinkedIn<span class="sr-only"> (opens in a new tab)</span></a>
        </div>
      </div>
    </div>`

  reveal(sec.querySelector<HTMLElement>('.contact__in')!, { stop: 'contact' })

  const btn = sec.querySelector<HTMLButtonElement>('[data-copy]')!
  const label = btn.querySelector('span')!
  let t = 0
  btn.addEventListener('click', async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(profile.email)
      ok = true
    } catch {
      const ta = document.createElement('textarea')
      ta.value = profile.email
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      ta.remove()
    }
    toast(ok ? 'Copied' : 'Copy failed, select the address instead')
    if (ok) {
      label.textContent = 'Copied'
      window.clearTimeout(t)
      t = window.setTimeout(() => (label.textContent = 'Copy email'), 1800)
    }
  })
}
