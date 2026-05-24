import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const THEME_STORAGE_KEY = 'ponto-theme'

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  isSystemMode: false,
  resetToSystem: () => {},
})

const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getInitialTheme = (fallback) => {
  if (typeof window === 'undefined') return fallback
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return getSystemTheme()
}

export function ThemeProvider({ children, defaultTheme = 'light' }) {
  const [userPreference, setUserPreference] = useState(() => {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : null
  })
  const [theme, setThemeState] = useState(() => userPreference || getInitialTheme(defaultTheme))

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)

    if (userPreference) {
      window.localStorage.setItem(THEME_STORAGE_KEY, userPreference)
    } else {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
    }
  }, [theme, userPreference])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event) => {
      if (!userPreference) {
        setThemeState(event.matches ? 'dark' : 'light')
      }
    }

    // Align with browser preference when there is no user choice stored.
    if (!userPreference) {
      setThemeState(mediaQuery.matches ? 'dark' : 'light')
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }

    mediaQuery.addListener(handler)
    return () => mediaQuery.removeListener(handler)
  }, [userPreference])

  const applyTheme = useCallback((value) => {
    setUserPreference(value)
    setThemeState(value)
  }, [])

  const resetToSystem = useCallback(() => {
    setUserPreference(null)
    setThemeState(getSystemTheme())
    window.localStorage.removeItem(THEME_STORAGE_KEY)
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme: applyTheme,
      toggleTheme: () => applyTheme(theme === 'dark' ? 'light' : 'dark'),
      isSystemMode: userPreference === null,
      resetToSystem,
    }),
    [applyTheme, theme, userPreference, resetToSystem],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  }
  return ctx
}
