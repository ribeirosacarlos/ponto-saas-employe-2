import { AlertOctagon, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { getHealthStatusMeta } from '../../features/superAdmin/utils'

export function TopCompaniesCards({ t, activityCompanies = [], riskCompanies = [] }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <TopActivityCard t={t} companies={activityCompanies} />
      <TopRiskCard t={t} companies={riskCompanies} />
    </section>
  )
}

function TopActivityCard({ t, companies }) {
  return (
    <Card className="rounded-[28px] border-border/80 bg-card/95 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t('superAdmin.dashboard.rankings.activityEyebrow', 'Ranking')}
            </p>
            <CardTitle className="mt-1 text-base">
              {t('superAdmin.dashboard.rankings.activityTitle', 'Empresas com maior atividade')}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                'superAdmin.dashboard.rankings.activityDescription',
                'Empresas com maior volume de uso e times mais ativos no período recente.',
              )}
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Trophy className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {companies.length > 0 ? (
          <div className="space-y-3">
            {companies.slice(0, 5).map((company, index) => (
              <div key={company.id} className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {index + 1}. {company.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(company.slug || '--') + ' • ' + t('superAdmin.dashboard.rankings.activeUsers', '{{count}} ativos 30d', { count: company.activeBillableUsers30d })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {t('superAdmin.dashboard.rankings.timeEntries', '{{count}} batidas', { count: company.timeEntries30d })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-8 text-sm text-muted-foreground">
            {t('superAdmin.dashboard.rankings.activityEmpty', 'Nenhum ranking de atividade disponível.')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TopRiskCard({ t, companies }) {
  return (
    <Card className="rounded-[28px] border-border/80 bg-card/95 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t('superAdmin.dashboard.rankings.riskEyebrow', 'Risco')}
            </p>
            <CardTitle className="mt-1 text-base">
              {t('superAdmin.dashboard.rankings.riskTitle', 'Empresas com maior risco')}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                'superAdmin.dashboard.rankings.riskDescription',
                'Contas que pedem atenção imediata por sinais de bloqueio, atraso ou queda de uso.',
              )}
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <AlertOctagon className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {companies.length > 0 ? (
          <div className="space-y-3">
            {companies.slice(0, 5).map((company, index) => {
              const healthMeta = getHealthStatusMeta(company.healthStatus, t)
              return (
                <div key={company.id} className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {index + 1}. {company.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[
                          company.blocked ? t('superAdmin.dashboard.rankings.blocked', 'bloqueada') : null,
                          company.pastDue ? t('superAdmin.dashboard.rankings.pastDue', 'em atraso') : null,
                          company.inactiveDays
                            ? t('superAdmin.dashboard.rankings.inactiveDays', '{{count}} dias sem atividade', {
                                count: company.inactiveDays,
                              })
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' • ') || '--'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-foreground">
                        {t('superAdmin.dashboard.rankings.riskScore', 'Score {{value}}', { value: company.riskScore })}
                      </span>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${healthMeta.className}`}>
                        {healthMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-8 text-sm text-muted-foreground">
            {t('superAdmin.dashboard.rankings.riskEmpty', 'Nenhum ranking de risco disponível.')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
