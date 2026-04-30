import { useEffect, useRef, useState } from 'react'
import { History, LogOut, Menu, Moon, SunMedium } from 'lucide-react'
import { Button } from './ui/button'
import { actionMenuItemClass } from './ui/form-controls'
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
        className="border border-border/70 bg-card/80 shadow-[0_12px_35px_-28px_rgba(92,134,255,0.55)] hover:-translate-y-0.5"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Menu className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-[0_24px_70px_-42px_rgba(92,134,255,0.55)] backdrop-blur-xl">
          <button
            className={actionMenuItemClass}
            onClick={() => {
              onHistory?.()
              setOpen(false)
            }}
          >
            <History className="h-4 w-4 text-primary" />
            {t('dashboard.menu.history')}
          </button>
          <button
            className={actionMenuItemClass}
            onClick={() => {
              toggleTheme()
              setOpen(false)
            }}
          >
            {theme === 'dark' ? <SunMedium className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
            {t('dashboard.menu.theme')}
          </button>
          <button
            className={actionMenuItemClass}
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
