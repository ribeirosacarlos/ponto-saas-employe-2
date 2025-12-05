import { useEffect, useRef, useState } from 'react'
import { History, LogOut, Menu, Moon, SunMedium } from 'lucide-react'
import { Button } from './ui/button'
import { useTheme } from '../providers/ThemeProvider'
import { useTranslation } from 'react-i18next'

export function QuickMenu({ onLogout, onHistory }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', listener)
    return () => document.removeEventListener('click', listener)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg border border-border/70 bg-background/80"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Menu className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-lg backdrop-blur-md">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            onClick={() => {
              onHistory?.()
              setOpen(false)
            }}
          >
            <History className="h-4 w-4 text-primary" />
            {t('dashboard.menu.history')}
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            onClick={() => {
              toggleTheme()
              setOpen(false)
            }}
          >
            {theme === 'dark' ? <SunMedium className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
            {t('dashboard.menu.theme')}
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            onClick={() => {
              onLogout?.()
              setOpen(false)
            }}
          >
            <LogOut className="h-4 w-4 text-primary" />
            {t('dashboard.menu.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
