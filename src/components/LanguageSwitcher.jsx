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
        className="h-10 w-10 rounded-full border border-border/70 bg-card/80 shadow-[0_12px_35px_-28px_rgba(92,134,255,0.55)] hover:-translate-y-0.5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('languageSwitcher.ariaLabel')}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Languages className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-[0_24px_70px_-42px_rgba(92,134,255,0.55)] backdrop-blur-xl">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={cn(
                'flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/80',
                current === lang.code && 'bg-accent/80',
              )}
              onClick={() => handleChange(lang.code)}
              aria-pressed={current === lang.code}
            >
              {lang.label}
              {current === lang.code && (
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary" aria-hidden />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
