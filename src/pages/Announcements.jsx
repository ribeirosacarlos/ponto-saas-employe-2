import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCircle2, EyeOff, RefreshCcw } from 'lucide-react'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Select } from '../components/ui/select'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import {
  getAnnouncement,
  listAnnouncements,
  markAnnouncementSeen,
} from '../services/announcementsService'
import { actionTabButtonClass } from '../components/ui/form-controls'

const STATUS_STYLES = {
  seen: {
    tone: 'border-emerald-200/80 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/15 dark:text-emerald-100',
    icon: CheckCircle2,
  },
  pending: {
    tone: 'border-amber-200/80 bg-amber-500/12 text-amber-700 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-100',
    icon: EyeOff,
  },
}

const FILTER_TABS = ['all', 'pending', 'seen']
const SORT_OPTIONS = [{ value: 'recent', labelKey: 'announcementsPage.sort.recent' }]

const buildFallbackAnnouncements = (t) => [
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
]

const parseDateParts = (value, locale) => {
  if (!value) return { date: '', time: '', invalid: false }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { date: String(value), time: '', invalid: true }
  }

  return {
    date: date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }),
    invalid: false,
  }
}

const getSortValue = (value) => {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? 0 : ts
}

export default function Announcements() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const fallbackAnnouncements = useMemo(() => buildFallbackAnnouncements(t), [t])
  const [announcements, setAnnouncements] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [sort, setSort] = useState('recent')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [confirmingId, setConfirmingId] = useState('')

  const pendingCount = useMemo(
    () => announcements.filter((announcement) => !announcement.seenAt && announcement.status !== 'seen').length,
    [announcements],
  )

  const seenCount = announcements.length - pendingCount

  const formatSender = useCallback(
    (announcement) => {
      if (announcement?.senderName) return announcement.senderName
      const role = String(announcement?.senderRole || '').toLowerCase()
      if (role.includes('area')) return t('announcementsPage.sender.areaManager')
      if (role.includes('admin')) return t('announcementsPage.sender.admin')
      return t('announcementsPage.sender.default')
    },
    [t],
  )

  const formatSentLabel = useCallback(
    (value) => {
      const { date, time, invalid } = parseDateParts(value, i18n.language)
      if (!date) return t('announcementsPage.labels.sentAtFallback')
      if (invalid) return date
      if (!time) return t('announcementsPage.labels.sentAtDateOnly', { date })
      return t('announcementsPage.labels.sentAt', { date, time })
    },
    [i18n.language, t],
  )

  const formatSeenLabel = useCallback(
    (value) => {
      const { date, time, invalid } = parseDateParts(value, i18n.language)
      if (!date) return t('announcementsPage.status.seen')
      if (invalid) return `${t('announcementsPage.status.seen')} ${date}`
      if (!time) return t('announcementsPage.status.seenAtDateOnly', { date })
      return t('announcementsPage.status.seenAt', { date, time })
    },
    [i18n.language, t],
  )

  const loadAnnouncements = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listAnnouncements({ fallback: fallbackAnnouncements })
      setAnnouncements(data)
    } catch (err) {
      console.error('[Announcements] Failed to load announcements', err)
      setError(t('announcementsPage.states.error'))
    } finally {
      setLoading(false)
    }
  }, [fallbackAnnouncements, t])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const sortedAnnouncements = useMemo(() => {
    const items = [...announcements]
    if (sort === 'recent') {
      items.sort((a, b) => getSortValue(b.sentAt) - getSortValue(a.sentAt))
    }
    return items
  }, [announcements, sort])

  const filteredAnnouncements = useMemo(() => {
    if (activeTab === 'pending') {
      return sortedAnnouncements.filter((announcement) => !announcement.seenAt && announcement.status !== 'seen')
    }
    if (activeTab === 'seen') {
      return sortedAnnouncements.filter((announcement) => announcement.seenAt || announcement.status === 'seen')
    }
    return sortedAnnouncements
  }, [activeTab, sortedAnnouncements])

  const handleOpenAnnouncement = useCallback(
    async (announcement) => {
      setSelectedAnnouncement(announcement)
      setDetailError('')
      setDialogOpen(true)

      if (!announcement?.body && announcement?.id) {
        setDetailLoading(true)
        try {
          const detail = await getAnnouncement(announcement.id, { fallback: fallbackAnnouncements })
          if (detail) {
            setSelectedAnnouncement((prev) => {
              if (!prev) return detail
              const keepSeen = prev.seenAt || prev.status === 'seen'
              return {
                ...prev,
                ...detail,
                status: keepSeen ? 'seen' : prev.status,
                seenAt: keepSeen ? detail.seenAt || prev.seenAt : prev.seenAt,
              }
            })
          }
        } catch (err) {
          console.error('[Announcements] Failed to load announcement detail', err)
          setDetailError(t('announcementsPage.states.detailError'))
        } finally {
          setDetailLoading(false)
        }
      }
    },
    [fallbackAnnouncements, t],
  )

  const handleDialogChange = (open) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedAnnouncement(null)
      setDetailError('')
    }
  }

  const handleConfirmSeen = useCallback(async () => {
    if (!selectedAnnouncement?.id) return
    setConfirmingId(selectedAnnouncement.id)
    try {
      const response = await markAnnouncementSeen(selectedAnnouncement.id)
      let seenAt =
        response?.seen_at ??
        response?.seenAt ??
        response?.viewed_at ??
        response?.viewedAt ??
        response?.read_at ??
        response?.readAt ??
        response?.data?.seen_at ??
        response?.data?.seenAt

      if (!seenAt) {
        // TODO: remove local timestamp when backend returns seen_at.
        seenAt = new Date().toISOString()
      }

      setAnnouncements((prev) =>
        prev.map((item) =>
          String(item.id) === String(selectedAnnouncement.id)
            ? { ...item, seenAt, status: 'seen' }
            : item,
        ),
      )
      setSelectedAnnouncement((prev) => (prev ? { ...prev, seenAt, status: 'seen' } : prev))
    } catch (err) {
      console.error('[Announcements] Failed to confirm announcement view', err)
      toast({
        title: t('announcementsPage.toasts.markError.title'),
        description: t('announcementsPage.toasts.markError.description'),
      })
    } finally {
      setConfirmingId('')
    }
  }, [selectedAnnouncement, t, toast])

  const renderStatusPill = (announcement) => {
    const isSeen = announcement?.seenAt || announcement?.status === 'seen'
    const statusKey = isSeen ? 'seen' : 'pending'
    const tone = STATUS_STYLES[statusKey] || STATUS_STYLES.pending
    const Icon = tone.icon
    const statusLabel = isSeen
      ? formatSeenLabel(announcement.seenAt)
      : t('announcementsPage.status.pending')

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow-[0_10px_25px_-18px_rgba(62,82,152,0.45)]',
          tone.tone,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {statusLabel}
      </span>
    )
  }

  return (
    <div className="relative min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="relative z-10 flex flex-col gap-6 py-6">
        <AppTopBar
          icon={<Bell className="h-5 w-5" />}
          eyebrow={t('announcementsPage.tag')}
          title={t('announcementsPage.title')}
          subtitle={t('announcementsPage.subtitle')}
          filters={
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                {t('announcementsPage.helper.updated')}
              </span>
              <span className="rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-[11px] text-amber-700">
                {t('announcementsPage.helper.pendingBadge', { count: pendingCount })}
              </span>
            </div>
          }
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={loadAnnouncements}
              className="rounded-full border-border bg-background/80 px-3 text-sm"
            >
              <RefreshCcw className="mr-2 h-4 w-4 text-primary" />
              {t('announcementsPage.actions.refresh')}
            </Button>
          }
        />

        <section className="rounded-[24px] border border-border/80 bg-card/90 p-4 shadow-[0_25px_80px_-60px_rgba(62,82,152,0.55)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {t('announcementsPage.filters.title')}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t('announcementsPage.filters.subtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t('announcementsPage.sort.label')}
                </span>
                <Select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="w-auto rounded-full px-3 font-semibold"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {FILTER_TABS.map((tab) => {
                const label = t(`announcementsPage.filters.tabs.${tab}`)
                const count =
                  tab === 'all' ? announcements.length : tab === 'pending' ? pendingCount : seenCount
                return (
                  <button
                    key={tab}
                    type="button"
                    className={cn(
                      actionTabButtonClass,
                      'border',
                      activeTab === tab
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 bg-background/60 text-muted-foreground hover:border-border/80',
                    )}
                    onClick={() => setActiveTab(tab)}
                  >
                    {label} ({count})
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`announcement-skeleton-${index}`}
                  className="animate-pulse rounded-[22px] border border-border/70 bg-card/80 px-4 py-4 shadow-[0_18px_40px_-30px_rgba(62,82,152,0.35)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-3">
                      <div className="h-3 w-1/2 rounded-full bg-muted/80" />
                      <div className="h-3 w-full rounded-full bg-muted/70" />
                      <div className="h-3 w-2/3 rounded-full bg-muted/60" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-muted/70" />
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="rounded-[22px] border border-rose-200/70 bg-rose-50/70 px-4 py-6 text-sm text-rose-700 shadow-[0_18px_40px_-30px_rgba(244,63,94,0.35)]">
                <p className="font-semibold">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadAnnouncements}
                  className="mt-3 rounded-full border-rose-200 bg-white/80 px-4 text-rose-700"
                >
                  {t('announcementsPage.actions.retry')}
                </Button>
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="rounded-[22px] border border-border/70 bg-card/90 px-6 py-8 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-30px_rgba(62,82,152,0.35)]">
                {activeTab === 'pending'
                  ? t('announcementsPage.states.emptyPending')
                  : t('announcementsPage.states.empty')}
              </div>
            ) : (
              filteredAnnouncements.map((announcement) => (
                <button
                  key={announcement.id}
                  type="button"
                  onClick={() => handleOpenAnnouncement(announcement)}
                  className="w-full text-left rounded-[22px] border border-border/70 bg-card/90 px-4 py-4 shadow-[0_18px_40px_-30px_rgba(62,82,152,0.35)] transition hover:bg-muted/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{announcement.title}</p>
                        {renderStatusPill(announcement)}
                      </div>
                      <p className="text-[12px] leading-relaxed text-muted-foreground">
                        {announcement.summary || announcement.body}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{t('announcementsPage.labels.sender', { sender: formatSender(announcement) })}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{formatSentLabel(announcement.sentAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </section>
      </PageContainer>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAnnouncement?.title || t('announcementsPage.modal.title')}
            </DialogTitle>
            <DialogDescription>{t('announcementsPage.modal.description')}</DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {selectedAnnouncement ? renderStatusPill(selectedAnnouncement) : null}
            <span>
              {selectedAnnouncement
                ? t('announcementsPage.labels.sender', { sender: formatSender(selectedAnnouncement) })
                : null}
            </span>
            {selectedAnnouncement ? <span className="text-muted-foreground/50">•</span> : null}
            <span>
              {selectedAnnouncement ? formatSentLabel(selectedAnnouncement.sentAt) : null}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-foreground">
            {detailLoading ? (
              <div className="space-y-3">
                <div className="h-3 w-3/4 rounded-full bg-muted/70" />
                <div className="h-3 w-full rounded-full bg-muted/60" />
                <div className="h-3 w-2/3 rounded-full bg-muted/60" />
              </div>
            ) : (
              <p className="whitespace-pre-line">
                {selectedAnnouncement?.body || selectedAnnouncement?.summary || ''}
              </p>
            )}
            {detailError ? <p className="text-sm text-rose-600">{detailError}</p> : null}
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.actions.close')}
              </Button>
            </DialogClose>
            {selectedAnnouncement && !(selectedAnnouncement.seenAt || selectedAnnouncement.status === 'seen') ? (
              <Button
                type="button"
                onClick={handleConfirmSeen}
                disabled={confirmingId === selectedAnnouncement.id || detailLoading}
              >
                {confirmingId === selectedAnnouncement.id
                  ? t('announcementsPage.actions.confirming')
                  : t('announcementsPage.actions.confirm')}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

