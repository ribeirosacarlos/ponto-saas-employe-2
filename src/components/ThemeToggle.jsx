import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../providers/ThemeProvider'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark'
  const label = isDark ? t('themeToggle.darkLabel') : t('themeToggle.lightLabel')

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={toggleTheme}
      aria-label={t('themeToggle.ariaLabel')}
      className={cn(
        'flex h-10 w-full max-w-[220px] items-center rounded-2xl border border-border/70 bg-background/80 px-3 text-[11px] font-semibold text-foreground shadow-[0_10px_30px_-22px_rgba(62,82,152,0.55)] transition-all hover:bg-background',
        className,
      )}
    >
      <div
        className={cn(
          'flex w-full items-center justify-between gap-2',
          isDark ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)] transition-colors">
          {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </span>
      </div>
    </Button>
  )
}
