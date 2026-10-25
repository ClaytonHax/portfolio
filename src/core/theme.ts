import { emit, type Theme } from './bus'

const KEY = 'cb-theme'

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'night' ? v : null
  } catch {
    return null
  }
}

export function currentTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) || 'light'
}

export function setTheme(theme: Theme, persist = true): void {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'night' ? '#06070c' : '#e3e9f5')
  if (persist) {
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* private mode: theme just won't persist */
    }
  }
  emit('theme:change', { theme })
}

/** Stored choice wins, otherwise follow the OS. Runs before first paint (see inline script in index.html too). */
export function initTheme(): void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  setTheme(stored() ?? (mq.matches ? 'night' : 'light'), false)
  mq.addEventListener('change', (e) => {
    if (!stored()) setTheme(e.matches ? 'night' : 'light', false)
  })
}
