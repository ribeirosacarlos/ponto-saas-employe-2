import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  ExternalLink,
  Loader2,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useDateTime } from '../../hooks/useDateTime'
import { useToast } from '../ui/use-toast'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { syncExtraEmployees } from '../../services/settings/syncExtraEmployees'

const STATUS_TONES = {
  active: 'bg-emerald-500/12 text-emerald-700 border-emerald-200/70 dark:text-emerald-100',
  past_due: 'bg-amber-500/12 text-amber-700 border-amber-200/70 dark:text-amber-100',
  trialing: 'bg-sky-500/12 text-sky-700 border-sky-200/70 dark:text-sky-100',
  canceled: 'bg-rose-500/12 text-rose-700 border-rose-200/70 dark:text-rose-100',
  default: 'bg-muted text-foreground border-border/70',
}

const intervalLabel = (interval, t) => {
  if (!interval) return t('settingsPage.plan.labels.unknownInterval')
  if (interval === 'year') return t('settingsPage.plan.labels.year')
  if (interval === 'one_time') return t('settingsPage.plan.labels.oneTime')
  return t('settingsPage.plan.labels.month')
}

const formatPrice = (plan, t) => {
  if (!plan?.price_cents || !plan.currency) return t('settingsPage.plan.labels.noPrice')
  return `${formatCents(plan.price_cents, plan.currency || 'BRL')} / ${intervalLabel(plan.billing_interval, t)}`
}

const formatCents = (value, currency = 'BRL') => {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value) / 100)
}

const DetailItem = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

const LimitsList = ({ limits, t }) => {
  if (!limits || typeof limits !== 'object') return null
  const entries = Object.entries(limits || {}).filter(([, value]) => value !== undefined && value !== null)
  if (!entries.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t('settingsPage.plan.labels.limits')}
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <DetailItem key={key} label={key} value={value} />
        ))}
      </div>
    </div>
  )
}

const ExtraEmployeesAlert = ({
  employees,
  currency,
  onOverviewReload,
  t,
}) => {
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [syncState, setSyncState] = useState('idle')
  const [syncError, setSyncError] = useState('')
  const [syncResult, setSyncResult] = useState(null)

  const limit = employees?.limit ?? 0
  const current = employees?.current ?? 0
  const extraEmployees = Math.max(0, current - limit)
  const fallbackUnitPriceCents = 1500
  const summary = syncResult?.summary || null
  const effectiveCurrent = summary?.active_employees ?? current
  const effectiveLimit = summary?.included_employees ?? limit
  const effectiveExtraEmployees = summary?.extra_employees ?? extraEmployees
  const unitPriceCents = summary?.extra_employee_price_cents ?? fallbackUnitPriceCents
  const extraTotalCents = summary?.extra_total_cents ?? effectiveExtraEmployees * unitPriceCents
  const totalPriceCents = summary?.total_price_cents ?? null
  const isSyncing = syncState === 'syncing'
  const isSuccess = syncState === 'success'

  const handleSync = async () => {
    setSyncState('syncing')
    setSyncError('')

    try {
      const response = await syncExtraEmployees()
      setSyncResult(response)
      setSyncState('success')
      setConfirmOpen(false)

      toast({
        title: t('settingsPage.plan.extraEmployees.toast.successTitle'),
        description:
          response?.message || t('settingsPage.plan.extraEmployees.toast.successDescription'),
        variant: 'success',
      })

      await onOverviewReload?.()
    } catch (err) {
      const status = err?.response?.status
      const apiMessage =
        err?.response?.data?.message ||
        err?.userFriendlyMessage ||
        err?.message

      const message =
        status === 403
          ? t('settingsPage.plan.extraEmployees.errors.forbidden')
          : status === 422
            ? apiMessage || t('settingsPage.plan.extraEmployees.errors.unprocessable')
            : t('settingsPage.plan.extraEmployees.errors.generic')

      setSyncState('error')
      setSyncError(message)

      toast({
        title: t('settingsPage.plan.extraEmployees.toast.errorTitle'),
        description: message,
        variant: 'error',
      })
    }
  }

  return (
    <>
      <div
        className={cn(
          'rounded-2xl border p-4',
          isSuccess
            ? 'border-emerald-300/70 bg-emerald-500/10'
            : 'border-amber-300/70 bg-amber-500/10',
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
              isSuccess
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-100'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-100',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {isSuccess
                  ? t('settingsPage.plan.extraEmployees.successTitle')
                  : t('settingsPage.plan.extraEmployees.title')}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSuccess
                  ? t('settingsPage.plan.extraEmployees.successDescription')
                  : t('settingsPage.plan.extraEmployees.description')}
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <DetailItem
                label={t('settingsPage.plan.extraEmployees.fields.included')}
                value={effectiveLimit}
              />
              <DetailItem
                label={t('settingsPage.plan.extraEmployees.fields.current')}
                value={effectiveCurrent}
              />
              <DetailItem
                label={t('settingsPage.plan.extraEmployees.fields.extra')}
                value={effectiveExtraEmployees}
              />
              <DetailItem
                label={t('settingsPage.plan.extraEmployees.fields.unitPrice')}
                value={formatCents(unitPriceCents, currency)}
              />
              <DetailItem
                label={t('settingsPage.plan.extraEmployees.fields.nextInvoiceExtra')}
                value={formatCents(extraTotalCents, currency)}
              />
              <DetailItem
                label={t('settingsPage.plan.extraEmployees.fields.nextInvoiceTotal')}
                value={totalPriceCents !== null ? formatCents(totalPriceCents, currency) : '—'}
              />
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{t('settingsPage.plan.extraEmployees.notes.noImmediateCharge')}</p>
              <p>{t('settingsPage.plan.extraEmployees.notes.nextBillingOnly')}</p>
              <p>{t('settingsPage.plan.extraEmployees.notes.noProration')}</p>
            </div>

            {syncError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {syncError}
              </div>
            ) : null}

            {!isSuccess ? (
              <Button type="button" size="sm" onClick={() => setConfirmOpen(true)}>
                {t('settingsPage.plan.extraEmployees.actions.confirm')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => !isSyncing && setConfirmOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settingsPage.plan.extraEmployees.modal.title')}</DialogTitle>
            <DialogDescription>
              {t('settingsPage.plan.extraEmployees.modal.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm text-foreground">
              <p>{t('settingsPage.plan.extraEmployees.modal.planLimit', { limit })}</p>
              <p>{t('settingsPage.plan.extraEmployees.modal.currentEmployees', { current })}</p>
              <p>{t('settingsPage.plan.extraEmployees.modal.extraEmployees', { extra: extraEmployees })}</p>
              <p>
                {t('settingsPage.plan.extraEmployees.modal.unitPrice', {
                  price: formatCents(unitPriceCents, currency),
                })}
              </p>
              <p>
                {t('settingsPage.plan.extraEmployees.modal.nextInvoiceExtra', {
                  price: formatCents(extraTotalCents, currency),
                })}
              </p>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{t('settingsPage.plan.extraEmployees.notes.noImmediateCharge')}</p>
              <p>{t('settingsPage.plan.extraEmployees.notes.nextBillingOnly')}</p>
              <p>{t('settingsPage.plan.extraEmployees.notes.noProration')}</p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isSyncing}>
                {t('common.actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('settingsPage.plan.extraEmployees.actions.syncing')}
                </>
              ) : (
                t('settingsPage.plan.extraEmployees.actions.confirmModal')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function PlanSummaryCard({ billing, usage, links, canManageBilling = false, onOverviewReload }) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateTime()

  if (!billing) return null

  const plan = billing?.plan || {}
  const subscription = billing?.subscription || {}
  const employees = usage?.employees || {}

  const hasLimit = employees.limit !== null && employees.limit !== undefined
  const usagePercent = hasLimit
    ? Math.min(100, Math.round((employees.current / (employees.limit || 1)) * 100))
    : null

  const statusKey = (subscription.status || subscription.subscription_status || '').toLowerCase()
  const statusTone = STATUS_TONES[statusKey] || STATUS_TONES.default
  const statusLabel =
    subscription.status_label ||
    subscription.status ||
    subscription.subscription_status ||
    t('settingsPage.plan.status.unknown')

  const nextDate = subscription.trial_ends_at || subscription.current_period_end || subscription.subscription_ends_at
  const nextDateLabel = subscription.trial_ends_at
    ? t('settingsPage.plan.labels.trialEnds')
    : subscription.current_period_end
      ? t('settingsPage.plan.labels.nextCharge')
      : subscription.subscription_ends_at
        ? t('settingsPage.plan.labels.periodEnds')
        : null

  const limits = useMemo(() => plan.limits || null, [plan.limits])
  const shouldShowExtraEmployeesAlert =
    canManageBilling && Boolean(employees.over_limit) && hasLimit

  const openUrl = (url) => {
    if (!url || typeof window === 'undefined') return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card className="border border-border/80 bg-card/90">
      <CardHeader className="flex flex-col gap-2 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {t('settingsPage.plan.title')}
              </p>
              <CardTitle className="text-xl font-semibold text-foreground">
                {plan.name || t('settingsPage.plan.unknown')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.plan.subtitle')}
              </p>
            </div>
          </div>
          {statusLabel ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                statusTone,
              )}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              {statusLabel}
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <DetailItem
            label={t('settingsPage.plan.labels.price')}
            value={formatPrice(plan, t)}
          />
          <DetailItem
            label={t('settingsPage.plan.labels.interval')}
            value={intervalLabel(plan.billing_interval, t)}
          />
          <DetailItem
            label={nextDateLabel || t('settingsPage.plan.labels.periodFallback')}
            value={nextDate ? formatDateTime(nextDate) : null}
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              {hasLimit
                ? t('settingsPage.plan.usage.withLimit', {
                    current: employees.current ?? 0,
                    limit: employees.limit ?? 0,
                  })
                : t('settingsPage.plan.usage.withoutLimit', { current: employees.current ?? 0 })}
            </div>
            {employees.over_limit ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-100">
                {t('settingsPage.plan.usage.overLimit')}
              </span>
            ) : null}
          </div>
          {usagePercent !== null ? (
            <div className="mt-2 space-y-1">
              <div className="h-2 w-full rounded-full bg-muted/60">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all',
                    employees.over_limit ? 'bg-amber-500' : 'bg-primary',
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('settingsPage.plan.usage.percent', { percent: usagePercent })}
              </p>
            </div>
          ) : null}
        </div>

        {shouldShowExtraEmployeesAlert ? (
          <ExtraEmployeesAlert
            employees={employees}
            currency={plan.currency || 'BRL'}
            onOverviewReload={onOverviewReload}
            t={t}
          />
        ) : null}

        {/*
          Botao "Portal do Cliente" oculto temporariamente.
          A funcionalidade ainda nao deve ficar visivel na interface.
        */}
      </CardContent>
    </Card>
  )
}
