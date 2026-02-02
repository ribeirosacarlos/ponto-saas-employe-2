import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCcw, ShieldCheck } from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { PlanSummaryCard } from '../components/settings/PlanSummaryCard'
import { CompanyCard } from '../components/settings/CompanyCard'
import { PreferencesCard } from '../components/settings/PreferencesCard'
// import { SecurityCard } from '../components/settings/SecurityCard'
import { useSettingsOverview } from '../hooks/useSettingsOverview'
import { useAuthStore } from '../store/useAuth'
import { getCapabilitiesFromRoles } from '../auth/acl'
import { useTimezoneStore } from '../store/useTimezone'

const SettingsSkeleton = () => (
  <div className="space-y-4">
    <div className="h-24 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
    <div className="h-72 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-64 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
      <div className="h-64 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
    </div>
    <div className="h-56 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
  </div>
)

const EmptyState = ({ message, onRetry }) => {
  const { t } = useTranslation()
  return (
    <Card className="border border-border/80 bg-card/90">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          {t('settingsPage.header.actions.reload')}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { data, isLoading, error, reload } = useSettingsOverview()
  const overview = data || {}

  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const canEditTimezone = useMemo(
    () => capabilities.includes('admin') || capabilities.includes('super_admin'),
    [capabilities],
  )

  const setTimezone = useTimezoneStore((state) => state.setTimezone)

  useEffect(() => {
    if (overview?.company?.timezone) {
      setTimezone(overview.company.timezone)
    }
  }, [overview?.company?.timezone, setTimezone])

  const links = overview.links || {}
  const hasPortal = Boolean(links.customer_portal_url)
  const hasCheckout = Boolean(links.checkout_url)
  const manageTarget = links.checkout_url || links.customer_portal_url || '/billing/subscribe'

  const hasContent = useMemo(
    () =>
      Boolean(
        overview?.billing ||
          overview?.company ||
          overview?.security ||
          overview?.compliance ||
          overview?.usage,
      ),
    [overview],
  )

  const openExternal = (url) => {
    if (!url || typeof window === 'undefined') return
    const isExternal = /^https?:\/\//i.test(url)
    if (isExternal) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.assign(url)
    }
  }

  return (
    <div className="relative min-h-screen bg-transparent text-foreground">
      <PageContainer className="relative z-10 flex flex-col gap-5 py-6">
        <AppTopBar
          icon={<ShieldCheck className="h-5 w-5" />}
          eyebrow={t('settingsPage.header.title')}
          title={t('settingsPage.header.title')}
          subtitle={t('settingsPage.header.subtitle')}
          filters={
            error
              ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-3 py-1 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
                  {error}
                </div>
              )
              : null
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={reload}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('settingsPage.header.actions.reload')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => openExternal(manageTarget)}
              >
                {t('settingsPage.header.actions.manageSubscription')}
              </Button>
              {hasCheckout ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openExternal(links.checkout_url)}
                >
                  {t('settingsPage.header.actions.updatePlan')}
                </Button>
              ) : null}
            </div>
          }
        />

        {isLoading ? (
          <SettingsSkeleton />
        ) : !hasContent ? (
          <EmptyState message={error || t('settingsPage.states.empty')} onRetry={reload} />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <CompanyCard company={overview.company} />
              <PreferencesCard
                company={overview.company}
                canEdit={canEditTimezone}
                onTimezoneSaved={reload}
              />
            </div>

            <PlanSummaryCard billing={overview.billing} usage={overview.usage} links={links} />

            {/* <SecurityCard security={overview.security} compliance={overview.compliance} /> */}
          </div>
        )}
      </PageContainer>
    </div>
  )
}
