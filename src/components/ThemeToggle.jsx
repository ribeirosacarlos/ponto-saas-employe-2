import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { useTheme } from '../providers/ThemeProvider'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={t('themeToggle.ariaLabel')}
      className="rounded-full border border-border/70 bg-card/70 shadow-[0_12px_35px_-28px_rgba(92,134,255,0.55)] hover:-translate-y-0.5"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
