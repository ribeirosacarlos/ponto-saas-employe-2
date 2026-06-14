import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileText,
  PenLine,
  PlusCircle,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import EmployeeMultiSelect from '../components/EmployeeMultiSelect'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import {
  listMonthlyClosures,
  createMonthlyClosure,
  listClosureTimesheets,
  signTimesheetAsManager,
  resolveTimesheetDispute,
  fetchAdminTimesheetPdf,
} from '../services/monthlyClosuresService'
import { listAllEmployees } from '../services/modules/employees'
import { downloadBlob } from '../utils/pdf/downloadBlob'
import { useDateTime } from '../hooks/useDateTime'

const ADMIN_REQUIRES = { anyOf: ['admin', 'super_admin'] }
const MANAGER_REQUIRES = { anyOf: ['area_manager', 'admin', 'super_admin'] }
const CLOSURE_ID_PARAM = 'closureId'

const CLOSURE_STATUS_STYLES = {
  processing:
    'border-amber-200/70 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:text-amber-300',
  open: 'border-sky-200/70 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:text-sky-300',
  completed:
    'border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300',
}

const TIMESHEET_STATUS_STYLES = {
  pending_employee:
    'border-amber-200/70 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:text-amber-300',
  disputed:
    'border-rose-200/70 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:text-rose-300',
  pending_manager:
    'border-sky-200/70 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:text-sky-300',
  completed:
    'border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300',
}

const formatWorkedMinutes = (minutes) => {
  const total = Number.isFinite(Number(minutes)) ? Number(minutes) : 0
  const abs = Math.abs(Math.round(total))
  return `${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

const formatBalanceMinutes = (minutes) => {
  const total = Number.isFinite(Number(minutes)) ? Number(minutes) : 0
  const rounded = Math.round(total)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : ''
  const abs = Math.abs(rounded)
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const weekdayFromDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return WEEKDAY_SHORT[d.getDay()] ?? '—'
}

const buildPastMonths = () => {
  const result = []
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth()
  for (let i = 0; i < 4; i++) {
    result.push({ year, month: month + 1 })
    month -= 1
    if (month < 0) {
      month = 11
      year -= 1
    }
  }
  return result
}

const readClosureIdFromUrl = () => {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(CLOSURE_ID_PARAM)
}

const writeClosureIdToUrl = (closureId) => {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (closureId) {
    params.set(CLOSURE_ID_PARAM, String(closureId))
  } else {
    params.delete(CLOSURE_ID_PARAM)
  }
  const search = params.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash || ''}`,
  )
}

export default function AdminMonthlyClosures() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const token = useAuthStore((state) => state.token)
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const isAdmin = useMemo(() => canRenderCard(capabilities, ADMIN_REQUIRES), [capabilities])
  const canManage = useMemo(() => canRenderCard(capabilities, MANAGER_REQUIRES), [capabilities])
  const { formatTime } = useDateTime()

  const [closures, setClosures] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Two-level expand state
  const [expandedMonthKey, setExpandedMonthKey] = useState(null)
  const [expandedClosureId, setExpandedClosureId] = useState(null)
  const [expandedTimesheetId, setExpandedTimesheetId] = useState(null)

  // Timesheets lazy-loaded per closure
  const [timesheets, setTimesheets] = useState({})
  const [timesheetsLoading, setTimesheetsLoading] = useState({})
  const [timesheetsError, setTimesheetsError] = useState({})

  // Create closure dialog
  const [closeDialog, setCloseDialog] = useState(false)
  const [closeForm, setCloseForm] = useState({ year: '', month: '', employeeId: '' })
  const [closeError, setCloseError] = useState('')
  const [closing, setClosing] = useState(false)
  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)

  // Action states
  const [signingId, setSigningId] = useState(null)
  const [resolveTarget, setResolveTarget] = useState(null)
  const [resolveNote, setResolveNote] = useState('')
  const [resolveError, setResolveError] = useState('')
  const [resolving, setResolving] = useState(false)
  const [pdfLoadingId, setPdfLoadingId] = useState(null)

  const pastMonths = useMemo(() => buildPastMonths(), [])

  const formatMonthYear = useCallback(
    (month, year) =>
      new Date(year, month - 1, 1).toLocaleDateString(i18n.language, {
        month: 'long',
        year: 'numeric',
      }),
    [i18n.language],
  )

  const formatDate = useCallback(
    (dateStr) => {
      if (!dateStr) return '—'
      return new Date(dateStr).toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    },
    [i18n.language],
  )

  // Group closures by month/year, sorted newest first
  const groupedClosures = useMemo(() => {
    const groups = {}
    closures.forEach((closure) => {
      const key = `${closure.reference_year}-${closure.reference_month}`
      if (!groups[key]) {
        groups[key] = {
          year: closure.reference_year,
          month: closure.reference_month,
          key,
          items: [],
        }
      }
      groups[key].items.push(closure)
    })
    return Object.values(groups).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month,
    )
  }, [closures])

  const loadClosures = useCallback(async () => {
    setLoading(true)
    setError('')
    setExpandedMonthKey(null)
    setExpandedClosureId(null)
    setExpandedTimesheetId(null)
    setTimesheets({})
    setTimesheetsLoading({})
    setTimesheetsError({})
    try {
      const { items } = await listMonthlyClosures()
      setClosures(items)

      // Restore deep link from URL
      const urlClosureId = readClosureIdFromUrl()
      if (urlClosureId) {
        const found = items.find((c) => String(c.id) === urlClosureId)
        if (found) {
          const key = `${found.reference_year}-${found.reference_month}`
          setExpandedMonthKey(key)
          setExpandedClosureId(found.id)
        } else {
          writeClosureIdToUrl(null)
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t('adminMonthlyClosuresPage.states.error'),
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  const loadTimesheets = useCallback(
    async (closureId) => {
      setTimesheetsLoading((prev) => ({ ...prev, [closureId]: true }))
      setTimesheetsError((prev) => ({ ...prev, [closureId]: '' }))
      try {
        const { items } = await listClosureTimesheets(closureId, {
          skipAccessDeniedHandling: true,
        })
        setTimesheets((prev) => ({ ...prev, [closureId]: items }))
      } catch (err) {
        if (err?.response?.status === 403) {
          setExpandedClosureId(null)
          setExpandedTimesheetId(null)
          return
        }
        setTimesheetsError((prev) => ({
          ...prev,
          [closureId]:
            err?.response?.data?.message ||
            err?.message ||
            t('adminMonthlyClosuresPage.states.errorTimesheets'),
        }))
      } finally {
        setTimesheetsLoading((prev) => ({ ...prev, [closureId]: false }))
      }
    },
    [t],
  )

  useEffect(() => {
    if (token && canManage) {
      loadClosures()
    }
  }, [token, canManage, loadClosures])

  useEffect(() => {
    writeClosureIdToUrl(expandedClosureId)
  }, [expandedClosureId])

  useEffect(() => {
    if (!closeDialog || employees.length > 0) return
    setEmployeesLoading(true)
    listAllEmployees({ perPage: 100 })
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setEmployeesLoading(false))
  }, [closeDialog, employees.length])

  const handleToggleMonth = (monthKey) => {
    if (expandedMonthKey === monthKey) {
      setExpandedMonthKey(null)
      setExpandedClosureId(null)
      setExpandedTimesheetId(null)
    } else {
      setExpandedMonthKey(monthKey)
      setExpandedClosureId(null)
      setExpandedTimesheetId(null)
    }
  }

  const handleToggleClosure = (closureId) => {
    if (expandedClosureId === closureId) {
      setExpandedClosureId(null)
      setExpandedTimesheetId(null)
      return
    }
    setExpandedClosureId(closureId)
    setExpandedTimesheetId(null)
    if (!timesheets[closureId] && !timesheetsLoading[closureId]) {
      loadTimesheets(closureId)
    }
  }

  const handleCloseMonth = async () => {
    if (!closeForm.year || !closeForm.month || !closeForm.employeeId) {
      setCloseError(t('adminMonthlyClosuresPage.form.selectError'))
      return
    }
    setClosing(true)
    setCloseError('')
    try {
      const result = await createMonthlyClosure({
        referenceYear: Number(closeForm.year),
        referenceMonth: Number(closeForm.month),
        employeeId: closeForm.employeeId,
      })
      toast({
        title: t('adminMonthlyClosuresPage.actions.closeSuccessTitle'),
        description: t('adminMonthlyClosuresPage.actions.closeSuccessDescription'),
        variant: 'success',
      })
      setCloseDialog(false)
      setCloseForm({ year: '', month: '', employeeId: '' })
      setClosures((prev) => [result, ...prev])
    } catch (err) {
      const apiErrors = err?.response?.data?.errors
      const msg =
        apiErrors?.employee_id?.[0] ||
        apiErrors?.reference_month?.[0] ||
        apiErrors?.reference_year?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        t('adminMonthlyClosuresPage.actions.closeError')
      setCloseError(msg)
    } finally {
      setClosing(false)
    }
  }

  const handleSign = async (timesheetId, closureId) => {
    setSigningId(timesheetId)
    try {
      const updated = await signTimesheetAsManager(timesheetId)
      setTimesheets((prev) => ({
        ...prev,
        [closureId]: (prev[closureId] || []).map((ts) =>
          ts.id === timesheetId ? { ...ts, ...updated } : ts,
        ),
      }))
      toast({
        title: t('adminMonthlyClosuresPage.actions.signSuccessTitle'),
        description: t('adminMonthlyClosuresPage.actions.signSuccessDescription'),
        variant: 'success',
      })
      loadTimesheets(closureId)
    } catch (err) {
      toast({
        title: t('adminMonthlyClosuresPage.actions.signErrorTitle'),
        description:
          err?.response?.data?.errors?.status?.[0] ||
          err?.response?.data?.message ||
          err?.message,
        variant: 'error',
      })
    } finally {
      setSigningId(null)
    }
  }

  const handleResolveDispute = async () => {
    if (!resolveNote.trim()) {
      setResolveError(t('adminMonthlyClosuresPage.dispute.noteRequired'))
      return
    }
    setResolving(true)
    setResolveError('')
    try {
      await resolveTimesheetDispute(
        resolveTarget.timesheetId,
        resolveTarget.disputeId,
        resolveNote.trim(),
      )
      toast({
        title: t('adminMonthlyClosuresPage.dispute.resolveSuccessTitle'),
        description: t('adminMonthlyClosuresPage.dispute.resolveSuccessDescription'),
        variant: 'success',
      })
      setResolveTarget(null)
      setResolveNote('')
      if (resolveTarget.closureId) {
        loadTimesheets(resolveTarget.closureId)
      }
    } catch (err) {
      setResolveError(
        err?.response?.data?.message ||
          err?.message ||
          t('adminMonthlyClosuresPage.dispute.resolveError'),
      )
    } finally {
      setResolving(false)
    }
  }

  const handleViewPdf = async (timesheetId) => {
    setPdfLoadingId(timesheetId)
    try {
      const result = await fetchAdminTimesheetPdf(timesheetId)
      if (result.type === 'url') {
        window.open(result.url, '_blank', 'noopener,noreferrer')
      } else {
        downloadBlob({ blob: result.blob, response: result.response, fallbackFilename: 'folha-ponto.pdf' })
      }
    } catch (err) {
      toast({
        title: t('adminMonthlyClosuresPage.actions.pdfErrorTitle'),
        description: err?.response?.data?.message || err?.message,
        variant: 'error',
      })
    } finally {
      setPdfLoadingId(null)
    }
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-transparent text-foreground">
        <PageContainer className="py-5 sm:py-6">
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-6 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {t('equipoPage.states.noPermissionTitle')}
            </p>
            <p className="mt-1">{t('equipoPage.states.noPermissionDescription')}</p>
          </div>
        </PageContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="py-5 sm:py-6 space-y-6">
        <AppTopBar
          icon={<CalendarCheck className="h-5 w-5" />}
          eyebrow={t('adminMonthlyClosuresPage.badge')}
          title={t('adminMonthlyClosuresPage.title')}
          subtitle={t('adminMonthlyClosuresPage.subtitle')}
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-border bg-background/80 px-3 text-sm"
                onClick={loadClosures}
                disabled={loading}
              >
                <RefreshCcw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
                {t('adminMonthlyClosuresPage.actions.refresh')}
              </Button>
              {isAdmin ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full px-4"
                  onClick={() => {
                    setCloseDialog(true)
                    setCloseForm({ year: '', month: '', employeeId: '' })
                    setCloseError('')
                  }}
                >
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                  {t('adminMonthlyClosuresPage.actions.closePeriod')}
                </Button>
              ) : null}
            </div>
          }
        />

        {error ? (
          <section className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 shadow-[0_18px_50px_-38px_rgba(255,82,82,0.25)] dark:border-rose-500/30 dark:text-rose-100">
            <p className="font-semibold">{t('adminMonthlyClosuresPage.states.errorTitle')}</p>
            <p className="mt-1">{error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 rounded-full px-3 text-xs"
              onClick={loadClosures}
            >
              {t('common.actions.retry', 'Tentar novamente')}
            </Button>
          </section>
        ) : null}

        {loading ? (
          <section className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-[28px] border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
              />
            ))}
          </section>
        ) : null}

        {!loading && closures.length === 0 && !error ? (
          <section className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-8 text-sm text-muted-foreground shadow-[0_18px_50px_-40px_rgba(62,82,152,0.35)]">
            <p className="font-semibold text-foreground">
              {t('adminMonthlyClosuresPage.states.emptyTitle')}
            </p>
            <p className="mt-1">{t('adminMonthlyClosuresPage.states.emptyDescription')}</p>
          </section>
        ) : null}

        {/* Month groups */}
        {!loading && groupedClosures.length > 0 ? (
          <section className="space-y-3">
            {groupedClosures.map(({ year, month, key, items }) => {
              const isMonthOpen = expandedMonthKey === key
              return (
                <div
                  key={key}
                  className="rounded-[28px] border border-border/80 bg-card/95 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.3)]"
                >
                  {/* Month header */}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 sm:px-6"
                    onClick={() => handleToggleMonth(key)}
                    aria-expanded={isMonthOpen}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <CalendarCheck className="h-5 w-5" />
                      </span>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-semibold capitalize text-foreground">
                          {formatMonthYear(month, year)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {items.length}{' '}
                          {items.length === 1 ? 'fechamento' : 'fechamentos'}
                        </p>
                      </div>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/60 text-muted-foreground transition-colors hover:bg-accent">
                      {isMonthOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {/* Employee list for this month */}
                  {isMonthOpen ? (
                    <div className="border-t border-border/60 px-5 py-4 space-y-2 sm:px-6">
                      {items.map((closure) => {
                        const isClosureOpen = expandedClosureId === closure.id
                        const closureTimesheets = timesheets[closure.id] || []
                        const tsLoading = timesheetsLoading[closure.id] || false
                        const tsError = timesheetsError[closure.id] || ''
                        const statusStyle =
                          CLOSURE_STATUS_STYLES[closure.status] ||
                          'border-border/60 bg-muted/70 text-muted-foreground'
                        const employeeName =
                          closure.employee?.name ||
                          t('closeTimesheetPage.table.userFallback', 'Colaborador')

                        return (
                          <div
                            key={closure.id}
                            className="rounded-2xl border border-border/60 bg-background/50"
                          >
                            {/* Employee row header */}
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-3 px-4 py-3"
                              onClick={() => handleToggleClosure(closure.id)}
                              aria-expanded={isClosureOpen}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                                  <UserRound className="h-4 w-4" />
                                </span>
                                <div className="text-left min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs font-semibold text-foreground truncate">
                                      {employeeName}
                                    </p>
                                    <span
                                      className={cn(
                                        'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]',
                                        statusStyle,
                                      )}
                                    >
                                      {t(
                                        `adminMonthlyClosuresPage.status.${closure.status}`,
                                        closure.status,
                                      )}
                                    </span>
                                  </div>
                                  {closure.closed_by?.name || closure.closed_at ? (
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                      {closure.closed_by?.name
                                        ? t('adminMonthlyClosuresPage.closure.closedBy', {
                                            name: closure.closed_by.name,
                                          })
                                        : null}
                                      {closure.closed_by?.name && closure.closed_at ? ' · ' : ''}
                                      {formatDate(closure.closed_at)}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-accent">
                                {isClosureOpen ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </span>
                            </button>

                            {/* Timesheets area (lazy loaded) */}
                            {isClosureOpen ? (
                              <div className="border-t border-border/50 px-4 py-3">
                                {tsLoading ? (
                                  <div className="space-y-2">
                                    {[1, 2].map((i) => (
                                      <div
                                        key={i}
                                        className="h-12 animate-pulse rounded-xl bg-muted/50"
                                      />
                                    ))}
                                  </div>
                                ) : tsError ? (
                                  <div className="flex items-center gap-3 rounded-xl border border-rose-200/70 bg-rose-500/10 px-4 py-3 text-rose-700 dark:border-rose-500/30 dark:text-rose-100">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <p className="text-sm">{tsError}</p>
                                  </div>
                                ) : closureTimesheets.length === 0 ? (
                                  <p className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-4 text-center text-xs text-muted-foreground">
                                    {t('adminMonthlyClosuresPage.states.emptyTimesheets')}
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {closureTimesheets.map((ts) => {
                                      const tsStatusStyle =
                                        TIMESHEET_STATUS_STYLES[ts.status] ||
                                        'border-border/60 bg-muted/70 text-muted-foreground'
                                      const worked = ts.snapshot?.totals?.worked_minutes
                                      const balance = ts.snapshot?.totals?.balance_minutes
                                      const dispute = ts.open_dispute
                                      const isSigning = signingId === ts.id
                                      const tsEmployeeName =
                                        ts.employee?.name ||
                                        t(
                                          'closeTimesheetPage.table.userFallback',
                                          'Colaborador',
                                        )
                                      const sigCount = ts.signatures?.length ?? 0
                                      const balanceClass =
                                        balance == null
                                          ? 'text-muted-foreground'
                                          : Number(balance) > 0
                                            ? 'text-emerald-600 dark:text-emerald-300'
                                            : Number(balance) < 0
                                              ? 'text-rose-600 dark:text-rose-300'
                                              : 'text-foreground'
                                      const days = ts?.snapshot?.days ?? []
                                      const isTsExpanded = expandedTimesheetId === ts.id

                                      return (
                                        <div
                                          key={ts.id}
                                          className="rounded-xl border border-border/50 bg-muted/20"
                                        >
                                          <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <p className="text-xs font-semibold text-foreground">
                                                  {tsEmployeeName}
                                                </p>
                                                <span
                                                  className={cn(
                                                    'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]',
                                                    tsStatusStyle,
                                                  )}
                                                >
                                                  {t(
                                                    `adminMonthlyClosuresPage.timesheetStatus.${ts.status}`,
                                                    ts.status,
                                                  )}
                                                </span>
                                                {dispute && dispute.status === 'open' ? (
                                                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/70 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-500/30 dark:text-rose-300">
                                                    <AlertCircle className="h-3 w-3" />
                                                    {t(
                                                      'adminMonthlyClosuresPage.dispute.openLabel',
                                                    )}
                                                  </span>
                                                ) : null}
                                              </div>
                                              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                                {worked != null ? (
                                                  <span className="inline-flex items-center gap-1">
                                                    <Clock3 className="h-3 w-3" />
                                                    {formatWorkedMinutes(worked)}h
                                                  </span>
                                                ) : null}
                                                {balance != null ? (
                                                  <span
                                                    className={cn('font-semibold', balanceClass)}
                                                  >
                                                    {formatBalanceMinutes(balance)}
                                                  </span>
                                                ) : null}
                                                {sigCount > 0 ? (
                                                  <span className="inline-flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                    {t(
                                                      'adminMonthlyClosuresPage.table.sigCount',
                                                      {
                                                        count: sigCount,
                                                      },
                                                    )}
                                                  </span>
                                                ) : null}
                                              </div>
                                              {dispute?.reason ? (
                                                <p className="mt-1 line-clamp-1 text-[11px] text-rose-600 dark:text-rose-300">
                                                  <span className="font-semibold">
                                                    {t(
                                                      'adminMonthlyClosuresPage.dispute.reason',
                                                    )}
                                                    :
                                                  </span>{' '}
                                                  {dispute.reason}
                                                </p>
                                              ) : null}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                              {days.length > 0 ? (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  className="rounded-full px-3 text-xs"
                                                  onClick={() =>
                                                    setExpandedTimesheetId(
                                                      isTsExpanded ? null : ts.id,
                                                    )
                                                  }
                                                  aria-expanded={isTsExpanded}
                                                >
                                                  {isTsExpanded ? (
                                                    <>
                                                      <ChevronUp className="mr-1 h-3 w-3" />
                                                      Recolher
                                                    </>
                                                  ) : (
                                                    <>
                                                      <ChevronDown className="mr-1 h-3 w-3" />
                                                      Ver pontos
                                                    </>
                                                  )}
                                                </Button>
                                              ) : null}
                                              {ts.pdf_path ? (
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  className="rounded-full px-3 text-xs"
                                                  disabled={pdfLoadingId === ts.id}
                                                  onClick={() => handleViewPdf(ts.id)}
                                                >
                                                  {pdfLoadingId === ts.id ? (
                                                    <RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
                                                  ) : (
                                                    <Download className="mr-1 h-3 w-3" />
                                                  )}
                                                  {t(
                                                    'adminMonthlyClosuresPage.actions.viewPdf',
                                                  )}
                                                </Button>
                                              ) : null}
                                              {ts.status === 'pending_manager' ? (
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  className="rounded-full px-3 text-xs"
                                                  disabled={isSigning}
                                                  onClick={() => handleSign(ts.id, closure.id)}
                                                >
                                                  {isSigning ? (
                                                    <RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
                                                  ) : (
                                                    <PenLine className="mr-1 h-3 w-3" />
                                                  )}
                                                  {isSigning
                                                    ? t(
                                                        'adminMonthlyClosuresPage.actions.signing',
                                                      )
                                                    : t(
                                                        'adminMonthlyClosuresPage.actions.sign',
                                                      )}
                                                </Button>
                                              ) : null}
                                              {dispute && dispute.status === 'open' ? (
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  className="rounded-full border-rose-200/70 px-3 text-xs text-rose-600 hover:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"
                                                  onClick={() => {
                                                    setResolveTarget({
                                                      timesheetId: ts.id,
                                                      disputeId: dispute.id,
                                                      closureId: closure.id,
                                                    })
                                                    setResolveNote('')
                                                    setResolveError('')
                                                  }}
                                                >
                                                  <ShieldCheck className="mr-1 h-3 w-3" />
                                                  {t(
                                                    'adminMonthlyClosuresPage.actions.resolveDispute',
                                                  )}
                                                </Button>
                                              ) : null}
                                            </div>
                                          </div>

                                          {/* Day-by-day details */}
                                          {isTsExpanded && days.length > 0 ? (
                                            <div className="border-t border-border/50 px-3 pb-3 pt-3">
                                              <div className="overflow-x-auto">
                                                <table className="w-full min-w-[480px] text-[12px]">
                                                  <thead>
                                                    <tr className="text-left text-muted-foreground">
                                                      <th className="pb-2 font-medium w-[90px]">
                                                        Data
                                                      </th>
                                                      <th className="pb-2 font-medium w-[60px]">
                                                        Dia
                                                      </th>
                                                      <th className="pb-2 font-medium">
                                                        Batidas
                                                      </th>
                                                      <th className="pb-2 font-medium text-right w-[80px]">
                                                        Trabalhado
                                                      </th>
                                                      <th className="pb-2 font-medium text-right w-[80px]">
                                                        Saldo
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-border/40">
                                                    {days.map((day) => {
                                                      const summary = day.summary ?? {}
                                                      const dayBalance =
                                                        summary.balance_minutes ?? 0
                                                      const isHoliday =
                                                        summary.is_holiday ?? false
                                                      const dayBalanceClass =
                                                        dayBalance > 0
                                                          ? 'text-emerald-600 dark:text-emerald-300'
                                                          : dayBalance < 0
                                                            ? 'text-rose-600 dark:text-rose-300'
                                                            : 'text-foreground'
                                                      return (
                                                        <tr
                                                          key={day.date}
                                                          className={cn(
                                                            isHoliday ? 'opacity-60' : '',
                                                          )}
                                                        >
                                                          <td className="py-1.5 text-muted-foreground">
                                                            {day.date}
                                                          </td>
                                                          <td className="py-1.5 text-muted-foreground">
                                                            {weekdayFromDate(day.date)}
                                                            {isHoliday ? (
                                                              <span className="ml-1 text-[10px] text-amber-600">
                                                                feriado
                                                              </span>
                                                            ) : null}
                                                          </td>
                                                          <td className="py-1.5">
                                                            {day.entries?.length > 0 ? (
                                                              <div className="flex flex-wrap gap-1">
                                                                {day.entries.map((entry, idx) => (
                                                                  <span
                                                                    key={idx}
                                                                    className={cn(
                                                                      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                                                                      entry.type === 'in'
                                                                        ? 'border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300'
                                                                        : 'border-sky-200/60 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:text-sky-300',
                                                                      entry.is_adjusted
                                                                        ? 'italic'
                                                                        : '',
                                                                    )}
                                                                  >
                                                                    {entry.clocked_at
                                                                      ? formatTime(entry.clocked_at)
                                                                      : '—'}
                                                                    {entry.is_adjusted ? '*' : ''}
                                                                  </span>
                                                                ))}
                                                              </div>
                                                            ) : (
                                                              <span className="text-muted-foreground">
                                                                —
                                                              </span>
                                                            )}
                                                          </td>
                                                          <td className="py-1.5 text-right font-mono">
                                                            {summary.worked_hhmm ??
                                                              (summary.worked_minutes != null
                                                                ? `${formatWorkedMinutes(summary.worked_minutes)}h`
                                                                : '—')}
                                                          </td>
                                                          <td
                                                            className={cn(
                                                              'py-1.5 text-right font-mono font-semibold',
                                                              dayBalanceClass,
                                                            )}
                                                          >
                                                            {summary.balance_hhmm ??
                                                              (summary.balance_minutes != null
                                                                ? formatBalanceMinutes(dayBalance)
                                                                : '—')}
                                                          </td>
                                                        </tr>
                                                      )
                                                    })}
                                                  </tbody>
                                                  {worked != null ? (
                                                    <tfoot>
                                                      <tr className="border-t border-border/70 text-[12px] font-semibold">
                                                        <td
                                                          colSpan={3}
                                                          className="pt-2 text-muted-foreground"
                                                        >
                                                          Total do período
                                                        </td>
                                                        <td className="pt-2 text-right font-mono">
                                                          {formatWorkedMinutes(worked)}h
                                                        </td>
                                                        <td
                                                          className={cn(
                                                            'pt-2 text-right font-mono',
                                                            balanceClass,
                                                          )}
                                                        >
                                                          {balance != null
                                                            ? formatBalanceMinutes(balance)
                                                            : '—'}
                                                        </td>
                                                      </tr>
                                                    </tfoot>
                                                  ) : null}
                                                </table>
                                              </div>
                                              {ts.signatures?.length > 0 ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                  {ts.signatures.map((sig) => (
                                                    <span
                                                      key={sig.id}
                                                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300"
                                                    >
                                                      <CheckCircle2 className="h-3 w-3" />
                                                      {sig.role === 'employee'
                                                        ? 'Colaborador'
                                                        : 'Gestor'}
                                                      {' · '}
                                                      {formatDate(sig.signed_at)}
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : null}
                                            </div>
                                          ) : null}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </section>
        ) : null}
      </PageContainer>

      {/* Create closure dialog */}
      <Dialog
        open={closeDialog}
        onOpenChange={(open) => {
          if (!open) setCloseDialog(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminMonthlyClosuresPage.form.title')}</DialogTitle>
            <DialogDescription>{t('adminMonthlyClosuresPage.form.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t('adminMonthlyClosuresPage.form.employeeLabel')}</Label>
              <EmployeeMultiSelect
                options={employees}
                value={closeForm.employeeId ? [closeForm.employeeId] : []}
                onChange={(ids) => {
                  setCloseForm((prev) => ({ ...prev, employeeId: ids[0] ?? '' }))
                  setCloseError('')
                }}
                multiple={false}
                loading={employeesLoading}
                triggerPlaceholder={t('adminMonthlyClosuresPage.form.selectEmployee')}
                showSelectedChips={false}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('adminMonthlyClosuresPage.form.monthYearLabel')}</Label>
              <Select
                value={
                  closeForm.year && closeForm.month
                    ? `${closeForm.year}-${closeForm.month}`
                    : ''
                }
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-')
                  setCloseForm((prev) => ({ ...prev, year: year ?? '', month: month ?? '' }))
                  setCloseError('')
                }}
              >
                <option value="">{t('adminMonthlyClosuresPage.form.selectMonth')}</option>
                {pastMonths.map(({ year, month }) => (
                  <option key={`${year}-${month}`} value={`${year}-${month}`}>
                    {formatMonthYear(month, year)}
                  </option>
                ))}
              </Select>
            </div>
            {closeError ? (
              <p className="text-xs font-semibold text-rose-500">{closeError}</p>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel')}
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={closing || !closeForm.year || !closeForm.month || !closeForm.employeeId}
                onClick={handleCloseMonth}
              >
                {closing
                  ? t('adminMonthlyClosuresPage.form.submitting')
                  : t('adminMonthlyClosuresPage.form.submit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve dispute dialog */}
      <Dialog
        open={Boolean(resolveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setResolveTarget(null)
            setResolveNote('')
            setResolveError('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminMonthlyClosuresPage.dispute.resolveTitle')}</DialogTitle>
            <DialogDescription>
              {t('adminMonthlyClosuresPage.dispute.resolveDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="resolve-note">
                {t('adminMonthlyClosuresPage.dispute.noteLabel')}
              </Label>
              <Textarea
                id="resolve-note"
                value={resolveNote}
                rows={3}
                onChange={(e) => {
                  setResolveNote(e.target.value)
                  setResolveError('')
                }}
                placeholder={t('adminMonthlyClosuresPage.dispute.notePlaceholder')}
              />
            </div>
            {resolveError ? (
              <p className="text-xs font-semibold text-rose-500">{resolveError}</p>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel')}
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={resolving || !resolveNote.trim()}
                onClick={handleResolveDispute}
              >
                {resolving
                  ? t('adminMonthlyClosuresPage.dispute.submitting')
                  : t('adminMonthlyClosuresPage.dispute.submit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
