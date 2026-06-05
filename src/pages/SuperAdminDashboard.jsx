import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeEuro,
  Building2,
  CreditCard,
  RefreshCcw,
  ShieldAlert,
  TimerReset,
  Users,
} from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useSuperAdminDashboard } from '../features/superAdmin/useSuperAdminDashboard'
import { formatSuperAdminCurrency, formatSuperAdminDateTime } from '../features/superAdmin/utils'
import { DashboardMetricGrid } from '../components/super-admin/DashboardMetricGrid'
import { DashboardPanel, DashboardRow } from '../components/super-admin/DashboardPanel'
import { ActivitySeriesChart } from '../components/super-admin/ActivitySeriesChart'
import { BreakdownCards } from '../components/super-admin/BreakdownCards'
import { RecentEventsCard } from '../components/super-admin/RecentEventsCard'
import { TopCompaniesCards } from '../components/super-admin/TopCompaniesCards'

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
        label: t('superAdmin.dashboard.metrics.companiesPastDue', 'Empresas em atraso'),
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
        label: t('superAdmin.dashboard.metrics.timeEntriesToday', 'Batidas hoje'),
        value: dashboard.timeEntries.today,
      },
      {
        label: t('superAdmin.dashboard.metrics.timeEntries30d', 'Batidas 30 dias'),
        value: dashboard.timeEntries.last30Days,
      },
      {
        label: t('superAdmin.dashboard.metrics.mrr', 'MRR estimado'),
        value: formatSuperAdminCurrency(dashboard.revenue.estimatedMrr, dashboard.revenue.currency, i18n.language),
        tone: 'success',
      },
      {
        label: t('superAdmin.dashboard.metrics.averageTicket', 'Ticket medio'),
        value: formatSuperAdminCurrency(dashboard.revenue.averageTicket, dashboard.revenue.currency, i18n.language),
      },
    ]
  }, [dashboard, i18n.language, t])

  const snapshotRows = useMemo(() => {
    if (!dashboard) return []

    return [
      {
        icon: <Building2 className="h-4 w-4" />,
        label: t('superAdmin.dashboard.snapshot.companies', 'Empresas'),
        value: dashboard.companies.total,
      },
      {
        icon: <Users className="h-4 w-4" />,
        label: t('superAdmin.dashboard.snapshot.employees', 'Colaboradores'),
        value: dashboard.employees.total,
      },
      {
        icon: <Activity className="h-4 w-4" />,
        label: t('superAdmin.dashboard.snapshot.timeEntries', 'Batidas 30 dias'),
        value: dashboard.timeEntries.last30Days,
      },
      {
        icon: <BadgeEuro className="h-4 w-4" />,
        label: t('superAdmin.dashboard.snapshot.revenue', 'MRR atual'),
        value: formatSuperAdminCurrency(dashboard.revenue.estimatedMrr, dashboard.revenue.currency, i18n.language),
      },
    ]
  }, [dashboard, i18n.language, t])

  const heroHighlights = useMemo(() => {
    if (!dashboard) return []

    return [
      {
        label: t('superAdmin.dashboard.hero.highlights.newCompanies', 'Novas empresas 30 dias'),
        value: dashboard.companies.newLast30Days,
        hint: t('superAdmin.dashboard.hero.highlights.newCompaniesHint', 'Crescimento recente da base'),
      },
      {
        label: t('superAdmin.dashboard.hero.highlights.active7d', 'Empresas ativas 7 dias'),
        value: dashboard.companies.activeLast7Days,
        hint: t('superAdmin.dashboard.hero.highlights.active7dHint', 'Uso observado na última semana'),
      },
      {
        label: t('superAdmin.dashboard.hero.highlights.expiring', 'Vencendo em 7 dias'),
        value: dashboard.companies.expiringIn7Days,
        hint: t('superAdmin.dashboard.hero.highlights.expiringHint', 'Renovações que exigem acompanhamento'),
      },
    ]
  }, [dashboard, t])

  if (!hasAccess) {
    return (
      <PageContainer className="py-6">
        <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-6 text-sm text-muted-foreground">
          {t('superAdmin.shared.errors.forbidden', 'Você não tem permissão para acessar esta área.')}
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
          'Visão consolidada de operação, assinatura e atividade das empresas.',
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
            {t('superAdmin.dashboard.states.emptyTitle', 'Nenhum dado disponível')}
          </p>
          <p className="mt-1">
            {t(
              'superAdmin.dashboard.states.emptyDescription',
              'O dashboard ainda não retornou indicadores para exibir.',
            )}
          </p>
        </div>
      ) : null}

      {!loading && !error && dashboard ? (
        <>
          <section className="grid gap-4 lg:grid-cols-12">
            <Card className="rounded-[28px] border-border/80 bg-card/95 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] lg:col-span-8">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        {t('superAdmin.dashboard.hero.eyebrow', 'Visão da plataforma')}
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                        {t('superAdmin.dashboard.hero.title', 'Resumo executivo do super admin')}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t(
                          'superAdmin.dashboard.hero.description',
                          'Acompanhe expansão da base, saúde de billing, atividade recente e sinais de risco usando apenas os dados já entregues pela plataforma.',
                        )}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                      <ArrowUpRight className="h-4 w-4" />
                      {t('superAdmin.dashboard.hero.badge', 'Snapshot consolidado')}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {heroHighlights.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-border/70 bg-background/60 px-4 py-4">
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <DashboardPanel
              className="lg:col-span-4"
              icon={<TimerReset className="h-5 w-5" />}
              eyebrow={t('superAdmin.dashboard.snapshot.eyebrow', 'Snapshot')}
              title={t('superAdmin.dashboard.snapshot.title', 'Leitura rápida')}
              description={t(
                'superAdmin.dashboard.snapshot.description',
                'Resumo curto dos principais volumes da plataforma neste recorte.',
              )}
              rows={snapshotRows}
            />
          </section>

          <DashboardMetricGrid items={metrics} />

          <section className="grid gap-4 xl:grid-cols-3">
            <DashboardPanel
              icon={<CreditCard className="h-5 w-5" />}
              eyebrow={t('superAdmin.dashboard.blocks.subscriptionsTag', 'Assinaturas')}
              title={t('superAdmin.dashboard.blocks.subscriptionsTitle', 'Saúde de billing')}
              description={t(
                'superAdmin.dashboard.blocks.subscriptionsDescription',
                'Status atuais de monetização, risco de cobrança e renovações próximas.',
              )}
              rows={[
                {
                  label: t('superAdmin.dashboard.blocks.trialing', 'Empresas em trial'),
                  value: dashboard.companies.trialing,
                },
                {
                  label: t('superAdmin.dashboard.blocks.paying', 'Empresas pagantes'),
                  value: dashboard.companies.paying,
                  valueClassName: 'text-emerald-700',
                },
                {
                  label: t('superAdmin.dashboard.blocks.pastDue', 'Empresas em atraso'),
                  value: dashboard.companies.pastDue,
                  valueClassName: 'text-rose-600',
                },
                {
                  label: t('superAdmin.dashboard.blocks.expiring', 'Vencendo em 7 dias'),
                  value: dashboard.companies.expiringIn7Days,
                  valueClassName: 'text-amber-700',
                },
              ]}
              footer={
                <DashboardRow
                  icon={<BadgeEuro className="h-4 w-4" />}
                  label={t('superAdmin.dashboard.blocks.averageTicket', 'Ticket médio')}
                  hint={t(
                    'superAdmin.dashboard.blocks.averageTicketHint',
                    'Valor médio estimado com base nas assinaturas atuais.',
                  )}
                  value={formatSuperAdminCurrency(
                    dashboard.revenue.averageTicket,
                    dashboard.revenue.currency,
                    i18n.language,
                  )}
                />
              }
            />

            <DashboardPanel
              icon={<Activity className="h-5 w-5" />}
              eyebrow={t('superAdmin.dashboard.blocks.operationsTag', 'Operação')}
              title={t('superAdmin.dashboard.blocks.operationsTitle', 'Uso da plataforma')}
              description={t(
                'superAdmin.dashboard.blocks.operationsDescription',
                'Leituras agregadas de atividade já observáveis pelo endpoint atual.',
              )}
              rows={[
                {
                  label: t('superAdmin.dashboard.blocks.activeCompanies7d', 'Empresas ativas 7 dias'),
                  value: dashboard.companies.activeLast7Days,
                },
                {
                  label: t('superAdmin.dashboard.blocks.activeCompanies30d', 'Empresas ativas 30 dias'),
                  value: dashboard.companies.activeLast30Days,
                },
                {
                  label: t('superAdmin.dashboard.blocks.timeEntries7d', 'Batidas 7 dias'),
                  value: dashboard.timeEntries.last7Days,
                },
                {
                  label: t('superAdmin.dashboard.blocks.newCompanies30d', 'Novas empresas 30 dias'),
                  value: dashboard.companies.newLast30Days,
                },
              ]}
            />

            <DashboardPanel
              icon={<AlertTriangle className="h-5 w-5" />}
              eyebrow={t('superAdmin.dashboard.blocks.riskTag', 'Risco')}
              title={t('superAdmin.dashboard.blocks.riskTitle', 'Indicadores sensíveis')}
              description={t(
                'superAdmin.dashboard.blocks.riskDescription',
                'Itens que pedem acompanhamento manual mais próximo pelo super admin.',
              )}
              rows={[
                {
                  label: t('superAdmin.dashboard.blocks.blockedCompanies', 'Empresas bloqueadas'),
                  value: dashboard.companies.blocked,
                  valueClassName: 'text-rose-600',
                },
                {
                  label: t('superAdmin.dashboard.blocks.atRiskCompanies', 'Empresas em risco'),
                  value: dashboard.companies.atRisk,
                  valueClassName: 'text-amber-700',
                },
                {
                  label: t('superAdmin.dashboard.blocks.totalEmployees', 'Colaboradores totais'),
                  value: dashboard.employees.total,
                },
                {
                  label: t('superAdmin.dashboard.blocks.activeEmployees30d', 'Colaboradores ativos 30 dias'),
                  value: dashboard.employees.activeLast30Days,
                },
              ]}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-12">
            <DashboardPanel
              className="lg:col-span-7"
              icon={<Building2 className="h-5 w-5" />}
              eyebrow={t('superAdmin.dashboard.notes.eyebrow', 'Leituras e limites')}
              title={t('superAdmin.dashboard.notes.title', 'Notas operacionais')}
              description={t(
                'superAdmin.dashboard.notes.description',
                'Contexto importante para interpretar corretamente os números exibidos nesta página.',
              )}
              rows={[
                {
                  label: t('superAdmin.dashboard.notes.mrrTitle', 'MRR e ticket médio'),
                  value: t('superAdmin.dashboard.notes.valueEstimated', 'Estimado'),
                  hint: t(
                    'superAdmin.dashboard.notes.mrrDescription',
                    'Os valores exibidos são estimativas de receita, não faturamento liquidado.',
                  ),
                },
                {
                  label: t('superAdmin.dashboard.notes.employeeTitle', 'Modelo de colaboradores'),
                  value: t('superAdmin.dashboard.notes.valueBilling', 'Billing'),
                  hint: t(
                    'superAdmin.dashboard.notes.employeeDescription',
                    'A contagem deve refletir usuários faturáveis e usuários com ponto, não apenas perfis com role employee.',
                  ),
                },
              ]}
            />

            <DashboardPanel
              className="lg:col-span-5"
              icon={<CreditCard className="h-5 w-5" />}
              eyebrow={t('superAdmin.dashboard.revenue.eyebrow', 'Receita')}
              title={t('superAdmin.dashboard.revenue.title', 'Receita estimada')}
              description={t(
                'superAdmin.dashboard.revenue.description',
                'Visão consolidada dos indicadores monetários entregues pela API.',
              )}
              rows={[
                {
                  label: t('superAdmin.dashboard.revenue.mrr', 'MRR estimado'),
                  value: formatSuperAdminCurrency(
                    dashboard.revenue.estimatedMrr,
                    dashboard.revenue.currency,
                    i18n.language,
                  ),
                  valueClassName: 'text-emerald-700',
                },
                {
                  label: t('superAdmin.dashboard.revenue.averageTicket', 'Ticket médio'),
                  value: formatSuperAdminCurrency(
                    dashboard.revenue.averageTicket,
                    dashboard.revenue.currency,
                    i18n.language,
                  ),
                },
                {
                  label: t('superAdmin.dashboard.revenue.currency', 'Moeda'),
                  value: dashboard.revenue.currency || '--',
                },
              ]}
            />
          </section>

          <ActivitySeriesChart t={t} dashboard={dashboard} locale={i18n.language} />

          <BreakdownCards t={t} dashboard={dashboard} locale={i18n.language} />

          <section className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <RecentEventsCard t={t} events={dashboard.recentEvents} locale={i18n.language} />
            </div>
            <div className="lg:col-span-5">
              <DashboardPanel
                icon={<Activity className="h-5 w-5" />}
                eyebrow={t('superAdmin.dashboard.apiCoverage.eyebrow', 'Cobertura')}
                title={t('superAdmin.dashboard.apiCoverage.title', 'Blocos conectados à API')}
                description={t(
                  'superAdmin.dashboard.apiCoverage.description',
                  'Visão rápida do volume de dados já refletido nos blocos analíticos desta página.',
                )}
                rows={[
                  {
                    label: t('superAdmin.dashboard.apiCoverage.timeSeries', 'Séries temporais'),
                    value: dashboard.timeEntriesSeries?.['30d']?.length || 0,
                    hint: t('superAdmin.dashboard.apiCoverage.timeSeriesHint', 'Pontos carregados na janela de 30 dias'),
                  },
                  {
                    label: t('superAdmin.dashboard.apiCoverage.events', 'Eventos recentes'),
                    value: dashboard.recentEvents?.length || 0,
                    hint: t('superAdmin.dashboard.apiCoverage.eventsHint', 'Itens recebidos para o feed da plataforma'),
                  },
                  {
                    label: t('superAdmin.dashboard.apiCoverage.activityRanking', 'Ranking de atividade'),
                    value: dashboard.topCompaniesByActivity?.length || 0,
                    hint: t('superAdmin.dashboard.apiCoverage.activityRankingHint', 'Empresas listadas pelo backend'),
                  },
                  {
                    label: t('superAdmin.dashboard.apiCoverage.riskRanking', 'Ranking de risco'),
                    value: dashboard.topCompaniesByRisk?.length || 0,
                    hint: t('superAdmin.dashboard.apiCoverage.riskRankingHint', 'Empresas sinalizadas por risco calculado'),
                  },
                ]}
              />
            </div>
          </section>

          <TopCompaniesCards
            t={t}
            activityCompanies={dashboard.topCompaniesByActivity}
            riskCompanies={dashboard.topCompaniesByRisk}
          />
        </>
      ) : null}
    </PageContainer>
  )
}
