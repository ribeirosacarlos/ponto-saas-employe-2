import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CalendarClock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import { useDateTime } from '../../hooks/useDateTime'
import { useSettingsSubscription } from '../../hooks/useSettingsSubscription'

const STATUS_TONES = {
  active: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100',
  canceling: 'border-amber-200/70 bg-amber-500/10 text-amber-700 dark:text-amber-100',
  canceled: 'border-border/70 bg-muted/60 text-muted-foreground',
}

function resolveStatus(subscription) {
  const rawStatus = String(subscription?.status || '').toLowerCase()
  const scheduledCancellation = subscription?.cancel_at_period_end === true
  const planActive = subscription?.is_plan_active === true

  if (rawStatus === 'canceled' || rawStatus === 'cancelled' || !planActive) {
    return 'canceled'
  }

  if (scheduledCancellation || rawStatus === 'canceling' || rawStatus === 'cancelling') {
    return 'canceling'
  }

  return 'active'
}

function DetailRow({ label, value }) {
  if (!value) return null

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

export function SubscriptionManagementCard({ canManage = false }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { formatDate } = useDateTime()
  const { data, isLoading, isCancelling, error, reload, cancel } = useSettingsSubscription()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const statusKey = useMemo(() => resolveStatus(data), [data])
  const accessUntil = data?.access_expires_at || data?.current_period_end || null
  const isScheduledForCancellation = data?.cancel_at_period_end === true || statusKey === 'canceling'
  const hasCanceled = statusKey === 'canceled'
  const buttonDisabled =
    isLoading || isCancelling || !canManage || isScheduledForCancellation || hasCanceled

  const statusLabel = t(`settingsPage.subscription.status.${statusKey}`)
  const dateLabel = hasCanceled
    ? t('settingsPage.subscription.fields.expiration')
    : t('settingsPage.subscription.fields.renewal')
  const dateValue = accessUntil ? formatDate(accessUntil) : t('settingsPage.subscription.notAvailable')
  const accessMessage = accessUntil
    ? t('settingsPage.subscription.accessUntil', { date: formatDate(accessUntil) })
    : t('settingsPage.subscription.accessUntilFallback')

  const handleConfirmCancellation = async () => {
    try {
      const response = await cancel()
      const nextAccessUntil = response?.access_expires_at || response?.current_period_end || accessUntil
      setIsDialogOpen(false)
      toast({
        title: t('settingsPage.subscription.toast.successTitle'),
        description: nextAccessUntil
          ? t('settingsPage.subscription.toast.successDescription', {
              date: formatDate(nextAccessUntil),
            })
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

  if (isLoading) {
    return (
      <Card className="border border-border/80 bg-card/90">
        <CardHeader className="pb-2">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('settingsPage.subscription.title')}
          </p>
          <CardTitle className="text-lg">{t('settingsPage.subscription.loadingTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('settingsPage.loading')}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card className="border border-border/80 bg-card/90">
        <CardHeader className="pb-2">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('settingsPage.subscription.title')}
          </p>
          <CardTitle className="text-lg">{t('settingsPage.subscription.errorTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
            {error}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            {t('settingsPage.preferences.actions.reload')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border border-border/80 bg-card/90">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {t('settingsPage.subscription.title')}
              </p>
              <CardTitle className="text-lg">{t('settingsPage.subscription.heading')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('settingsPage.subscription.subtitle')}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                STATUS_TONES[statusKey] || STATUS_TONES.active,
              )}
            >
              {statusLabel}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailRow label={dateLabel} value={dateValue} />
            <DetailRow
              label={t('settingsPage.subscription.fields.scheduledCancellation')}
              value={isScheduledForCancellation ? t('settingsPage.subscription.yes') : t('settingsPage.subscription.no')}
            />
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                {isScheduledForCancellation ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      {t('settingsPage.subscription.scheduledTitle')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('settingsPage.subscription.scheduledAccessUntil', { date: dateValue })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-foreground">{accessMessage}</p>
                )}
              </div>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {canManage ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                disabled={buttonDisabled}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('settingsPage.subscription.actions.cancelling')}
                  </>
                ) : (
                  t('settingsPage.subscription.actions.cancel')
                )}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settingsPage.subscription.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('settingsPage.subscription.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>{t('settingsPage.subscription.dialog.keepAccess')}</p>
            <p>{t('settingsPage.subscription.dialog.blockAfter')}</p>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t('common.actions.cancel')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="secondary"
              onClick={handleConfirmCancellation}
              disabled={isCancelling}
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
