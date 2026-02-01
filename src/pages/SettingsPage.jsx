import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, BadgeCheck, Building2, Loader2, ShieldCheck } from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Switch } from '../components/ui/switch'
import { useAuthStore } from '../store/useAuth'
import { getCurrentCompanySubscription } from '../services/billingService'
import { cn } from '../lib/utils'

const SETTINGS_TABS = ['plan', 'preferences']

export default function Settings() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const [activeTab, setActiveTab] = useState('plan')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subscription, setSubscription] = useState(null)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [reminders, setReminders] = useState(true)
  const [autoReports, setAutoReports] = useState(false)

  const roles = useAuthStore((state) => state.roles)
  const companyId = useMemo(() => {
    if (!user) return null
    return user.company_id || user.companyId || user.company?.id || null
  }, [user])
  const canViewSubscription = useMemo(
    () => Array.isArray(roles) && roles.some((role) => ['super_admin'].includes(role)),
    [roles],
  )

  useEffect(() => {
    let active = true
    const loadSubscription = async () => {
      if (!companyId) {
        setError(t('settingsPage.errors.noCompany'))
        return
      }
      if (!canViewSubscription) {
        setError(t('settingsPage.errors.forbidden'))
        return
      }
      setLoading(true)
      setError('')
      try {
        const data = await getCurrentCompanySubscription(companyId)
        if (!active) return
        setSubscription(data)
      } catch (err) {
        if (!active) return
        const message = err?.response?.data?.message || err?.message || t('settingsPage.errors.load')
        setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSubscription()
    return () => {
      active = false
    }
  }, [canViewSubscription, companyId, t])

  const planCard = useMemo(() => {
    if (!subscription?.plan) return null
    const plan = subscription.plan
    const price = plan.priceCents ? plan.priceCents / 100 : 0
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: plan.currency || 'BRL',
      minimumFractionDigits: 2,
    })
    const intervalLabel =
      plan.billingInterval === 'year'
        ? t('access.subscription.perInterval.year')
        : plan.billingInterval === 'one_time'
          ? t('access.subscription.perInterval.oneTime')
          : t('access.subscription.perInterval.month')

    return {
      name: plan.name || t('settingsPage.plan.unknown'),
      description: plan.description || '',
      price: plan.priceCents ? formatter.format(price) : t('access.subscription.freePlan'),
      intervalLabel,
      status: subscription.status || '',
      trialEndsAt: subscription.trialEndsAt || '',
      currentPeriodEnd: subscription.currentPeriodEnd || '',
    }
  }, [subscription, t])

  const renderPlanTab = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border border-border/80 bg-card/90">
        <CardHeader className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {t('settingsPage.plan.title')}
            </p>
            <CardTitle className="text-xl">
              {planCard?.name || t('settingsPage.plan.unknown')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('settingsPage.loading')}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
              {error}
            </div>
          ) : planCard ? (
            <>
              <p className="text-sm text-muted-foreground">{planCard.description}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{planCard.price}</span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{planCard.intervalLabel}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {subscription?.status ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <BadgeCheck className="h-4 w-4" />
                    {t('settingsPage.plan.statusLabel', { status: subscription.status })}
                  </span>
                ) : null}
                {planCard.trialEndsAt ? (
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary text-[11px]">
                    {t('settingsPage.plan.trialEnds', { date: planCard.trialEndsAt })}
                  </span>
                ) : null}
                {planCard.currentPeriodEnd ? (
                  <span className="rounded-full bg-muted px-3 py-1 font-semibold text-foreground text-[11px]">
                    {t('settingsPage.plan.renews', { date: planCard.currentPeriodEnd })}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('settingsPage.plan.empty')}</p>
          )}
        </CardContent>
      </Card>
      <Card className="border border-border/80 bg-card/90">
        <CardHeader className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {t('settingsPage.security.title')}
            </p>
            <CardTitle className="text-xl">{t('settingsPage.security.heading')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('settingsPage.security.mfa')}</p>
              <p className="text-xs text-muted-foreground">{t('settingsPage.security.mfaHint')}</p>
            </div>
            <Button type="button" variant="outline" size="sm">
              {t('settingsPage.actions.manage')}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('settingsPage.security.sessions')}</p>
              <p className="text-xs text-muted-foreground">{t('settingsPage.security.sessionsHint')}</p>
            </div>
            <Button type="button" variant="outline" size="sm">
              {t('settingsPage.actions.view')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderPreferencesTab = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border border-border/80 bg-card/90">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('settingsPage.preferences.notifications')}
          </p>
          <CardTitle className="text-xl">{t('settingsPage.preferences.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('settingsPage.preferences.email')}</p>
              <p className="text-xs text-muted-foreground">{t('settingsPage.preferences.emailHint')}</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('settingsPage.preferences.reminders')}</p>
              <p className="text-xs text-muted-foreground">{t('settingsPage.preferences.remindersHint')}</p>
            </div>
            <Switch checked={reminders} onCheckedChange={setReminders} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('settingsPage.preferences.reports')}</p>
              <p className="text-xs text-muted-foreground">{t('settingsPage.preferences.reportsHint')}</p>
            </div>
            <Switch checked={autoReports} onCheckedChange={setAutoReports} />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 bg-card/90">
        <CardHeader className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {t('settingsPage.preferences.critical')}
            </p>
            <CardTitle className="text-xl">{t('settingsPage.preferences.criticalTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('settingsPage.preferences.criticalDescription')}</p>
          <Button type="button" variant="destructive" className="rounded-xl" size="sm">
            {t('settingsPage.actions.manageAccess')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <PageContainer className="pt-6 pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {t('settingsPage.badge')}
          </p>
          <h1 className="text-2xl font-semibold leading-tight">{t('settingsPage.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('settingsPage.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 p-1">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                activeTab === tab ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`settingsPage.tabs.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'plan' ? renderPlanTab() : renderPreferencesTab()}
    </PageContainer>
  )
}