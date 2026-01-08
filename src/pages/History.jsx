import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CalendarDays,
  Download,
  Filter,
  FileText,
  History as HistoryIcon,
  RefreshCcw,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/use-toast'
import { getEmployeeEntries, requestAdjustment } from '../lib/api'
import { exportEntriesToCSV } from '../lib/exportEntries'
import { EntryAdjustmentModal } from '../components/EntryAdjustmentModal'
import { useAuthStore } from '../store/useAuth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PageContainer } from '../components/ui/PageContainer'

const PAGE_SIZE = 20

function normalizeEntry(entry, t) {
  const clock = entry.clocked_at || entry.clockedAt || entry.date || entry.timestamp || entry.created_at

  return {
    ...entry,
    id: entry.id || entry.uuid || `${clock || 'entry'}-${Math.random().toString(36).slice(2)}`,
    clockedAt: clock,
    type: entry.type || entry.kind || entry.event_type || entry.status,
    status: entry.status || entry.state || entry.situation,
    notes: entry.notes || entry.observations || entry.reason || entry.comment || '',
    source: entry.source || entry.origin || entry.channel || t('common.sourceFallback'),
    badges: entry.badges || entry.flags || [],
  }
}

function formatDuration(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minutes = String(totalMinutes % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}

function calculateDayDuration(entries = [], alreadySorted = false) {
  const sorted = alreadySorted
    ? entries
    : [...entries].sort((a, b) => {
        const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
        const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
        return left - right
      })

  let totalMs = 0
  let lastIn = null

  sorted.forEach((entry) => {
    if (!entry.clockedAt) return
    const ts = new Date(entry.clockedAt).getTime()
    const type = entry.type
    if (type === 'in' || type === 'break_end') {
      lastIn = ts
    }
    if ((type === 'out' || type === 'break_start') && lastIn) {
      totalMs += ts - lastIn
      lastIn = null
    }
  })

  return Math.max(0, Math.round(totalMs / 60000))
}

function calculateBreakDuration(entries = []) {
  let totalMs = 0
  let breakStart = null

  entries.forEach((entry) => {
    if (!entry.clockedAt) return
    const ts = new Date(entry.clockedAt).getTime()
    if (entry.type === 'break_start') {
      breakStart = ts
      return
    }
    if (entry.type === 'break_end' && breakStart) {
      totalMs += Math.max(0, ts - breakStart)
      breakStart = null
    }
  })

  const minutes = Math.max(0, Math.round(totalMs / 60000))
  return { minutes, hasBreak: minutes > 0 }
}

function summarizeDay(entries = []) {
  const sorted = [...entries].sort((a, b) => {
    const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
    const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
    return left - right
  })

  const entryRecord =
    sorted.find((entry) => entry.type === 'in' || entry.type === 'break_end') || sorted[0]
  const exitRecord =
    [...sorted]
      .reverse()
      .find((entry) => entry.type === 'out' || entry.type === 'break_start') || sorted[sorted.length - 1]

  const entryAt = entryRecord?.clockedAt ? new Date(entryRecord.clockedAt) : null
  const exitAt = exitRecord?.clockedAt ? new Date(exitRecord.clockedAt) : null
  const { minutes: breakMinutes, hasBreak } = calculateBreakDuration(sorted)
  const workMinutes = calculateDayDuration(sorted, true)
  const spanMinutes =
    entryAt && exitAt
      ? Math.max(0, Math.round((exitAt.getTime() - entryAt.getTime()) / 60000))
      : null
  const idleMinutes = spanMinutes !== null ? Math.max(0, spanMinutes - workMinutes) : null

  return {
    entryAt,
    exitAt,
    breakMinutes,
    hasBreak,
    workMinutes,
    idleMinutes,
  }
}

export default function History({ onBackToDashboard }) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)

  const [filters, setFilters] = useState({ from: '', to: '' })
  const [appliedFilters, setAppliedFilters] = useState({ from: '', to: '' })
  const [entries, setEntries] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [localPage, setLocalPage] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [submittingAdjustment, setSubmittingAdjustment] = useState('')

  const supportsServerPagination = useMemo(() => {
    if (!meta) return false
    return Boolean(
      meta?.lastPage ||
        meta?.last_page ||
        meta?.total ||
        meta?.next_page_url ||
        meta?.per_page ||
        meta?.perPage,
    )
  }, [meta])

  const monthOptions = useMemo(() => {
    const options = []
    const today = new Date()
    for (let offset = 0; offset < 3; offset += 1) {
      const target = subMonths(today, offset)
      const start = startOfMonth(target)
      const end = endOfMonth(target)
      const monthLabel = target.toLocaleDateString(i18n.language, {
        month: 'long',
        year: 'numeric',
      })
      const caption = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
      options.push({
        id: `${format(start, 'yyyy-MM')}`,
        label: caption,
        from: format(start, 'yyyy-MM-dd'),
        to: format(end, 'yyyy-MM-dd'),
      })
    }
    return options
  }, [i18n.language])

  useEffect(() => {
    if (!monthOptions.length) return
    setSelectedMonth((prev) => {
      const match = prev && monthOptions.find((option) => option.id === prev.id)
      return match || monthOptions[0]
    })
  }, [monthOptions])

  useEffect(() => {
    if (!selectedMonth) return
    setFilters({ from: selectedMonth.from, to: selectedMonth.to })
  }, [selectedMonth])

  useEffect(() => {
    if (!selectedMonth) return
    if (!appliedFilters.from && !appliedFilters.to) {
      setAppliedFilters({ from: selectedMonth.from, to: selectedMonth.to })
    }
  }, [selectedMonth, appliedFilters])

  const handleFetch = useCallback(
    async ({ page = 1, append = false, filters: filtersOverride } = {}) => {
      setError('')
      if (append) setLoadingMore(true)
      else setLoading(true)

      try {
        const activeFilters = filtersOverride || appliedFilters
        const { data, meta: responseMeta } = await getEmployeeEntries({
          from: activeFilters.from || undefined,
          to: activeFilters.to || undefined,
          page,
          perPage: PAGE_SIZE,
        })

        const normalized = (data || []).map((item) => normalizeEntry(item, t))
        setEntries((prev) => (append ? [...prev, ...normalized] : normalized))
        setMeta(responseMeta || null)
        setCurrentPage(page)
        if (!append) setLocalPage(1)
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.message ||
          t('historyPage.states.errorDescription')
        setError(message)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [appliedFilters, t],
  )

  useEffect(() => {
    handleFetch({ page: 1 })
  }, [handleFetch])

  const filteredEntries = useMemo(() => {
    const { from, to } = appliedFilters
    const fromDate = from ? parseISO(from) : null
    const toDate = to ? parseISO(to) : null

    return entries
      .filter((entry) => {
        if (!entry.clockedAt) return true
        const dateValue = new Date(entry.clockedAt)
        if (fromDate && isBefore(dateValue, fromDate)) return false
        if (toDate && isAfter(dateValue, toDate)) return false
        return true
      })
      .sort((a, b) => {
        const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
        const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
        return right - left
      })
  }, [appliedFilters, entries])

  const paginatedEntries = useMemo(() => {
    if (supportsServerPagination) return filteredEntries
    return filteredEntries.slice(0, localPage * PAGE_SIZE)
  }, [filteredEntries, localPage, supportsServerPagination])

  const groupedEntries = useMemo(() => {
    const groups = paginatedEntries.reduce((acc, entry) => {
      const key = entry.clockedAt ? format(new Date(entry.clockedAt), 'yyyy-MM-dd') : 'unknown'
      acc[key] = acc[key] ? [...acc[key], entry] : [entry]
      return acc
    }, {})

    return Object.entries(groups)
      .map(([dateKey, items]) => {
        const sortedItems = [...items].sort((a, b) => {
          const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
          const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
          return left - right
        })
        const summary = summarizeDay(sortedItems)
        return {
          dateKey,
          items: sortedItems,
          duration: summary.workMinutes,
          summary,
        }
      })
      .sort((a, b) => {
        const aTs = new Date(a.dateKey).getTime()
        const bTs = new Date(b.dateKey).getTime()
        return (isNaN(bTs) ? 0 : bTs) - (isNaN(aTs) ? 0 : aTs)
      })
  }, [paginatedEntries])

  const hasMore = useMemo(() => {
    if (supportsServerPagination) {
      const total = meta?.total
      const lastPage = meta?.lastPage || meta?.last_page
      if (lastPage) return currentPage < lastPage
      if (total) return entries.length < total
      return Boolean(meta?.next_page_url || meta?.has_more)
    }
    return paginatedEntries.length < filteredEntries.length
  }, [currentPage, entries.length, filteredEntries.length, meta, paginatedEntries.length, supportsServerPagination])

  const handleLoadMore = async () => {
    if (supportsServerPagination) {
      const nextPage = (currentPage || 1) + 1
      await handleFetch({ page: nextPage, append: true })
      return
    }
    setLocalPage((prev) => prev + 1)
  }

  const handleApplyFilters = async () => {
    const nextFilters = { ...filters }
    setAppliedFilters(nextFilters)
    await handleFetch({ page: 1, filters: nextFilters })
  }

  const handleClearFilters = async () => {
    if (!monthOptions.length) return
    const defaultOption = monthOptions[0]
    setSelectedMonth(defaultOption)
    setFilters({ from: defaultOption.from, to: defaultOption.to })
    setAppliedFilters({ from: defaultOption.from, to: defaultOption.to })
  }

  const handleExport = () => {
    if (!paginatedEntries.length) {
      toast({
        title: t('historyPage.export.emptyTitle'),
        description: t('historyPage.export.emptyDescription'),
      })
      return
    }

    const fromLabel = appliedFilters.from || 'todos'
    const toLabel = appliedFilters.to || 'todos'
    const filename = `historial_marcaciones_${fromLabel}_${toLabel}.csv`
    exportEntriesToCSV(paginatedEntries, filename)

    toast({
      title: t('historyPage.export.successTitle'),
      description: t('historyPage.export.successDescription', { count: paginatedEntries.length }),
      variant: 'success',
    })
  }

  const handleAdjustment = async (payload, closeModal, resetForm) => {
    const idKey = payload.entry_id || payload.original_time || payload.date || ''
    setSubmittingAdjustment(idKey)
    try {
      await requestAdjustment(payload)
      toast({
        title: t('toast.adjustmentSuccess.title'),
        description: t('toast.adjustmentSuccess.description'),
        variant: 'success',
      })
      closeModal?.()
      resetForm?.()
    } catch (err) {
      toast({
        title: t('historyPage.adjustment.errorTitle'),
        description:
          err.response?.data?.message || err.message || t('historyPage.adjustment.errorDescription'),
        variant: 'error',
      })
    } finally {
      setSubmittingAdjustment('')
    }
  }

  const handleExportPDF = () => {
    if (!groupedEntries.length) {
      toast({
        title: t('historyPage.export.emptyTitle'),
        description: t('historyPage.export.emptyDescription'),
      })
      return
    }

    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
    })
    const getDateLabel = (value) =>
      value ? new Date(value).toLocaleDateString(i18n.language) : t('historyPage.pdf.allDates')

    const periodRange = `${getDateLabel(appliedFilters.from)} - ${getDateLabel(appliedFilters.to)}`

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(t('historyPage.pdf.title'), 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(t('historyPage.pdf.periodLabel', { range: periodRange }), 14, 28)
    doc.setFontSize(11)
    doc.text(t('historyPage.pdf.employerData'), 14, 36)
    doc.setFontSize(10)
    const collaboratorName = user?.name || t('historyPage.pdf.notAvailable')
    const collaboratorEmail = user?.email || t('historyPage.pdf.notAvailable')
    const collaboratorCpf = user?.cpf || t('historyPage.pdf.notAvailable')
    doc.text(`${t('historyPage.pdf.labels.name')}: ${collaboratorName}`, 14, 44)
    doc.text(`${t('historyPage.pdf.labels.email')}: ${collaboratorEmail}`, 110, 44)
    doc.text(t('historyPage.pdf.collaboratorData'), 14, 54)
    doc.text(`${t('historyPage.pdf.labels.cpf')}: ${collaboratorCpf}`, 14, 60)
    doc.text(`${t('historyPage.pdf.labels.employer')}: ${t('historyPage.pdf.notAvailable')}`, 110, 60)

    const body = groupedEntries.map((group) => {
      const { summary } = group
      const entryLabel = summary?.entryAt
        ? format(summary.entryAt, 'HH:mm')
        : t('historyPage.labels.timeFallback')
      const exitLabel = summary?.exitAt
        ? format(summary.exitAt, 'HH:mm')
        : t('historyPage.labels.timeFallback')
      const intervalLabel = summary?.hasBreak
        ? formatDuration(summary.breakMinutes)
        : t('historyPage.labels.timeFallback')
      const workedLabel = group.duration
        ? formatDuration(group.duration)
        : t('historyPage.labels.noDuration')
      const idleLabel =
        typeof summary?.idleMinutes === 'number'
          ? formatDuration(summary.idleMinutes)
          : t('historyPage.labels.timeFallback')

      return [
        formatDateLabel(group.dateKey),
        entryLabel,
        intervalLabel,
        exitLabel,
        workedLabel,
        idleLabel,
      ]
    })

    const totalWorkedMinutes = groupedEntries.reduce((sum, group) => sum + (group.duration || 0), 0)
    const totalIdleMinutes = groupedEntries.reduce(
      (sum, group) => sum + (group.summary?.idleMinutes || 0),
      0,
    )

    autoTable(doc, {
      startY: 72,
      head: [
        [
          t('historyPage.table.headers.date'),
          t('historyPage.table.headers.entry'),
          t('historyPage.table.headers.interval'),
          t('historyPage.table.headers.exit'),
          t('historyPage.table.headers.worked'),
          t('historyPage.table.headers.idle'),
        ],
      ],
      body,
      foot: [
        [
          t('historyPage.pdf.totalLabel'),
          '',
          '',
          '',
          formatDuration(totalWorkedMinutes),
          formatDuration(totalIdleMinutes),
        ],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: '#f2f2f2' },
      theme: 'grid',
    })

    doc.save('folha-de-ponto.pdf')
  }

  const formatDateLabel = (dateKey) => {
    if (dateKey === 'unknown') return t('historyPage.labels.unknownDate')
    const label = new Date(dateKey).toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-8%] top-[-10%] h-64 w-64 rounded-full bg-primary/12 blur-[110px]" />
        <div className="absolute right-[-12%] top-[12%] h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute bottom-[-18%] left-[20%] h-72 w-72 rounded-full bg-indigo-300/16 blur-[120px] dark:bg-indigo-500/14" />
      </div>

      <PageContainer className="relative z-10 py-6 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[24px] border border-border/80 bg-card/95 px-4 py-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.45)] backdrop-blur-xl sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/20">
              <HistoryIcon className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {t('historyPage.badge')}
                </span>
              </div>
              <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
                {t('historyPage.title')}
              </h1>
              <p className="text-sm text-muted-foreground">{t('historyPage.subtitle')}</p>
            </div>
          </div>

          <div
            className="
              -mx-4 px-4
              flex items-center gap-2
              overflow-x-auto
              whitespace-nowrap
              sm:mx-0 sm:px-0
              sm:justify-end
              scrollbar-hide
            "
          >
            <EntryAdjustmentModal
              onSubmit={handleAdjustment}
              isSubmitting={Boolean(submittingAdjustment)}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-border bg-background/80 px-3 text-sm"
                >
                  {t('historyPage.adjustment.cta')}
                </Button>
              }
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-border bg-background/80 px-3 text-sm"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4 text-primary" />
              {t('historyPage.export.label')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-border bg-background/80 px-3 text-sm"
              onClick={handleExportPDF}
            >
              <FileText className="mr-2 h-4 w-4 text-primary" />
              {t('historyPage.export.pdfLabel')}
            </Button>
          </div>
        </header>

        <div class="mt-5 grid gap-5 lg:grid-cols-[320px_1fr] min-w-0">
          <section className="space-y-4 min-w-0">
            <div className="rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[0_20px_60px_-48px_rgba(62,82,152,0.35)]">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Filter className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t('historyPage.filters.title')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('historyPage.filters.description')}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="history-month-selector">
                    {t('historyPage.filters.month')}
                  </label>
                  <div className="relative">
                    <select
                      id="history-month-selector"
                      value={selectedMonth?.id ?? ''}
                      onChange={(event) => {
                        const option = monthOptions.find((item) => item.id === event.target.value)
                        if (option) {
                          setSelectedMonth(option)
                        }
                      }}
                      className="w-full rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                    >
                      {monthOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    className="rounded-full px-4 text-sm"
                    onClick={handleApplyFilters}
                    disabled={loading}
                  >
                    {t('historyPage.filters.apply')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full px-4 text-sm"
                    onClick={handleClearFilters}
                    disabled={loading}
                  >
                    {t('historyPage.filters.clear')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/60 p-4 text-xs text-muted-foreground shadow-[0_10px_40px_-36px_rgba(62,82,152,0.45)]">
              <p className="font-semibold text-foreground">{t('historyPage.helper.title')}</p>
              <p className="mt-1 leading-relaxed">{t('historyPage.helper.description')}</p>
            </div>
          </section>

          <section className="space-y-4 min-w-0">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                  />
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 shadow-[0_18px_50px_-38px_rgba(255,82,82,0.25)] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold">{t('historyPage.states.errorTitle')}</p>
                  <p>{error}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3 text-xs"
                    onClick={() => handleFetch({ page: 1 })}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t('historyPage.states.retry')}
                  </Button>
                </div>
              </div>
            ) : null}

            {!loading && !error && groupedEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground shadow-[0_18px_50px_-40px_rgba(62,82,152,0.35)]">
                <p className="font-semibold text-foreground">{t('historyPage.states.emptyTitle')}</p>
                <p className="mt-1">{t('historyPage.states.emptyDescription')}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" className="rounded-full px-4" onClick={handleClearFilters}>
                    {t('historyPage.filters.clear')}
                  </Button>
                  {onBackToDashboard ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full px-4"
                      onClick={onBackToDashboard}
                    >
                      {t('historyPage.actions.back')}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!loading && !error && groupedEntries.length > 0 && (
              <div className="rounded-3xl border border-border/80 bg-card/95 p-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{t('historyPage.table.title')}</p>
                      <p className="text-xs text-muted-foreground">{t('historyPage.table.description')}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {t('historyPage.labels.totalEntries', { count: groupedEntries.length })}
                  </span>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        <th className="px-3 py-3">{t('historyPage.table.headers.date')}</th>
                        <th className="px-3 py-3">{t('historyPage.table.headers.entry')}</th>
                        <th className="px-3 py-3">{t('historyPage.table.headers.interval')}</th>
                        <th className="px-3 py-3">{t('historyPage.table.headers.exit')}</th>
                        <th className="px-3 py-3">{t('historyPage.table.headers.worked')}</th>
                        <th className="px-3 py-3">{t('historyPage.table.headers.idle')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedEntries.map((group) => {
                        const { summary } = group
                        const entryLabel = summary?.entryAt
                          ? format(summary.entryAt, 'HH:mm')
                          : t('historyPage.labels.timeFallback')
                        const exitLabel = summary?.exitAt
                          ? format(summary.exitAt, 'HH:mm')
                          : t('historyPage.labels.timeFallback')
                        const intervalLabel = summary?.hasBreak
                          ? formatDuration(summary.breakMinutes)
                          : t('historyPage.labels.timeFallback')
                        const workedLabel = group.duration
                          ? formatDuration(group.duration)
                          : t('historyPage.labels.noDuration')
                        const idleLabel =
                          typeof summary?.idleMinutes === 'number'
                            ? formatDuration(summary.idleMinutes)
                            : t('historyPage.labels.timeFallback')

                        return (
                          <tr
                            key={group.dateKey}
                            className="border-b border-border/80 last:border-b-0"
                          >
                            <td className="px-3 py-4">
                              <p className="font-semibold">{formatDateLabel(group.dateKey)}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {t('historyPage.labels.totalEntries', { count: group.items.length })}
                              </p>
                            </td>
                            <td className="px-3 py-4">{entryLabel}</td>
                            <td className="px-3 py-4">{intervalLabel}</td>
                            <td className="px-3 py-4">{exitLabel}</td>
                            <td className="px-3 py-4">{workedLabel}</td>
                            <td className="px-3 py-4">{idleLabel}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {!loading && !error && hasMore ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full px-4"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t('historyPage.actions.loadingMore') : t('historyPage.actions.loadMore')}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </PageContainer>
    </div>
  )
}
