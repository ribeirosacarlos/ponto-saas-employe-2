import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Bell,
  Search,
  FileText,
  BookOpen,
  IdCard,
  Archive,
  LayoutDashboard,
} from 'lucide-react'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { getCapabilitiesFromRoles, canRenderCard } from '../auth/acl'
import { DASHBOARD_CARDS } from './dashboardCards'
import { useAbsenceStatus } from '../features/absences/useAbsenceStatus'
import { PageContainer } from '../components/ui/PageContainer'
import { useDateTime } from '../hooks/useDateTime'
import { listMyDocuments, downloadDocument } from '../services/documentsService'
import { getEmployeeVacationBalance } from '../services/vacationsService'
import { listAnnouncements } from '../services/announcementsService'
import { AppTopBar } from '../components/ui/AppTopBar'
import { AdminOnboardingPanel } from '../components/dashboard/AdminOnboardingPanel'

const DOCUMENT_CATEGORIES = {
  payroll: {
    accent: 'emerald',
    icon: FileText,
    fallbackTitle: 'Holerites',
    fallbackDescription: 'Seus contracheques recentes.',
  },
  courses: {
    accent: 'indigo',
    icon: BookOpen,
    fallbackTitle: 'Cursos',
    fallbackDescription: 'Treinamentos e certificações.',
  },
  personal: {
    accent: 'amber',
    icon: IdCard,
    fallbackTitle: 'Pessoais',
    fallbackDescription: 'Documentos pessoais e comprovantes.',
  },
  others: {
    accent: 'slate',
    icon: Archive,
    fallbackTitle: 'Outros',
    fallbackDescription: 'Arquivos enviados recentemente.',
  },
}

export default function Dashboard({
  onOpenHistory,
  onOpenDocuments,
  onOpenVacations,
  onOpenAnnouncements,
  onOpenEmployees,
  onOpenAdminShifts,
  onOpenAdminReports,
  onRestartAdminOnboarding,
}) {
  const roles = useAuthStore((state) => state.roles)
  const { toast } = useToast()
  const { t } = useTranslation()
  const { isAbsentToday, absenceToday } = useAbsenceStatus()
  const { formatDate, formatTime } = useDateTime()

  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const update = () => setCurrentTime(new Date())
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const currentDateLabel = useMemo(() => {
    const rawLabel = formatDate(currentTime, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    if (!rawLabel || rawLabel === '-') return rawLabel

    const parts = rawLabel.split(' ')
    let monthIndex = -1

    if (parts.length >= 5 && parts[1]?.toLowerCase() === 'de') {
      monthIndex = 2
    } else if (parts.length >= 3) {
      monthIndex = 1
    }

    if (monthIndex >= 0 && parts[monthIndex]) {
      const month = parts[monthIndex]
      parts[monthIndex] = `${month.charAt(0).toUpperCase()}${month.slice(1)}`
      return parts.join(' ')
    }

    return rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
  }, [currentTime, formatDate])

  const currentTimeLabel = formatTime(currentTime, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const dateTimeLabel = `${currentDateLabel} • ${currentTimeLabel}`

  const [documentSections, setDocumentSections] = useState([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)
  const [timeOffSummary, setTimeOffSummary] = useState(null)
  const [timeOffLoading, setTimeOffLoading] = useState(false)

  const fallbackAnnouncements = useMemo(
    () => [
      {
        id: 'hybrid-update',
        title: t('dashboardPage.announcements.items.hybrid.title', 'Hybrid work update'),
        body: t(
          'dashboardPage.announcements.items.hybrid.body',
          'Starting next month, teams will alternate office and remote days.',
        ),
        sent_at: '2025-08-12T17:42:00-03:00',
        sender_role: 'admin',
      },
      {
        id: 'security-policy',
        title: t('dashboardPage.announcements.items.security.title', 'Security policy revised'),
        body: t(
          'dashboardPage.announcements.items.security.body',
          'Review the new MFA guidance and update your passwords before the end of the month.',
        ),
        sent_at: '2025-08-10T09:15:00-03:00',
        seen_at: '2025-08-10T10:02:00-03:00',
        sender_role: 'area_manager',
      },
    ],
    [t],
  )

  const mapDocumentsToSections = (docs = []) => {
    const grouped = docs.reduce((acc, doc) => {
      const categoryKey = DOCUMENT_CATEGORIES[doc.category] ? doc.category : 'others'
      if (!acc[categoryKey]) acc[categoryKey] = []
      acc[categoryKey].push(doc)
      return acc
    }, {})

    return Object.entries(DOCUMENT_CATEGORIES)
      .map(([category, config]) => {
        const items = (grouped[category] || []).slice(0, 3).map((doc) => ({
          id: doc.id,
          name: doc.title,
          status: doc.status ? t(`documentsPage.status.${doc.status}`, doc.status) : '',
          updatedAt: doc.updatedAt
            ? formatDate(doc.updatedAt, { day: '2-digit', month: 'short', year: 'numeric' })
            : '',
          actionLabel: t('documentsPage.actions.download', 'Baixar'),
          extension: doc.extension,
        }))

        return {
          id: category,
          title: t(`documentsPage.tabs.${category}`, config.fallbackTitle),
          description: t(
            `dashboardPage.documents.sections.${category}.description`,
            config.fallbackDescription,
          ),
          accent: config.accent,
          icon: config.icon,
          items,
        }
      })
      .filter((section) => section.items.length > 0)
  }

  const loadDocumentsPreview = async () => {
    setDocumentsLoading(true)
    try {
      const { data } = await listMyDocuments({ page: 1 })
      setDocumentSections(mapDocumentsToSections(data))
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('dashboardPage.toasts.documents.error', 'Não foi possível carregar seus documentos.')
      setDocumentSections([])
      toast({
        title: t('dashboardPage.toasts.documents.title', 'Falha ao carregar documentos'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDocumentsLoading(false)
    }
  }

  useEffect(() => {
    loadDocumentsPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatSentAt = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return formatDate(date, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
      ' • ' +
      formatTime(date, { hour: '2-digit', minute: '2-digit' })
  }

  const loadAnnouncementsPreview = async () => {
    setAnnouncementsLoading(true)
    try {
      const data = await listAnnouncements({ fallback: fallbackAnnouncements })
      const sorted = [...data].sort(
        (a, b) => new Date(b.sentAt || b.sent_at).getTime() - new Date(a.sentAt || a.sent_at).getTime(),
      )
      const limited = sorted.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body || item.summary,
        status: item.status || (item.seenAt || item.seen_at ? 'seen' : 'pending'),
        sentAt: formatSentAt(item.sentAt || item.sent_at),
      }))
      setAnnouncements(limited)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('dashboardPage.toasts.announcements.error', 'Não foi possível carregar comunicados.')
      setAnnouncements([])
      toast({
        title: t('dashboardPage.toasts.announcements.title', 'Falha ao carregar comunicados'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncementsPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackAnnouncements])

  const loadTimeOffSummary = async () => {
    setTimeOffLoading(true)
    try {
      const data = await getEmployeeVacationBalance()
      const statusCandidates = [
        data?.status,
        data?.state,
        data?.request_status,
        data?.requestStatus,
        data?.vacation_status,
        data?.vacationStatus,
        data?.last_request?.status,
        data?.lastRequest?.status,
        data?.next_vacation?.status,
        data?.nextVacation?.status,
      ]
      const statusKey = statusCandidates.find(
        (value) => value !== undefined && value !== null && value !== '',
      )
      const statusLabel =
        data?.status_label ??
        data?.statusLabel ??
        data?.request_status_label ??
        data?.requestStatusLabel ??
        data?.vacation_status_label ??
        data?.vacationStatusLabel ??
        null
      setTimeOffSummary({
        availableDays: data?.available ?? data?.balance ?? '--',
        nextVacation: data?.policy?.name || '--',
        absences: data?.used ?? 0,
        statusKey: statusKey ? String(statusKey).toLowerCase() : 'not_requested',
        status: statusLabel || undefined,
      })
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('dashboardPage.toasts.timeOff.error', 'Não foi possível carregar o saldo de férias.')
      setTimeOffSummary(null)
      toast({
        title: t('dashboardPage.toasts.timeOff.title', 'Falha ao carregar férias'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setTimeOffLoading(false)
    }
  }

  useEffect(() => {
    loadTimeOffSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDocumentAction = async (item) => {
    if (!item?.id) return
    try {
      await downloadDocument(item.id, `${item.name || 'documento'}.${item.extension || 'pdf'}`)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('dashboardPage.toasts.documentAction.error', 'Não foi possível baixar o documento.')
      toast({
        title: t('dashboardPage.toasts.documentAction.title', 'Ação não concluída'),
        description: message,
        variant: 'destructive',
      })
    }
  }

  const formatAbsenceDate = (value) => {
    const formatted = formatDate(value, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    return formatted === '-' ? '' : formatted
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
  }, [absenceToday, formatDate])

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

  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const isAdminWorkspace = useMemo(
    () => canRenderCard(capabilities, { anyOf: ['area_manager', 'admin', 'super_admin'] }),
    [capabilities],
  )
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
      sections: documentsLoading ? [] : documentSections,
      onViewAll: handleViewAllDocuments,
      onAction: handleDocumentAction,
      maxItemsPerSection: 2,
    },
    timeOff: {
      summary: timeOffLoading ? null : timeOffSummary,
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
      announcements: announcementsLoading ? [] : announcements,
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
      <PageContainer className="py-5 sm:py-6 space-y-6">
        <AppTopBar
          dataTour="dashboard-header"
          icon={<LayoutDashboard className="h-5 w-5" />}
          meta={dateTimeLabel}
          title={t('dashboardPage.title')}
          filters={
            <div className="flex w-full min-w-0 items-center gap-2">
              <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-muted/70 px-3 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('dashboardPage.searchPlaceholder')}
                  className="h-full w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition hover:bg-background hover:text-foreground"
                type="button"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>
          }
        />

        {isAdminWorkspace ? (
          <AdminOnboardingPanel
            onOpenEmployees={onOpenEmployees}
            onOpenShifts={onOpenAdminShifts}
            onOpenReports={onOpenAdminReports}
            onRestartOnboarding={onRestartAdminOnboarding}
          />
        ) : null}

        {isAbsentToday ? (
          <section className="rounded-[22px] border border-rose-200/70 bg-rose-500/10 px-5 py-4 shadow-[0_18px_50px_-36px_rgba(244,63,94,0.35)] dark:border-rose-400/30 dark:bg-rose-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-sm font-semibold text-rose-700 dark:text-rose-100">
                    {t('dashboardPage.absence.bannerTitle', 'Ausencia registrada para hoje:')}{' '}
                    {absenceTypeLabel}
                  </p>
                  {absencePeriodLabel ? (
                    <p className="break-words text-xs text-rose-600/90 dark:text-rose-100/80">
                      {t('dashboardPage.absence.periodLabel', 'Periodo:')} {absencePeriodLabel}
                    </p>
                  ) : null}
                  <p className="break-words text-xs text-rose-600/90 dark:text-rose-100/80">
                    {t('dashboardPage.absence.reasonLabel', 'Motivo:')} {absenceComment}
                  </p>
                </div>
              </div>
              <span className="inline-flex max-w-full items-center rounded-full border border-rose-200/70 bg-rose-500/15 px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600 break-words dark:border-rose-400/30 dark:text-rose-100">
                {t('dashboardPage.absence.badge', 'Bloqueio de ponto ativo')}
              </span>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 auto-rows-fr">
          {visibleCards.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground break-words">
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
      </PageContainer>
    </div>
  )
}
