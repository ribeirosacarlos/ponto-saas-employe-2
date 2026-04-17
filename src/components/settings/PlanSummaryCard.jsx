import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  Loader2,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useDateTime } from '../../hooks/useDateTime'
import { useToast } from '../ui/use-toast'
import { createExtraEmployeesCheckoutSession } from '../../services/settings/createExtraEmployeesCheckoutSession'

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
  if (value === null || value === undefined || value === '') return '--'
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

const ExtraEmployeesPendingAlert = ({
  extraEmployees,
  canManageBilling,
  onOverviewReload,
  t,
  formatDateTime,
}) => {
  const { toast } = useToast()
  const [isRedirecting, setIsRedirecting] = useState(false)

  if (!extraEmployees?.has_pending_payment) return null

  const tone = extraEmployees.payment_overdue
    ? {
        container: 'border-rose-300/70 bg-rose-500/10',
        icon: 'bg-rose-500/15 text-rose-700 dark:text-rose-100',
        badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-100',
        Icon: ShieldAlert,
      }
    : {
        container: 'border-amber-300/70 bg-amber-500/10',
        icon: 'bg-amber-500/15 text-amber-700 dark:text-amber-100',
        badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-100',
        Icon: AlertTriangle,
      }

  const handleCheckout = async () => {
    setIsRedirecting(true)
    try {
      const response = await createExtraEmployeesCheckoutSession()
      if (!response?.url) {
        throw new Error(t('settingsPage.plan.extraEmployees.errors.missingUrl'))
      }

      await onOverviewReload?.()
      window.location.assign(response.url)
    } catch (err) {
      toast({
        title: t('settingsPage.plan.extraEmployees.toast.checkoutErrorTitle'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('settingsPage.plan.extraEmployees.errors.checkout'),
        variant: 'error',
      })
      setIsRedirecting(false)
    }
  }

  return (
    <div className={cn('rounded-2xl border p-4', tone.container)}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', tone.icon)}>
          <tone.Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {extraEmployees.payment_overdue
                ? t('settingsPage.plan.extraEmployees.overdueTitle')
                : t('settingsPage.plan.extraEmployees.pendingTitle')}
            </p>
            <span className={cn('rounded-full px-2 py-1 text-[11px] font-semibold', tone.badge)}>
              {extraEmployees.payment_overdue
                ? t('settingsPage.plan.extraEmployees.badges.overdue')
                : t('settingsPage.plan.extraEmployees.badges.pending')}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('settingsPage.plan.extraEmployees.pendingDescription', {
              count: extraEmployees.pending_quantity ?? 0,
            })}
          </p>

          <div className="grid gap-2 md:grid-cols-3">
            <DetailItem
              label={t('settingsPage.plan.extraEmployees.fields.pendingQuantity')}
              value={extraEmployees.pending_quantity ?? 0}
            />
            <DetailItem
              label={t('settingsPage.plan.extraEmployees.fields.dueAt')}
              value={extraEmployees.payment_due_at ? formatDateTime(extraEmployees.payment_due_at) : null}
            />
            <DetailItem
              label={t('settingsPage.plan.extraEmployees.fields.paidAllowance')}
              value={extraEmployees.paid_allowance ?? 0}
            />
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>{t('settingsPage.plan.extraEmployees.notes.pendingKeepsQuantity')}</p>
            <p>
              {extraEmployees.payment_overdue
                ? t('settingsPage.plan.extraEmployees.notes.overdueBlocksNewEmployees')
                : t('settingsPage.plan.extraEmployees.notes.pendingAllowsGrace')}
            </p>
          </div>

          {canManageBilling ? (
            <Button type="button" size="sm" onClick={handleCheckout} disabled={isRedirecting}>
              {isRedirecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('settingsPage.plan.extraEmployees.actions.redirecting')}
                </>
              ) : (
                t('settingsPage.plan.extraEmployees.actions.payNow')
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function PlanSummaryCard({ billing, usage, canManageBilling = false, onOverviewReload }) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateTime()

  if (!billing) return null

  const plan = billing?.plan || {}
  const subscription = billing?.subscription || {}
  const billableUsers = usage?.billable_users || usage?.employees || {}
  const extraEmployees = usage?.extra_employees || {}

  const hasLimit = billableUsers.limit !== null && billableUsers.limit !== undefined
  const usagePercent = hasLimit
    ? Math.min(100, Math.round((billableUsers.current / (billableUsers.limit || 1)) * 100))
    : null

  const statusKey = (subscription.status || subscription.subscription_status || '').toLowerCase()
  const statusTone = STATUS_TONES[statusKey] || STATUS_TONES.default
  const statusLabel =
    subscription.status_label ||
    subscription.status ||
    subscription.subscription_status ||
    t('settingsPage.plan.status.unknown')

  const nextDate =
    subscription.trial_ends_at || subscription.current_period_end || subscription.subscription_ends_at
  const nextDateLabel = subscription.trial_ends_at
    ? t('settingsPage.plan.labels.trialEnds')
    : subscription.current_period_end
      ? t('settingsPage.plan.labels.nextCharge')
      : subscription.subscription_ends_at
        ? t('settingsPage.plan.labels.periodEnds')
        : null

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
              <p className="text-sm text-muted-foreground">{t('settingsPage.plan.subtitle')}</p>
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
          <DetailItem label={t('settingsPage.plan.labels.price')} value={formatPrice(plan, t)} />
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
                    current: billableUsers.current ?? 0,
                    limit: billableUsers.limit ?? 0,
                  })
                : t('settingsPage.plan.usage.withoutLimit', { current: billableUsers.current ?? 0 })}
            </div>
            {billableUsers.over_limit ? (
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
                    billableUsers.over_limit ? 'bg-amber-500' : 'bg-primary',
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

        <div className="grid gap-3 md:grid-cols-3">
          <DetailItem
            label={t('settingsPage.plan.extraEmployees.fields.pendingQuantity')}
            value={extraEmployees.pending_quantity ?? 0}
          />
          <DetailItem
            label={t('settingsPage.plan.extraEmployees.fields.paidAllowance')}
            value={extraEmployees.paid_allowance ?? 0}
          />
          <DetailItem
            label={t('settingsPage.plan.labels.nextCharge')}
            value={
              extraEmployees.payment_due_at ? (
                <span className="inline-flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {formatDateTime(extraEmployees.payment_due_at)}
                </span>
              ) : null
            }
          />
        </div>

        <ExtraEmployeesPendingAlert
          extraEmployees={extraEmployees}
          canManageBilling={canManageBilling}
          onOverviewReload={onOverviewReload}
          t={t}
          formatDateTime={formatDateTime}
        />

        <LimitsList limits={plan.limits || null} t={t} />
      </CardContent>
    </Card>
  )
}
