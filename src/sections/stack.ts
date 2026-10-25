import { profile } from '../data/profile'
import { reveal } from './reveal'
import { sectionHead, shine } from './ui'

export function initStack(): void {
  const sec = document.getElementById('stack')
  if (!sec) return
  let n = 0
  sec.innerHTML = `
    <div class="container sec-in">
      ${sectionHead('04', 'Stack', 'What I build with', 'stack-title')}
      <div class="stack glass rv" data-pen-stop="stack" data-pen-side="through">
        ${Object.entries(profile.skills)
          .map(
            ([group, items]) => `
          <div class="stack__row">
            <h3 class="stack__label">${group}</h3>
            <ul class="stack__chips">${items.map((s) => `<li class="chip rvc" style="--i:${n++}">${s}</li>`).join('')}</ul>
          </div>`,
          )
          .join('')}
      </div>
    </div>`
  reveal(sec.querySelector<HTMLElement>('.sec-head')!)
  const panel = sec.querySelector<HTMLElement>('.stack')!
  shine(panel)
  reveal(panel, { stop: 'stack' })
}
