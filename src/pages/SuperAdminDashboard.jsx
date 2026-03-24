import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, AlertTriangle, Building2, CreditCard, RefreshCcw, ShieldAlert, Users } from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { MetricCard } from '../components/super-admin/MetricCard'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useSuperAdminDashboard } from '../features/superAdmin/useSuperAdminDashboard'
import { formatCurrencyEUR, formatSuperAdminDateTime } from '../features/superAdmin/utils'

const ACCESS_REQUIRES = { anyOf: ['super_admin'] }

export default function SuperAdminDashboard() {
  const { t, i18n } = useTranslation()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])
  const { dashboard, loading, error, refreshDashboard } = useSuperAdminDashboard({ enabled: hasAccess, t })

  const metrics = useMemo(() => {
    if (!dashboard) return []

    return [
      {
        label: t('superAdmin.dashboard.metrics.companiesTotal', 'Empresas totais'),
        value: dashboard.companies.total,
      },
      {
        label: t('superAdmin.dashboard.metrics.companiesActive30d', 'Empresas ativas 30 dias'),
        value: dashboard.companies.activeLast30Days,
        tone: 'success',
      },
      {
        label: t('superAdmin.dashboard.metrics.companiesTrial', 'Empresas trial'),
        value: dashboard.companies.trialing,
      },
      {
        label: t('superAdmin.dashboard.metrics.companiesPaying', 'Empresas pagantes'),
        value: dashboard.companies.paying,
        tone: 'success',
      },
      {
        label: t('superAdmin.dashboard.metrics.companiesPastDue', 'Empresas past_due'),
        value: dashboard.companies.pastDue,
        tone: 'danger',
      },
      {
        label: t('superAdmin.dashboard.metrics.companiesAtRisk', 'Empresas em risco'),
        value: dashboard.companies.atRisk,
        tone: 'warning',
      },
      {
        label: t('superAdmin.dashboard.metrics.employeesTotal', 'Colaboradores totais'),
        value: dashboard.employees.total,
      },
      {
        label: t('superAdmin.dashboard.metrics.employeesActive30d', 'Colaboradores ativos 30 dias'),
        value: dashboard.employees.activeLast30Days,
      },
      {
        label: t('superAdmin.dashboard.metrics.timeEntriesToday', 'Pontos hoje'),
        value: dashboard.timeEntries.today,
      },
      {
        label: t('superAdmin.dashboard.metrics.timeEntries30d', 'Pontos 30 dias'),
        value: dashboard.timeEntries.last30Days,
      },
      {
        label: t('superAdmin.dashboard.metrics.mrr', 'MRR estimado'),
        value: formatCurrencyEUR(dashboard.revenue.estimatedMrr, i18n.language),
      },
      {
        label: t('superAdmin.dashboard.metrics.averageTicket', 'Ticket medio'),
        value: formatCurrencyEUR(dashboard.revenue.averageTicket, i18n.language),
      },
    ]
  }, [dashboard, i18n.language, t])

  if (!hasAccess) {
    return (
      <PageContainer className="py-6">
        <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-6 text-sm text-muted-foreground">
          {t('superAdmin.shared.errors.forbidden', 'Voce nao tem permissao para acessar esta area.')}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6 py-6">
      <AppTopBar
        icon={<ShieldAlert className="h-5 w-5" />}
        eyebrow={t('superAdmin.nav.section', 'Super Admin')}
        title={t('superAdmin.dashboard.title', 'Dashboard da plataforma')}
        subtitle={t(
          'superAdmin.dashboard.subtitle',
          'Visao consolidada de operacao, assinatura e atividade das empresas.',
        )}
        meta={
          dashboard?.generatedAt
            ? t('superAdmin.dashboard.generatedAt', {
                defaultValue: 'Gerado em {{value}}',
                value: formatSuperAdminDateTime(dashboard.generatedAt, i18n.language),
              })
            : undefined
        }
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => refreshDashboard()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {t('superAdmin.shared.actions.refresh', 'Atualizar')}
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={`super-admin-dashboard-skeleton-${index}`}
              className="h-28 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
            />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600">
          <p className="font-semibold">{t('superAdmin.shared.states.errorTitle', 'Algo deu errado')}</p>
          <p className="mt-1">{error}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 rounded-full px-3"
            onClick={() => refreshDashboard()}
          >
            {t('superAdmin.shared.actions.retry', 'Tentar novamente')}
          </Button>
        </div>
      ) : null}

      {!loading && !error && !dashboard ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">
            {t('superAdmin.dashboard.states.emptyTitle', 'Nenhum dado disponivel')}
          </p>
          <p className="mt-1">
            {t(
              'superAdmin.dashboard.states.emptyDescription',
              'O dashboard ainda nao retornou indicadores para exibir.',
            )}
          </p>
        </div>
      ) : null}

      {!loading && !error && dashboard ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                helper={metric.helper}
                tone={metric.tone}
              />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {t('superAdmin.dashboard.blocks.subscriptionsTag', 'Assinaturas')}
                  </p>
                  <CardTitle className="text-base">
                    {t('superAdmin.dashboard.blocks.subscriptionsTitle', 'Saude de billing')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row
                  label={t('superAdmin.dashboard.blocks.trialing', 'Empresas em trial')}
                  value={dashboard.companies.trialing}
                />
                <Row
                  label={t('superAdmin.dashboard.blocks.paying', 'Empresas pagantes')}
                  value={dashboard.companies.paying}
                />
                <Row
                  label={t('superAdmin.dashboard.blocks.pastDue', 'Empresas em atraso')}
                  value={dashboard.companies.pastDue}
                  valueClassName="text-rose-600"
                />
                <Row
                  label={t('superAdmin.dashboard.blocks.expiring', 'Vencendo em 7 dias')}
                  value={dashboard.companies.expiringIn7Days}
                  valueClassName="text-amber-700"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Activity className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {t('superAdmin.dashboard.blocks.operationsTag', 'Operacao')}
                  </p>
                  <CardTitle className="text-base">
                    {t('superAdmin.dashboard.blocks.operationsTitle', 'Uso da plataforma')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row
                  label={t('superAdmin.dashboard.blocks.activeCompanies7d', 'Empresas ativas 7 dias')}
                  value={dashboard.companies.activeLast7Days}
                />
                <Row
                  label={t('superAdmin.dashboard.blocks.activeCompanies30d', 'Empresas ativas 30 dias')}
                  value={dashboard.companies.activeLast30Days}
                />
                <Row
                  label={t('superAdmin.dashboard.blocks.timeEntries7d', 'Pontos 7 dias')}
                  value={dashboard.timeEntries.last7Days}
                />
                <Row
                  label={t('superAdmin.dashboard.blocks.newCompanies30d', 'Novas empresas 30 dias')}
                  value={dashboard.companies.newLast30Days}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {t('superAdmin.dashboard.blocks.riskTag', 'Risco')}
                  </p>
                  <CardTitle className="text-base">
                    {t('superAdmin.dashboard.blocks.riskTitle', 'Indicadores sensiveis')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row
                  label={t('superAdmin.dashboard.blocks.blockedCompanies', 'Empresas bloqueadas')}
                  value={dashboard.companies.blocked}
                  valueClassName="text-rose-600"
                />
                <Row
                  label={t('superAdmin.dashboard.blocks.atRiskCompanies', 'Empresas em risco')}
                  value={dashboard.companies.atRisk}
                  valueClassName="text-amber-700"
                />
                <Row
                  label={t('superAdmin.dashboard.blocks.totalEmployees', 'Colaboradores totais')}
                  value={dashboard.employees.total}
                />
                <Row
                  label={t('superAdmin.dashboard.blocks.activeEmployees30d', 'Colaboradores ativos 30 dias')}
                  value={dashboard.employees.activeLast30Days}
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('superAdmin.dashboard.notes.title', 'Observacoes')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <p className="font-semibold text-foreground">
                    {t('superAdmin.dashboard.notes.mrrTitle', 'MRR e ticket medio')}
                  </p>
                  <p className="mt-1">
                    {t(
                      'superAdmin.dashboard.notes.mrrDescription',
                      'Os valores exibidos sao estimativas de receita, nao faturamento realizado.',
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <p className="font-semibold text-foreground">
                    {t('superAdmin.dashboard.notes.employeeTitle', 'Modelo de colaboradores')}
                  </p>
                  <p className="mt-1">
                    {t(
                      'superAdmin.dashboard.notes.employeeDescription',
                      'O backend considera employee como usuarios vinculados por company_id.',
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{t('superAdmin.dashboard.snapshot.title', 'Snapshot')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row
                  icon={<Building2 className="h-4 w-4" />}
                  label={t('superAdmin.dashboard.snapshot.companies', 'Empresas')}
                  value={dashboard.companies.total}
                />
                <Row
                  icon={<Users className="h-4 w-4" />}
                  label={t('superAdmin.dashboard.snapshot.employees', 'Colaboradores')}
                  value={dashboard.employees.total}
                />
                <Row
                  icon={<Activity className="h-4 w-4" />}
                  label={t('superAdmin.dashboard.snapshot.timeEntries', 'Batidas 30 dias')}
                  value={dashboard.timeEntries.last30Days}
                />
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </PageContainer>
  )
}

function Row({ icon, label, value, valueClassName }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon ? <span className="text-primary">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <span className={`text-sm font-semibold text-foreground ${valueClassName || ''}`}>{value}</span>
    </div>
  )
}
