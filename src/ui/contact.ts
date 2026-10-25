import { gsap, scrollTo, reducedMotion, isTouch } from '../core/motion'
import { emit } from '../core/bus'
import { profile } from '../data/profile'
import { projects } from '../data/projects'
import { icons } from './icons'
import { split } from './fx/split'
import { magnetic } from './fx/magnetic'
import { reveal, onEnterOnce } from './fx/reveal'
import { sleep } from './fx/typewriter'
import { toast, copyText } from './toast'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function initContact(): void {
  const el = document.getElementById('contact')!
  el.innerHTML = `
    <div class="container sect">
      <header class="section-head">
        <p class="prompt"><span class="path">~/contact</span> $ ./hello --world</p>
        <h2 id="contact-title" class="contact__title">
          <span class="contact__l1">LET'S BUILD</span>
          <span class="contact__l2">something<span class="accent">.</span></span>
        </h2>
      </header>
      <div class="contact__grid">
        <div class="term cterm">
          <div class="term__bar"><span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span><span>visitor@portfolio — zsh</span></div>
          <div class="term__body cterm__body">
            <div class="cterm__out" role="log" aria-live="polite" aria-label="Terminal output"></div>
            <form class="cterm__form" autocomplete="off">
              <label class="cterm__prompt" for="cterm-in"><span class="red">visitor@portfolio</span> <span class="dim">~</span> $</label>
              <input id="cterm-in" class="cterm__in" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" placeholder="type help" aria-label="Terminal command" />
            </form>
            <div class="cterm__chips" role="group" aria-label="Quick commands">
              ${['help', 'email', 'github', 'projects', 'sudo hire clayton'].map((c) => `<button type="button" class="chip chip--btn" data-run="${c}">${c}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="contact__links">
          <p class="mono dim contact__lead">Prefer clicking? Same destinations, no typing.</p>
          <a class="clink" href="mailto:${profile.email}"><span class="clink__i">${icons.mail}</span><span class="clink__t"><b>Email</b><small>${profile.email}</small></span>${icons.arrow}</a>
          <a class="clink" href="${profile.github}" target="_blank" rel="noopener noreferrer"><span class="clink__i">${icons.github}</span><span class="clink__t"><b>GitHub</b><small>github.com/ClaytonHax</small></span>${icons.arrow}</a>
          <a class="clink" href="${profile.linkedin}" target="_blank" rel="noopener noreferrer"><span class="clink__i">${icons.linkedin}</span><span class="clink__t"><b>LinkedIn</b><small>Clayton Banks</small></span>${icons.arrow}</a>
          <button type="button" class="btn btn--primary contact__copy">${icons.copy}<span>Copy email</span></button>
        </div>
      </div>
    </div>`

  // ---- Headline: per-char hover distort ----
  const l1 = el.querySelector<HTMLElement>('.contact__l1')!
  const l2 = el.querySelector<HTMLElement>('.contact__l2')!
  const accent = l2.querySelector('.accent')!
  l2.removeChild(accent)
  const c1 = split(l1, "LET'S BUILD").chars
  const c2 = split(l2, 'something').chars
  const dot = document.createElement('span')
  dot.className = 'accent'
  dot.textContent = '.'
  dot.setAttribute('aria-hidden', 'true')
  l2.appendChild(dot)
  const all = [...c1, ...c2]
  const title = el.querySelector<HTMLElement>('.contact__title')!
  title.setAttribute('aria-label', "LET'S BUILD something.")
  l1.removeAttribute('aria-label')
  l2.removeAttribute('aria-label')

  if (!reducedMotion) {
    reveal(el.querySelectorAll('.split-char'), { trigger: title, stagger: 0.03, y: 60, start: 'top 85%' })
    if (!isTouch) {
      let lastGlitch = 0
      title.addEventListener('pointerenter', () => {
        const t = performance.now()
        if (t - lastGlitch > 2500) {
          lastGlitch = t
          emit('glitch', { strength: 0.7 })
        }
      })
      title.addEventListener('pointermove', (e) => {
        for (const c of all) {
          const r = c.getBoundingClientRect()
          const dx = e.clientX - (r.left + r.width / 2)
          const dy = e.clientY - (r.top + r.height / 2)
          const d = Math.hypot(dx, dy)
          const f = Math.max(0, 1 - d / 220)
          gsap.to(c, {
            y: -f * 26 * Math.sign(dy || 1),
            skewX: (dx / 220) * -f * 18,
            scaleY: 1 + f * 0.25,
            color: f > 0.55 ? '#ff3b3b' : '',
            duration: 0.5,
            ease: 'power3.out',
            overwrite: 'auto',
          })
        }
      })
      title.addEventListener('pointerleave', () => gsap.to(all, { y: 0, skewX: 0, scaleY: 1, color: '', duration: 0.9, ease: 'elastic.out(1,0.4)', overwrite: 'auto' }))
    }
  }

  // ---- Links + copy ----
  const copyBtn = el.querySelector<HTMLButtonElement>('.contact__copy')!
  const doCopy = async () => {
    const ok = await copyText(profile.email)
    toast(ok ? `copied ${profile.email}` : `email: ${profile.email}`)
    if (ok) {
      copyBtn.querySelector('span')!.textContent = 'Copied'
      setTimeout(() => (copyBtn.querySelector('span')!.textContent = 'Copy email'), 1800)
    }
  }
  copyBtn.addEventListener('click', doCopy)
  magnetic(copyBtn, 0.3)
  if (!reducedMotion) {
    reveal(el.querySelector('.cterm'), { start: 'top 90%' })
    reveal(el.querySelectorAll('.contact__links > *'), { trigger: el.querySelector('.contact__links')!, start: 'top 90%', stagger: 0.09 })
  }

  // ---- Interactive terminal ----
  const out = el.querySelector<HTMLElement>('.cterm__out')!
  const form = el.querySelector<HTMLFormElement>('.cterm__form')!
  const input = el.querySelector<HTMLInputElement>('.cterm__in')!

  const print = (html: string, cls = '') => {
    const d = document.createElement('div')
    d.className = 'cterm__line ' + cls
    d.innerHTML = html
    out.appendChild(d)
    out.scrollTop = out.scrollHeight
    return d
  }
  const link = (href: string, text = href) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`

  const sections = ['about', 'work', 'archive', 'stack', 'contact', 'hero']
  const cmds: Record<string, { desc: string; run: (args: string[]) => void | Promise<void> }> = {
    help: {
      desc: 'list available commands',
      run: () => {
        print('<span class="dim">available commands:</span>')
        Object.entries(cmds).forEach(([k, v]) => print(`  <span class="red">${k.padEnd(10)}</span><span class="dim">${v.desc}</span>`, 'pre'))
        print('<span class="dim">  also: sudo hire clayton · cd &lt;section&gt; · tab completes · ↑/↓ history</span>', 'pre')
      },
    },
    whoami: { desc: 'who am i talking to', run: () => void print(`${profile.name} (${profile.handle}) — ${profile.role}, ${profile.location}`) },
    email: {
      desc: 'show + copy my email',
      run: async () => {
        print(`<a href="mailto:${profile.email}">${profile.email}</a>`)
        if (await copyText(profile.email)) print('<span class="ok">[ok]</span> copied to clipboard')
      },
    },
    github: { desc: 'open github', run: () => void (print(link(profile.github)), window.open(profile.github, '_blank', 'noopener')) },
    linkedin: { desc: 'open linkedin', run: () => void (print(link(profile.linkedin)), window.open(profile.linkedin, '_blank', 'noopener')) },
    projects: {
      desc: 'list projects',
      run: () => {
        projects.forEach((p) => print(`<span class="red">${String(p.year)}</span>  ${esc(p.id.padEnd(14))}<span class="dim">${esc(p.tagline)}</span>`, 'pre'))
        print('<span class="dim">scroll to #work for the full tour (try: cd work)</span>')
      },
    },
    cd: {
      desc: 'jump to a section (cd work)',
      run: (a) => {
        const t = a[0]?.replace(/^~?\//, '')
        if (t && sections.includes(t)) void (print(`<span class="ok">[ok]</span> cd ${esc(t)}`), scrollTo(document.getElementById(t)!))
        else print(`<span class="red">cd: no such section: ${esc(t ?? '')}</span> <span class="dim">(${sections.join(', ')})</span>`)
      },
    },
    clear: { desc: 'clear the screen', run: () => void (out.innerHTML = '') },
  }
  const sudo = async () => {
    print('[sudo] password for visitor: <span class="dim">••••••••</span>')
    await sleep(500)
    print('<span class="wait">[..]</span> verifying taste ........ <span class="ok">ok</span>')
    await sleep(450)
    print('<span class="wait">[..]</span> allocating budget ...... <span class="ok">ok</span>')
    await sleep(450)
    print('<span class="ok">[ok]</span> <b>permission granted.</b> Clayton has been hired (pending an email from you).')
    print(`  → <a href="mailto:${profile.email}?subject=Let%27s%20work%20together">${profile.email}</a>`)
    emit('glitch', { strength: 1 })
  }

  const run = async (raw: string) => {
    const line = raw.trim()
    const echo = print(`<span class="red">visitor@portfolio</span> <span class="dim">~</span> $ `)
    echo.appendChild(document.createTextNode(line))
    if (!line) return
    const [cmd, ...args] = line.split(/\s+/)
    if (cmd === 'sudo') {
      if (args.join(' ') === 'hire clayton') return sudo()
      return void print('<span class="red">sudo: nice try. maybe: sudo hire clayton</span>')
    }
    const c = cmds[cmd.toLowerCase()]
    if (c) await c.run(args)
    else print(`<span class="red">command not found: ${esc(cmd)}</span> <span class="dim">— type help</span>`)
  }

  const history: string[] = []
  let hi = 0
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const v = input.value
    input.value = ''
    if (v.trim()) history.push(v)
    hi = history.length
    void run(v)
  })
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (hi > 0) input.value = history[--hi]
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      input.value = hi < history.length - 1 ? history[++hi] : ((hi = history.length), '')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const v = input.value.toLowerCase()
      if (!v) return
      const pool = [...Object.keys(cmds), 'sudo hire clayton']
      const m = pool.filter((k) => k.startsWith(v))
      if (m.length === 1) input.value = m[0] + (m[0] === 'cd' ? ' ' : '')
      else if (m.length > 1) {
        let p = m[0]
        for (const k of m) while (!k.startsWith(p)) p = p.slice(0, -1)
        input.value = p
        print(`<span class="dim">${m.map(esc).join('  ')}</span>`)
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      out.innerHTML = ''
    }
  })
  el.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) =>
    b.addEventListener('click', () => {
      void run(b.dataset.run!)
    }),
  )
  out.addEventListener('click', () => !window.getSelection()?.toString() && input.focus({ preventScroll: true }))

  // Welcome message types in when the terminal enters view
  const welcome = () => {
    print('<span class="red">✻</span> Welcome. I answer to a few commands.')
    print('<span class="dim">type <span class="red">help</span> or tap a chip below — or just use the links.</span>')
  }
  if (reducedMotion) welcome()
  else onEnterOnce(el.querySelector('.cterm')!, async () => {
    await sleep(500)
    welcome()
  }, 'top 80%')
}
