// Light / dark / system theme. The stored choice is applied before paint by an inline script in each HTML page.
export type Theme = 'system' | 'light' | 'dark'

const KEY = 'theme'

function read(): Theme {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

class ThemeState {
  current = $state<Theme>(read())
  systemDark = $state(matchMedia(DARK_QUERY).matches)

  constructor() {
    // App-lifetime singleton, so the listener is never removed.
    matchMedia(DARK_QUERY).addEventListener('change', (e) => (this.systemDark = e.matches))
  }

  /** The theme actually shown, resolving 'system' against the OS preference. */
  get dark() {
    return this.current === 'dark' || (this.current === 'system' && this.systemDark)
  }

  set(theme: Theme) {
    this.current = theme
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    try {
      if (theme === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, theme)
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts for this page view.
    }
  }
}

export const theme = new ThemeState()
