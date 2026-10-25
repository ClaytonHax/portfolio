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
  return (document.documentElement.dataset.theme as Theme) || 'night'
}

export function setTheme(theme: Theme, persist = true): void {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'night' ? '#14070a' : '#fbf1ee')
  if (persist) {
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* private mode: theme just won't persist */
    }
  }
  emit('theme:change', { theme })
}

/** Night is the default; only an explicit stored choice overrides it. Runs before first paint (see inline script in index.html too). */
export function initTheme(): void {
  setTheme(stored() ?? 'night', false)
}
