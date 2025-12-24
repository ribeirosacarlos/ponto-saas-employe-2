import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Bell, FileText, GraduationCap, IdCard, Menu, Search, X } from 'lucide-react'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { getCapabilitiesFromRoles, canRenderCard } from '../auth/acl'
import { DASHBOARD_CARDS } from './dashboardCards'
import { useAbsenceStatus } from '../features/absences/useAbsenceStatus'

export default function Dashboard({
  onOpenHistory,
  onOpenDocuments,
  onOpenVacations,
  onOpenAnnouncements,
  sidebarOpen = false,
  onToggleSidebar = () => {},
}) {
  const roles = useAuthStore((state) => state.roles)
  const { toast } = useToast()
  const { t, i18n } = useTranslation()
  const { isAbsentToday, absenceToday } = useAbsenceStatus()

  const todayLabel = useMemo(() => {
    const label = new Date().toLocaleDateString(i18n.language, { day: '2-digit', month: 'long' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [i18n.language])

  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const update = () => setCurrentTime(new Date())
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const currentTimeLabel = currentTime.toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const formatAbsenceDate = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const absencePeriodLabel = useMemo(() => {
    if (!absenceToday) return ''
    const start = absenceToday.startDate || absenceToday.start_date || absenceToday.date
    const end = absenceToday.endDate || absenceToday.end_date || absenceToday.date
    if (!start && !end) return ''
    if (start && end && start !== end) {
      return `${formatAbsenceDate(start)} - ${formatAbsenceDate(end)}`
    }
    return formatAbsenceDate(start || end)
  }, [absenceToday, i18n.language])

  const absenceTypeLabel =
    absenceToday?.type_label ||
    absenceToday?.typeLabel ||
    absenceToday?.type ||
    absenceToday?.category ||
    absenceToday?.kind ||
    t('dashboardPage.absence.typeFallback', 'Ausencia')

  const absenceComment =
    absenceToday?.comment ||
    absenceToday?.notes ||
    absenceToday?.justification ||
    t('dashboardPage.absence.commentFallback', 'Sem justificativa informada.')

  const documentSections = useMemo(
    () => [
      {
        id: 'payroll',
        title: t('dashboardPage.documents.sections.payroll.title'),
        description: t('dashboardPage.documents.sections.payroll.description'),
        icon: FileText,
        accent: 'emerald',
        items: [
          {
            name: t('dashboardPage.documents.sections.payroll.items.current.name'),
            status: t('dashboardPage.documents.sections.payroll.items.current.status'),
            updatedAt: t('dashboardPage.documents.sections.payroll.items.current.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.payroll.items.current.action'),
          },
          {
            name: t('dashboardPage.documents.sections.payroll.items.previous.name'),
            status: t('dashboardPage.documents.sections.payroll.items.previous.status'),
            updatedAt: t('dashboardPage.documents.sections.payroll.items.previous.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.payroll.items.previous.action'),
          },
        ],
      },
      {
        id: 'courses',
        title: t('dashboardPage.documents.sections.courses.title'),
        description: t('dashboardPage.documents.sections.courses.description'),
        icon: GraduationCap,
        accent: 'indigo',
        items: [
          {
            name: t('dashboardPage.documents.sections.courses.items.onboarding.name'),
            status: t('dashboardPage.documents.sections.courses.items.onboarding.status'),
            updatedAt: t('dashboardPage.documents.sections.courses.items.onboarding.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.courses.items.onboarding.action'),
          },
          {
            name: t('dashboardPage.documents.sections.courses.items.lgpd.name'),
            status: t('dashboardPage.documents.sections.courses.items.lgpd.status'),
            updatedAt: t('dashboardPage.documents.sections.courses.items.lgpd.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.courses.items.lgpd.action'),
          },
        ],
      },
      {
        id: 'personal',
        title: t('dashboardPage.documents.sections.personal.title'),
        description: t('dashboardPage.documents.sections.personal.description'),
        icon: IdCard,
        accent: 'amber',
        items: [
          {
            name: t('dashboardPage.documents.sections.personal.items.address.name'),
            status: t('dashboardPage.documents.sections.personal.items.address.status'),
            updatedAt: t('dashboardPage.documents.sections.personal.items.address.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.personal.items.address.action'),
          },
          {
            name: t('dashboardPage.documents.sections.personal.items.rg.name'),
            status: t('dashboardPage.documents.sections.personal.items.rg.status'),
            updatedAt: t('dashboardPage.documents.sections.personal.items.rg.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.personal.items.rg.action'),
          },
          {
            name: t('dashboardPage.documents.sections.personal.items.workCard.name'),
            status: t('dashboardPage.documents.sections.personal.items.workCard.status'),
            updatedAt: t('dashboardPage.documents.sections.personal.items.workCard.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.personal.items.workCard.action'),
          },
        ],
      },
    ],
    [t],
  )

  const announcements = useMemo(
    () => [
      {
        id: 'hybrid',
        title: t('dashboardPage.announcements.items.hybrid.title'),
        body: t('dashboardPage.announcements.items.hybrid.body'),
        sentAt: t('dashboardPage.announcements.items.hybrid.sentAt'),
        status: 'pending',
      },
      {
        id: 'security',
        title: t('dashboardPage.announcements.items.security.title'),
        body: t('dashboardPage.announcements.items.security.body'),
        sentAt: t('dashboardPage.announcements.items.security.sentAt'),
        status: 'seen',
        viewedAt: t('dashboardPage.announcements.items.security.viewedAt'),
      },
    ],
    [t],
  )

  const timeOffSummary = useMemo(
    () => ({
      availableDays: 12,
      nextVacation: t('dashboardPage.timeOff.nextVacationValue'),
      statusKey: 'approved',
      status: t('dashboardPage.timeOff.statusValue.approved'),
      absences: t('dashboardPage.timeOff.absencesValue', { count: 0 }),
    }),
    [t],
  )

  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const visibleCards = useMemo(
    () => DASHBOARD_CARDS.filter((card) => canRenderCard(capabilities, card.requires)),
    [capabilities],
  )

  const handleViewAllDocuments = () => {
    if (onOpenDocuments) {
      onOpenDocuments()
      return
    }
    toast({
      title: t('dashboardPage.toasts.documents.title'),
      description: t('dashboardPage.toasts.documents.description'),
    })
  }

  const cardProps = {
    timeTracking: { onOpenHistory },
    documents: {
      sections: documentSections,
      onViewAll: handleViewAllDocuments,
      onAction: (item) =>
        toast({
          title: t('dashboardPage.toasts.documentAction.title'),
          description: t('dashboardPage.toasts.documentAction.description', {
            action: item.actionLabel || t('dashboardPage.toasts.documentAction.defaultAction'),
            name: item.name,
          }),
        }),
      maxItemsPerSection: 1,
    },
    timeOff: {
      summary: timeOffSummary,
      onRequest: () =>
        toast({
          title: t('dashboardPage.toasts.vacation.title'),
          description: t('dashboardPage.toasts.vacation.description'),
        }),
      onViewAll: () => {
        if (onOpenVacations) {
          onOpenVacations()
          return
        }
        if (typeof window !== 'undefined') {
          window.location.href = '/vacations'
        }
      },
    },
    announcements: {
      announcements,
      onViewAll: () => {
        if (onOpenAnnouncements) {
          onOpenAnnouncements()
          return
        }
        if (typeof window !== 'undefined') {
          window.location.href = '/announcements'
        }
      },
    },
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border/80 bg-card/90 px-5 py-5 shadow-[0_10px_45px_-30px_rgba(62,82,152,0.35)] backdrop-blur-lg sm:px-7 sm:py-6 lg:px-8 lg:py-5">
          <div className="flex-1 min-w-[220px] max-w-full sm:max-w-lg flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80 md:h-10 md:w-10"
                onClick={onToggleSidebar}
                aria-label={t('dashboardPage.header.toggleMenu')}
                type="button"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <h1 className="text-base font-semibold tracking-tight sm:text-lg md:text-xl">{t('dashboardPage.title')}</h1>
              <span className="inline-flex items-center rounded-full border border-border bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
                {t('dashboardPage.todayPill', { date: todayLabel, time: currentTimeLabel })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('dashboardPage.searchPlaceholder')}
                  className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground sm:h-9 sm:w-9"
              type="button"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        {isAbsentToday ? (
          <section className="rounded-[22px] border border-rose-200/70 bg-rose-500/10 px-5 py-4 shadow-[0_18px_50px_-36px_rgba(244,63,94,0.35)] dark:border-rose-400/30 dark:bg-rose-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-100">
                    {t('dashboardPage.absence.bannerTitle', 'Ausencia registrada para hoje:')}{' '}
                    {absenceTypeLabel}
                  </p>
                  {absencePeriodLabel ? (
                    <p className="text-xs text-rose-600/90 dark:text-rose-100/80">
                      {t('dashboardPage.absence.periodLabel', 'Periodo:')} {absencePeriodLabel}
                    </p>
                  ) : null}
                  <p className="text-xs text-rose-600/90 dark:text-rose-100/80">
                    {t('dashboardPage.absence.reasonLabel', 'Motivo:')} {absenceComment}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-rose-200/70 bg-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600 dark:border-rose-400/30 dark:text-rose-100">
                {t('dashboardPage.absence.badge', 'Bloqueio de ponto ativo')}
              </span>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 auto-rows-fr">
          {visibleCards.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
              {t('dashboardPage.emptyState', 'Nenhum card disponivel para seu perfil.')}
            </div>
          ) : (
            visibleCards.map((card) => {
              const CardComponent = card.component
              const extraProps = cardProps[card.id] || {}
              return <CardComponent key={card.id} {...extraProps} />
            })
          )}
        </div>
      </div>
    </div>
  )
}
