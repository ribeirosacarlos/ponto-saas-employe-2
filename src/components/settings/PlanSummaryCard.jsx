import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BadgeCheck,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useDateTime } from '../../hooks/useDateTime'

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
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
    minimumFractionDigits: 2,
  })
  return `${formatter.format(plan.price_cents / 100)} / ${intervalLabel(plan.billing_interval, t)}`
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

export function PlanSummaryCard({ billing, usage, links }) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateTime()
  const [showDetails, setShowDetails] = useState(false)

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

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!links?.customer_portal_url}
            onClick={() => openUrl(links?.customer_portal_url)}
            title={
              links?.customer_portal_url ? undefined : t('settingsPage.plan.actions.portalDisabled')
            }
          >
            <ExternalLink className="h-4 w-4" />
            {t('settingsPage.plan.actions.portal')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4" />
                {t('settingsPage.plan.actions.hideDetails')}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                {t('settingsPage.plan.actions.viewDetails')}
              </>
            )}
          </Button>
        </div>

        {showDetails ? (
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <DetailItem
                label={t('settingsPage.plan.labels.nextAction')}
                value={subscription.next_action}
              />
              <DetailItem
                label={t('settingsPage.plan.labels.trialDays')}
                value={
                  subscription.trial_days_remaining !== null &&
                  subscription.trial_days_remaining !== undefined
                    ? subscription.trial_days_remaining
                    : null
                }
              />
              <DetailItem
                label={t('settingsPage.plan.labels.billingDays')}
                value={
                  subscription.billing_days_remaining !== null &&
                  subscription.billing_days_remaining !== undefined
                    ? subscription.billing_days_remaining
                    : null
                }
              />
              <DetailItem
                label={t('settingsPage.plan.labels.cancelAtPeriodEnd')}
                value={
                  subscription.cancel_at_period_end === null ||
                  subscription.cancel_at_period_end === undefined
                    ? null
                    : subscription.cancel_at_period_end
                      ? t('settingsPage.plan.labels.yes')
                      : t('settingsPage.plan.labels.no')
                }
              />
              <DetailItem
                label={t('settingsPage.plan.labels.endsAt')}
                value={
                  subscription.subscription_ends_at
                    ? formatDateTime(subscription.subscription_ends_at)
                    : null
                }
              />
            </div>

            <LimitsList limits={limits} t={t} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
