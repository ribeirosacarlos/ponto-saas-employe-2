import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
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
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import {
  createMonthlyClosure,
  listClosureTimesheets,
  listMonthlyClosures,
  resolveTimesheetDispute,
  signTimesheetAsManager,
} from '../services/monthlyClosuresService'

const ADMIN_REQUIRES = { anyOf: ['admin', 'super_admin'] }
const MANAGER_REQUIRES = { anyOf: ['area_manager', 'admin', 'super_admin'] }

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

const buildPastMonths = () => {
  const result = []
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() // 0-based — skip current month
  month -= 1
  if (month < 0) {
    month = 11
    year -= 1
  }
  for (let i = 0; i < 24; i++) {
    result.push({ year, month: month + 1 })
    month -= 1
    if (month < 0) {
      month = 11
      year -= 1
    }
  }
  return result
}

export default function AdminMonthlyClosures() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const isAdmin = useMemo(() => canRenderCard(capabilities, ADMIN_REQUIRES), [capabilities])
  const canManage = useMemo(() => canRenderCard(capabilities, MANAGER_REQUIRES), [capabilities])

  const [closures, setClosures] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [expandedId, setExpandedId] = useState(null)
  const [timesheets, setTimesheets] = useState({})
  const [timesheetsLoading, setTimesheetsLoading] = useState({})
  const [timesheetsError, setTimesheetsError] = useState({})

  const [closeDialog, setCloseDialog] = useState(false)
  const [closeForm, setCloseForm] = useState({ year: '', month: '' })
  const [closeError, setCloseError] = useState('')
  const [closing, setClosing] = useState(false)

  const [signingId, setSigningId] = useState(null)

  const [resolveTarget, setResolveTarget] = useState(null)
  const [resolveNote, setResolveNote] = useState('')
  const [resolveError, setResolveError] = useState('')
  const [resolving, setResolving] = useState(false)

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

  const loadClosures = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { items } = await listMonthlyClosures({ perPage: 50 })
      setClosures(items)
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

  useEffect(() => {
    loadClosures()
  }, [loadClosures])

  const loadTimesheets = useCallback(
    async (closureId) => {
      setTimesheetsLoading((prev) => ({ ...prev, [closureId]: true }))
      setTimesheetsError((prev) => ({ ...prev, [closureId]: '' }))
      try {
        const { items } = await listClosureTimesheets(closureId)
        setTimesheets((prev) => ({ ...prev, [closureId]: items }))
      } catch (err) {
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

  const handleToggleExpand = (closureId) => {
    if (expandedId === closureId) {
      setExpandedId(null)
      return
    }
    setExpandedId(closureId)
    if (!timesheets[closureId]) {
      loadTimesheets(closureId)
    }
  }

  const handleCloseMonth = async () => {
    if (!closeForm.year || !closeForm.month) {
      setCloseError(t('adminMonthlyClosuresPage.form.selectError'))
      return
    }
    setClosing(true)
    setCloseError('')
    try {
      const result = await createMonthlyClosure({
        referenceYear: Number(closeForm.year),
        referenceMonth: Number(closeForm.month),
      })
      toast({
        title: t('adminMonthlyClosuresPage.actions.closeSuccessTitle'),
        description: t('adminMonthlyClosuresPage.actions.closeSuccessDescription'),
        variant: 'success',
      })
      setCloseDialog(false)
      setCloseForm({ year: '', month: '' })
      setClosures((prev) => [result, ...prev])
    } catch (err) {
      const apiErrors = err?.response?.data?.errors
      const msg =
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
      loadClosures()
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
                {loading ? (
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : null}
                {t('adminMonthlyClosuresPage.actions.refresh')}
              </Button>
              {isAdmin ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full px-4"
                  onClick={() => {
                    setCloseDialog(true)
                    setCloseForm({ year: '', month: '' })
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
                className="h-24 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
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

        {!loading && closures.length > 0 ? (
          <section className="space-y-4">
            {closures.map((closure) => {
              const isExpanded = expandedId === closure.id
              const closureTimesheets = timesheets[closure.id] || []
              const tsLoading = timesheetsLoading[closure.id] || false
              const tsError = timesheetsError[closure.id] || ''
              const statusStyle =
                CLOSURE_STATUS_STYLES[closure.status] ||
                'border-border/60 bg-muted/70 text-muted-foreground'

              return (
                <div
                  key={closure.id}
                  className="rounded-[28px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold capitalize">
                            {formatMonthYear(closure.reference_month, closure.reference_year)}
                          </p>
                          <span
                            className={cn(
                              'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]',
                              statusStyle,
                            )}
                          >
                            {t(
                              `adminMonthlyClosuresPage.status.${closure.status}`,
                              closure.status,
                            )}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {closure.closed_by?.name
                            ? t('adminMonthlyClosuresPage.closure.closedBy', {
                                name: closure.closed_by.name,
                              })
                            : null}
                          {closure.closed_by?.name ? ' · ' : ''}
                          {formatDate(closure.closed_at)}
                          {' · '}
                          {t('adminMonthlyClosuresPage.closure.timesheets', {
                            count: closure.timesheets_count ?? 0,
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-full px-4"
                      onClick={() => handleToggleExpand(closure.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                          {t('adminMonthlyClosuresPage.actions.collapse')}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                          {t('adminMonthlyClosuresPage.actions.expand')}
                        </>
                      )}
                    </Button>
                  </div>

                  {isExpanded ? (
                    <div className="mt-5 border-t border-border/70 pt-5">
                      {tsLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((item) => (
                            <div
                              key={item}
                              className="h-14 animate-pulse rounded-xl bg-muted/60"
                            />
                          ))}
                        </div>
                      ) : tsError ? (
                        <div className="flex items-center gap-3 rounded-xl border border-rose-200/70 bg-rose-500/10 px-4 py-3 text-rose-700 dark:border-rose-500/30 dark:text-rose-100">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <p className="text-sm">{tsError}</p>
                        </div>
                      ) : closureTimesheets.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-5 text-center text-sm text-muted-foreground">
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
                            const employeeName =
                              ts.employee?.name ||
                              t('closeTimesheetPage.table.userFallback', 'Colaborador')
                            const sigCount = ts.signatures?.length ?? 0
                            const balanceClass =
                              balance == null
                                ? 'text-muted-foreground'
                                : Number(balance) > 0
                                  ? 'text-emerald-600 dark:text-emerald-300'
                                  : Number(balance) < 0
                                    ? 'text-rose-600 dark:text-rose-300'
                                    : 'text-foreground'

                            return (
                              <div
                                key={ts.id}
                                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex min-w-0 items-start gap-3">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                                    <UserRound className="h-4 w-4" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate text-xs font-semibold text-foreground">
                                        {employeeName}
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
                                          {t('adminMonthlyClosuresPage.dispute.openLabel')}
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
                                        <span className={cn('font-semibold', balanceClass)}>
                                          {formatBalanceMinutes(balance)}
                                        </span>
                                      ) : null}
                                      {sigCount > 0 ? (
                                        <span className="inline-flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                          {t('adminMonthlyClosuresPage.table.sigCount', {
                                            count: sigCount,
                                          })}
                                        </span>
                                      ) : null}
                                    </div>
                                    {dispute?.reason ? (
                                      <p className="mt-1 line-clamp-1 text-[11px] text-rose-600 dark:text-rose-300">
                                        <span className="font-semibold">
                                          {t('adminMonthlyClosuresPage.dispute.reason')}:
                                        </span>{' '}
                                        {dispute.reason}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
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
                                        <RefreshCcw className="mr-1 h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <PenLine className="mr-1 h-3.5 w-3.5" />
                                      )}
                                      {isSigning
                                        ? t('adminMonthlyClosuresPage.actions.signing')
                                        : t('adminMonthlyClosuresPage.actions.sign')}
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
                                      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                      {t('adminMonthlyClosuresPage.actions.resolveDispute')}
                                    </Button>
                                  ) : null}
                                </div>
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
          </section>
        ) : null}
      </PageContainer>

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
              <Label>{t('adminMonthlyClosuresPage.form.monthYearLabel')}</Label>
              <Select
                value={closeForm.year && closeForm.month ? `${closeForm.year}-${closeForm.month}` : ''}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-')
                  setCloseForm({ year: year ?? '', month: month ?? '' })
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
                disabled={closing || !closeForm.year || !closeForm.month}
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
