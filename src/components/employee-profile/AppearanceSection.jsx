import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import { Monitor, Moon, Sun } from 'lucide-react'

const THEME_OPTIONS = [
  {
    id: 'light',
    labelKey: 'profilePage.appearance.light',
    defaultLabel: 'Claro',
    icon: Sun,
  },
  {
    id: 'dark',
    labelKey: 'profilePage.appearance.dark',
    defaultLabel: 'Escuro',
    icon: Moon,
  },
  {
    id: 'system',
    labelKey: 'profilePage.appearance.system',
    defaultLabel: 'Sistema',
    icon: Monitor,
  },
]

function ThemeOption({ option, isActive, onClick }) {
  const { t } = useTranslation()
  const Icon = option.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
        isActive
          ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]'
          : 'border-border/60 bg-card/50 hover:border-border hover:bg-muted/40',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full',
          isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className={cn('text-[12px] font-medium', isActive ? 'text-primary' : 'text-foreground')}>
        {t(option.labelKey, { defaultValue: option.defaultLabel })}
      </span>
      {isActive && (
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </button>
  )
}

export function AppearanceSection() {
  const { t } = useTranslation()
  const { theme, setTheme, isSystemMode, resetToSystem } = useTheme()

  const activeOption = isSystemMode ? 'system' : theme

  const handleSelect = (optionId) => {
    if (optionId === 'system') {
      resetToSystem()
    } else {
      setTheme(optionId)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground">
          {t('profilePage.sections.appearance.title', { defaultValue: 'Aparência' })}
        </h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t('profilePage.sections.appearance.description', {
            defaultValue: 'Personalize como o aplicativo se apresenta para você.',
          })}
        </p>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('profilePage.sections.appearance.themeLabel', { defaultValue: 'Tema da interface' })}
        </p>
        <div className="grid grid-cols-3 gap-3 sm:max-w-sm">
          {THEME_OPTIONS.map((option) => (
            <ThemeOption
              key={option.id}
              option={option}
              isActive={activeOption === option.id}
              onClick={() => handleSelect(option.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
