import { CreditCard, RefreshCw, ShieldCheck, Sparkles, ToggleLeft, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '../components/ui/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { useCallback, useMemo, useState } from 'react'
import { useBillingPlans, restoreLastPlanSelection, restoreLastReason } from '../hooks/useBillingPlans'
import { PlanCard } from '../components/billing/PlanCard'
import { createCheckoutSession, normalizePlanInterval } from '../services/billingService'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/useAuth'

const INTERVALS = [
  { key: 'monthly', labelKey: 'access.subscription.monthly' },
  { key: 'yearly', labelKey: 'access.subscription.yearly' },
]

export default function SubscribePage({ message, onRetry }) {
  const { t } = useTranslation()
  const lastReason = restoreLastReason()
  const { toast } = useToast()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState(() => restoreLastPlanSelection()?.id || '')
  const user = useAuthStore((state) => state.user)
  const {
    plans,
    loading,
    error,
    selectedInterval,
    setSelectedInterval,
    refetch,
    featuredPlanId,
    persistPlanSelection,
  } = useBillingPlans({ reason: lastReason || 'trial_or_subscription' })

  const handleCheckout = useCallback(async (plan) => {
    const companyId = user?.company_id || user?.companyId || user?.company?.id || null
    if (!companyId) {
      toast({
        title: t('access.subscription.checkoutErrorTitle', 'Nao foi possivel iniciar o checkout'),
        description: t('access.subscription.companyMissing', 'Empresa não encontrada. Entre novamente e tente de novo.'),
        variant: 'error',
      })
      return
    }

    const targetPlan = plan || plans.find((item) => item.id === selectedPlanId) || plans[0]
    if (!targetPlan) return
    setCheckoutLoading(true)
    setSelectedPlanId(targetPlan.id)
    persistPlanSelection(targetPlan)

    try {
      const interval = normalizePlanInterval(targetPlan)
      const url = await createCheckoutSession({
        planId: targetPlan.id,
        planSlug: targetPlan.slug,
        interval,
        companyId,
      })
      window.location.href = url
    } catch (err) {
      const friendly =
        err?.response?.data?.message ||
        err?.message ||
        t('access.subscription.errorFallback', 'Falha ao criar checkout. Tente novamente.')
      toast({
        title: t('access.subscription.checkoutErrorTitle', 'Nao foi possivel iniciar o checkout'),
        description: friendly,
        variant: 'error',
      })
    } finally {
      setCheckoutLoading(false)
    }
  }, [persistPlanSelection, plans, selectedPlanId, t, toast, user])

  const handleRetry = () => {
    if (typeof onRetry === 'function') onRetry()
    refetch()
  }

  const formattedPlans = useMemo(
    () =>
      (plans || []).map((plan) => {
        const priceCents = plan.priceCents ?? plan.price_cents ?? 0
        const currency = plan.currency || 'BRL'
        const billingInterval = plan.billingInterval || plan.billing_interval || 'month'
        const trialDays = plan.trialDays ?? plan.trial_days
        const formatter = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
        })
        const isCurrent = plan.is_current || plan.isCurrent || false

        return {
          ...plan,
          isCurrent,
          priceLabel: priceCents ? formatter.format(priceCents / 100) : t('access.subscription.freePlan', 'Gratis'),
          intervalLabel:
            billingInterval === 'year'
              ? t('access.subscription.perInterval.year', '/ano')
              : billingInterval === 'one_time'
                ? t('access.subscription.perInterval.oneTime', 'pagamento unico')
                : t('access.subscription.perInterval.month', '/mes'),
          trialLabel: trialDays
            ? t('access.subscription.trialLabel', { count: trialDays, defaultValue: `${trialDays} dias de trial` })
            : '',
          featuresList: Array.isArray(plan.features)
            ? plan.features
            : typeof plan.features === 'object'
              ? Object.entries(plan.features)
                .map(([key, value]) => {
                  if (typeof value === 'string') return value
                  if (value === true) return key
                  if (value && typeof value === 'object' && value.label) return value.label
                  return null
                })
                .filter(Boolean)
              : [],
          ctaLabel: t('access.subscription.choosePlan'),
          currentLabel: t('access.subscription.currentPlan', 'Plano atual'),
          featuredBadge: t('access.subscription.recommended', 'Recomendado'),
        }
      }),
    [plans, t],
  )

  return (
    <PageContainer className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-6xl bg-card/90">
        <CardHeader className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t('access.subscription.badge')}
            </p>
            <CardTitle className="text-2xl leading-tight">
              {t('access.subscription.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('access.subscription.description')}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-rose-300/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-[0_18px_40px_-30px_rgba(244,63,94,0.45)] dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-50">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-500 dark:text-rose-300" />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-200">
                  {t('access.subscription.blockedTitle')}
                </p>
                <p className="text-sm leading-relaxed">
                  {message || t('access.subscription.blockedDescription')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 rounded-full border border-border/70 bg-muted/40 px-3 py-2 text-sm">
              <ToggleLeft className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {t('access.subscription.intervalLabel', 'Intervalo')}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 p-1">
              {INTERVALS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedInterval(option.key)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    selectedInterval === option.key
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t('access.subscription.perk1')}
                </p>
                <p className="text-xs text-muted-foreground">{t('access.subscription.perk1Desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t('access.subscription.perk2')}
                </p>
                <p className="text-xs text-muted-foreground">{t('access.subscription.perk2Desc')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t('access.subscription.plansTitle')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('access.subscription.plansSubtitle')}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => handleCheckout()}>
                {t('access.subscription.genericCheckout')}
              </Button>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="h-36 rounded-xl border border-border/70 bg-muted/40 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-amber-300/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
                <div className="flex items-start justify-between gap-3">
                  <span>{error}</span>
                  <Button type="button" size="sm" variant="outline" onClick={handleRetry}>
                    <RefreshCw className="h-4 w-4" />
                    {t('access.shared.retry')}
                  </Button>
                </div>
              </div>
            ) : !formattedPlans.length ? (
              <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {t('access.subscription.empty', 'Nenhum plano disponivel no momento.')}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {formattedPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    featured={plan.id === featuredPlanId}
                    disabled={plan.isCurrent}
                    loading={checkoutLoading && selectedPlanId === plan.id}
                    onSelect={() => handleCheckout(plan)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => handleCheckout()}>
              {t('access.subscription.startCheckout')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              disabled={!onRetry}
            >
              <RefreshCw className="h-4 w-4" />
              {t('access.shared.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
