import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useDateTime } from '@/hooks/useDateTime'
import { useSettingsOverview } from '@/hooks/useSettingsOverview'
import { useSettingsSubscription } from '@/hooks/useSettingsSubscription'

const STATUS_BADGES = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  trialing: 'border-sky-200 bg-sky-50 text-sky-700',
  canceling: 'border-amber-200 bg-amber-50 text-amber-700',
  past_due: 'border-amber-200 bg-amber-50 text-amber-700',
  canceled: 'border-rose-200 bg-rose-50 text-rose-700',
  default: 'border-slate-200 bg-slate-100 text-slate-600',
}

function formatCurrency(value, currency = 'BRL') {
  if (value === null || value === undefined || value === '') return '--'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value) / 100)
}

function getIntervalSuffix(interval, t) {
  if (interval === 'year') return t('access.subscription.perInterval.year', '/ano')
  if (interval === 'one_time') return t('access.subscription.perInterval.oneTime', 'pagamento unico')
  return t('access.subscription.perInterval.month', '/mes')
}

function getCycleLabel(interval, t) {
  if (interval === 'year') return t('settingsPage.plan.cycle.yearly', 'Anual')
  if (interval === 'one_time') return t('settingsPage.plan.cycle.oneTime', 'Unico')
  return t('settingsPage.plan.cycle.monthly', 'Mensal')
}

function resolveSubscriptionState(subscription) {
  const rawStatus = String(
    subscription?.status || subscription?.subscription_status || '',
  ).toLowerCase()
  const scheduledCancellation = subscription?.cancel_at_period_end === true
  const planActive = subscription?.is_plan_active

  if (rawStatus === 'canceled' || rawStatus === 'cancelled' || planActive === false) return 'canceled'
  if (scheduledCancellation || rawStatus === 'canceling' || rawStatus === 'cancelling') return 'canceling'
  if (rawStatus === 'trialing') return 'trialing'
  if (rawStatus === 'past_due') return 'past_due'
  if (rawStatus === 'active') return 'active'
  return 'active'
}

function InlineNotice({ children, tone = 'default' }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2 text-sm',
        tone === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-700',
        tone === 'default' && 'border-border/70 bg-muted/30 text-muted-foreground',
      )}
    >
      {children}
    </div>
  )
}

export function PlanSection() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { formatDate } = useDateTime()

  const { data, isLoading, error, reload } = useSettingsOverview()
  const {
    data: managedSubscription,
    isLoading: subscriptionLoading,
    isCancelling,
    error: subscriptionError,
    cancel,
  } = useSettingsSubscription(true)

  const [isSubscriptionManagementOpen, setIsSubscriptionManagementOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

  const billing = data?.billing || null
  const links = data?.links || null
  const plan = billing?.plan || {}
  const overviewSubscription = billing?.subscription || {}
  const activeSubscription = managedSubscription || overviewSubscription
  const subscriptionStatusKey = resolveSubscriptionState(activeSubscription)

  const subscriptionStatusLabel =
    subscriptionStatusKey === 'active'
      ? t('settingsPage.subscription.status.active')
      : subscriptionStatusKey === 'canceling'
        ? t('settingsPage.subscription.status.canceling')
        : subscriptionStatusKey === 'canceled'
          ? t('settingsPage.subscription.status.canceled')
          : activeSubscription?.status_label ||
            activeSubscription?.status ||
            t('settingsPage.plan.status.unknown')

  const usage = data?.usage || null
  const billableUsers = usage?.billable_users || usage?.employees || {}
  const hasUserLimit = billableUsers.limit !== null && billableUsers.limit !== undefined
  const usagePercent = hasUserLimit
    ? Math.min(100, Math.round(((billableUsers.current || 0) / (billableUsers.limit || 1)) * 100))
    : 0

  const accessUntil = activeSubscription?.access_expires_at || activeSubscription?.current_period_end || null
  const cancelDisabled =
    subscriptionLoading ||
    isCancelling ||
    subscriptionStatusKey === 'canceling' ||
    subscriptionStatusKey === 'canceled'

  const handleCancelSubscription = async () => {
    try {
      const response = await cancel()
      const nextDate = response?.access_expires_at || response?.current_period_end || accessUntil
      setIsCancelDialogOpen(false)
      toast({
        title: t('settingsPage.subscription.toast.successTitle'),
        description: nextDate
          ? t('settingsPage.subscription.toast.successDescription', { date: formatDate(nextDate) })
          : t('settingsPage.subscription.toast.successDescriptionFallback'),
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: t('settingsPage.subscription.toast.errorTitle'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('settingsPage.subscription.toast.errorDescription'),
        variant: 'error',
      })
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">
            {t('settingsPage.plan.title', 'Plano')}
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t('settingsPage.plan.subtitle', 'Status da assinatura e uso da empresa.')}
          </p>
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('settingsPage.loading')}
          </div>
        ) : billing ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                  <h2 className="text-xl font-medium text-foreground">
                    {plan?.name || t('settingsPage.plan.unknown')}
                  </h2>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                      STATUS_BADGES[subscriptionStatusKey] || STATUS_BADGES.default,
                    )}
                  >
                    {subscriptionStatusLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  {t('settingsPage.plan.labels.price', 'Preco')}{' '}
                  <span className="text-foreground">
                    {`${formatCurrency(plan?.price_cents, plan?.currency || 'BRL')}${getIntervalSuffix(plan?.billing_interval, t)}`}
                  </span>
                </span>
                <span className="text-border">|</span>
                <span>
                  {t('settingsPage.plan.labels.interval', 'Ciclo')}{' '}
                  <span className="text-foreground">{getCycleLabel(plan?.billing_interval, t)}</span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">
                  {hasUserLimit
                    ? t('settingsPage.plan.usage.withLimit', {
                        current: billableUsers.current ?? 0,
                        limit: billableUsers.limit ?? 0,
                      })
                    : t('settingsPage.plan.usage.withoutLimit', {
                        current: billableUsers.current ?? 0,
                      })}
                </span>
                {billableUsers.over_limit ? (
                  <span className="text-xs font-medium text-amber-700">
                    {t('settingsPage.plan.usage.overLimit')}
                  </span>
                ) : null}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    billableUsers.over_limit ? 'bg-amber-500' : 'bg-primary',
                  )}
                  style={{ width: `${hasUserLimit ? usagePercent : 24}%` }}
                />
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSubscriptionManagementOpen(true)}
                className="rounded-full border-border/70 bg-transparent shadow-none"
              >
                {t('settingsPage.actions.manageSubscription', 'Gerenciar assinatura')}
              </Button>
            </div>

            {accessUntil ? (
              <p className="text-sm text-muted-foreground">
                {subscriptionStatusKey === 'canceling'
                  ? t('settingsPage.subscription.scheduledAccessUntil', {
                      date: formatDate(accessUntil),
                    })
                  : t('settingsPage.subscription.accessUntil', { date: formatDate(accessUntil) })}
              </p>
            ) : null}

            {subscriptionError ? <InlineNotice tone="error">{subscriptionError}</InlineNotice> : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {error || t('settingsPage.plan.empty')}
            </p>
            {error ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reload}
                className="rounded-full border-border/70 bg-transparent shadow-none"
              >
                {t('settingsPage.preferences.actions.reload', 'Recarregar')}
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={isSubscriptionManagementOpen} onOpenChange={setIsSubscriptionManagementOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settingsPage.actions.manageSubscription', 'Gerenciar assinatura')}</DialogTitle>
            <DialogDescription>
              {t(
                'settingsPage.subscription.manageDescription',
                'Abra o portal de cobranca ou solicite o cancelamento da renovacao automatica.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{plan?.name || t('settingsPage.plan.unknown')}</p>
              {accessUntil ? (
                <p className="mt-1">
                  {subscriptionStatusKey === 'canceling'
                    ? t('settingsPage.subscription.scheduledAccessUntil', {
                        date: formatDate(accessUntil),
                      })
                    : t('settingsPage.subscription.accessUntil', { date: formatDate(accessUntil) })}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start rounded-xl border-border/70 bg-transparent shadow-none"
                disabled={!links?.customer_portal_url}
                onClick={() => window.location.assign(links.customer_portal_url)}
              >
                {t('settingsPage.plan.actions.portal', 'Portal do cliente')}
              </Button>

              <button
                type="button"
                className="text-left text-sm font-medium text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:text-rose-300"
                disabled={cancelDisabled}
                onClick={() => {
                  setIsSubscriptionManagementOpen(false)
                  setIsCancelDialogOpen(true)
                }}
              >
                {isCancelling
                  ? t('settingsPage.subscription.actions.cancelling')
                  : t('settingsPage.subscription.actions.cancel')}
              </button>
            </div>

            {subscriptionError ? <InlineNotice tone="error">{subscriptionError}</InlineNotice> : null}
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="shadow-none">
                {t('common.actions.close', 'Fechar')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settingsPage.subscription.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('settingsPage.subscription.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>{t('settingsPage.subscription.dialog.keepAccess')}</p>
            <p className="mt-2">{t('settingsPage.subscription.dialog.blockAfter')}</p>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="shadow-none">
                {t('common.actions.cancel', 'Cancelar')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="secondary"
              disabled={isCancelling}
              onClick={handleCancelSubscription}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('settingsPage.subscription.actions.cancelling')}
                </>
              ) : (
                t('settingsPage.subscription.dialog.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
