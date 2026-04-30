import { useEffect, useRef, useState } from 'react'
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { actionMenuItemClass } from './ui/form-controls'
import { cn } from '../lib/utils'

const languages = [
  { code: 'pt-BR', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
]

export function LanguageSwitcher({ className, iconOnly = false }) {
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

  const currentLang = languages.find((lang) => lang.code === current) || languages[0]

  return (
    <div className={cn('relative', className)} ref={ref}>
      <Button
        variant="ghost"
        className={cn(
          'items-center border border-border/70 bg-background/80 text-foreground shadow-[0_10px_30px_-22px_rgba(62,82,152,0.55)] transition-all hover:bg-background',
          iconOnly
            ? 'w-8 justify-center px-0'
            : 'w-full max-w-[220px] justify-between px-3',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('languageSwitcher.ariaLabel')} (${currentLang.label})`}
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        {!iconOnly && <span>{currentLang.label}</span>}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)]">
          <Languages className="h-3.5 w-3.5" />
        </span>
      </Button>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-[0_24px_70px_-42px_rgba(92,134,255,0.55)] backdrop-blur-xl',
            iconOnly ? 'left-0 w-48' : 'right-0 w-44',
          )}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={cn(
                actionMenuItemClass,
                'justify-between',
                current === lang.code && 'bg-accent/80',
              )}
              onClick={() => handleChange(lang.code)}
              aria-pressed={current === lang.code}
              type="button"
            >
              {lang.label}
              {current === lang.code && (
                <span
                  className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary"
                  aria-hidden
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
