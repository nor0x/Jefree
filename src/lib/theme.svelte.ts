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

class ThemeState {
  current = $state<Theme>(read())

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
