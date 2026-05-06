import {
  ArrowRight,
  ChevronDown,
  ClipboardPlus,
  FileSearch,
  ShieldUser,
  TimerReset,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

const ACTIONS = [
  {
    id: 'menu-employees',
    icon: ShieldUser,
    titleKey: 'adminOnboarding.panel.employees.title',
    descriptionKey: 'adminOnboarding.panel.employees.description',
    accentClassName: 'from-sky-500/18 via-sky-500/8 to-transparent',
    onClickKey: 'onOpenEmployees',
  },
  {
    id: 'add-employee',
    icon: ClipboardPlus,
    titleKey: 'adminOnboarding.panel.addEmployee.title',
    descriptionKey: 'adminOnboarding.panel.addEmployee.description',
    accentClassName: 'from-emerald-500/18 via-emerald-500/8 to-transparent',
    onClickKey: 'onOpenEmployees',
  },
  {
    id: 'work-schedule',
    icon: TimerReset,
    titleKey: 'adminOnboarding.panel.shifts.title',
    descriptionKey: 'adminOnboarding.panel.shifts.description',
    accentClassName: 'from-violet-500/18 via-violet-500/8 to-transparent',
    onClickKey: 'onOpenShifts',
  },
  {
    id: 'reports',
    icon: FileSearch,
    titleKey: 'adminOnboarding.panel.reports.title',
    descriptionKey: 'adminOnboarding.panel.reports.description',
    accentClassName: 'from-amber-500/18 via-amber-500/8 to-transparent',
    onClickKey: 'onOpenReports',
  },
]

export function AdminOnboardingPanel({
  defaultCollapsed = false,
  onOpenEmployees,
  onOpenReports,
  onOpenShifts,
  onRestartOnboarding,
}) {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  useEffect(() => {
    setIsCollapsed(defaultCollapsed)
  }, [defaultCollapsed])

  const handleRestartOnboarding = () => {
    setIsCollapsed(false)
    onRestartOnboarding?.()
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card/90 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.42)] backdrop-blur-xl">
      <div className="relative isolate px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/14 via-sky-400/10 to-emerald-400/12" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {t('adminOnboarding.panel.eyebrow')}
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                {t('adminOnboarding.panel.title')}
              </h2>
              <p className="max-w-xl text-[13px] leading-5 text-muted-foreground">
                {t('adminOnboarding.panel.subtitle')}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRestartOnboarding}
            className="h-8 border-primary/20 bg-background/80 px-3 text-xs font-medium"
          >
            Ver tour
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          className="mt-3 flex w-full items-center justify-between rounded-2xl border border-border/60 bg-background/65 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground transition hover:border-primary/25 hover:bg-background/80 hover:text-foreground"
          aria-expanded={!isCollapsed}
        >
          <span>{isCollapsed ? 'Expandir' : 'Fechar'}</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !isCollapsed && 'rotate-180')}
          />
        </button>

        <div
          className={cn(
            'grid overflow-hidden transition-all duration-300 ease-out',
            isCollapsed ? 'mt-0 grid-rows-[0fr] opacity-0' : 'mt-5 grid-rows-[1fr] opacity-100',
          )}
        >
          <div className="min-h-0">
            <div className="grid gap-3 p-5 lg:grid-cols-4">
              {ACTIONS.map((action) => {
                const Icon = action.icon
                const handleClick = {
                  onOpenEmployees,
                  onOpenReports,
                  onOpenShifts,
                }[action.onClickKey]

                return (
                  <button
                    key={action.id}
                    type="button"
                    data-tour={action.id}
                    onClick={handleClick}
                    className="group relative overflow-hidden rounded-[24px] border border-border/70 bg-background/85 p-4 text-left shadow-[0_22px_65px_-50px_rgba(15,23,42,0.55)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-background"
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${action.accentClassName} opacity-100 transition duration-200 group-hover:opacity-100`}
                    />
                    <div className="relative flex h-full flex-col gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/50 bg-card/90 text-foreground shadow-sm">
                        <Icon className="h-4.5 w-4.5" />
                      </span>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-[13px] font-semibold text-foreground">
                            {t(action.titleKey)}
                          </h3>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </div>
                        <p className="text-[12px] leading-5 text-muted-foreground">
                          {t(action.descriptionKey)}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
