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
import { listAnnouncements } from '../services/announcementsService'
import { AppTopBar } from '../components/ui/AppTopBar'

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
}) {
  const roles = useAuthStore((state) => state.roles)
  const { toast } = useToast()
  const { t } = useTranslation()
  const { isAbsentToday, absenceToday } = useAbsenceStatus()
  const { formatDate, formatTime } = useDateTime()

  const todayLabel = useMemo(() => {
    const label = formatDate(new Date(), { day: '2-digit', month: 'long' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [formatDate])

  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const update = () => setCurrentTime(new Date())
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const currentTimeLabel = formatTime(currentTime, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const [documentSections, setDocumentSections] = useState([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)

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
      summary: null,
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
          icon={<LayoutDashboard className="h-5 w-5" />}
          eyebrow={t('dashboardPage.badges.today')}
          title={t('dashboardPage.title')}
          subtitle={t('dashboardPage.todayPill', { date: todayLabel, time: currentTimeLabel })}
          filters={
            <div className="flex w-full items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('dashboardPage.searchPlaceholder')}
                  className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          }
          rightMeta={
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition hover:bg-background hover:text-foreground"
              type="button"
            >
              <Bell className="h-4 w-4" />
            </button>
          }
        />

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
      </PageContainer>
    </div>
  )
}
