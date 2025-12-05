import { useEffect, useRef, useState } from 'react'
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

const languages = [
  { code: 'pt-BR', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
]

export function LanguageSwitcher({ className }) {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage || i18n.language
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

  const handleChange = (code) => {
    if (current !== code) {
      i18n.changeLanguage(code)
    }
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg border border-border/70 bg-background/80"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('languageSwitcher.ariaLabel')}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Languages className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-lg backdrop-blur-md">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-accent',
                current === lang.code && 'bg-accent/80',
              )}
              onClick={() => handleChange(lang.code)}
              aria-pressed={current === lang.code}
            >
              {lang.label}
              {current === lang.code && <span className="text-primary">•</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
