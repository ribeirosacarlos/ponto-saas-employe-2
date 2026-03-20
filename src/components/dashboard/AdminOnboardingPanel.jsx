import {
  ArrowRight,
  ClipboardPlus,
  FileSearch,
  RefreshCcw,
  ShieldUser,
  TimerReset,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

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
  onOpenEmployees,
  onOpenReports,
  onOpenShifts,
  onRestartOnboarding,
}) {
  const { t } = useTranslation()

  return (
    <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card/90 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.42)] backdrop-blur-xl">
      <div className="relative isolate px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/14 via-sky-400/10 to-emerald-400/12" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              {t('adminOnboarding.panel.eyebrow')}
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                {t('adminOnboarding.panel.title')}
              </h2>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                {t('adminOnboarding.panel.subtitle')}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRestartOnboarding}
            className="border-primary/20 bg-background/80"
          >
            <RefreshCcw className="h-4 w-4" />
            {t('adminOnboarding.panel.restart')}
          </Button>
        </div>

        <div className="mt-5 p-5 grid gap-3 lg:grid-cols-4">
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
                <div className="relative flex h-full flex-col gap-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/50 bg-card/90 text-foreground shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t(action.titleKey)}
                      </h3>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {t(action.descriptionKey)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
