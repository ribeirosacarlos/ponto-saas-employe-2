import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../providers/ThemeProvider'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={toggleTheme}
      aria-label={t('themeToggle.ariaLabel')}
      className={cn(
        'h-10 w-10 rounded-full border border-border/70 bg-card/80 shadow-[0_12px_35px_-28px_rgba(92,134,255,0.55)] hover:-translate-y-0.5',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
