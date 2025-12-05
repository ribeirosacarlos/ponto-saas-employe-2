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
      className="rounded-full border border-border/60 bg-background/70"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
