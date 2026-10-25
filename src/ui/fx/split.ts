/** Split text into word/char spans. Keeps an aria-label on the host, spans are aria-hidden. */
export interface SplitResult {
  chars: HTMLElement[]
  words: HTMLElement[]
}

export function split(el: HTMLElement, text = el.textContent ?? ''): SplitResult {
  el.setAttribute('aria-label', text)
  el.textContent = ''
  const chars: HTMLElement[] = []
  const words: HTMLElement[] = []
  text.split(' ').forEach((w, wi, arr) => {
    const word = document.createElement('span')
    word.className = 'split-word'
    word.setAttribute('aria-hidden', 'true')
    for (const ch of w) {
      const c = document.createElement('span')
      c.className = 'split-char'
      c.textContent = ch
      word.appendChild(c)
      chars.push(c)
    }
    el.appendChild(word)
    words.push(word)
    if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '))
  })
  return { chars, words }
}
