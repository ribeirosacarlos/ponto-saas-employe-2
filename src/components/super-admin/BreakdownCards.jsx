import { Pie, PieChart, Cell } from 'recharts'
import { Layers3, PieChart as PieChartIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '../ui/chart'
import { formatSuperAdminCompactNumber } from '../../features/superAdmin/utils'

const STATUS_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#94a3b8', '#14b8a6']
const PLAN_COLORS = ['#1d4ed8', '#0f766e', '#7c3aed', '#ea580c', '#16a34a', '#475569']

export function BreakdownCards({ t, dashboard, locale }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <BreakdownChartCard
        t={t}
        locale={locale}
        title={t('superAdmin.dashboard.breakdowns.subscriptionTitle', 'Distribuição por assinatura')}
        description={t(
          'superAdmin.dashboard.breakdowns.subscriptionDescription',
          'Contagem de empresas por status de assinatura retornada pelo backend.',
        )}
        eyebrow={t('superAdmin.dashboard.breakdowns.subscriptionEyebrow', 'Assinaturas')}
        icon={<PieChartIcon className="h-5 w-5" />}
        items={dashboard?.subscriptionStatusBreakdown ?? []}
        colors={STATUS_COLORS}
      />
      <BreakdownChartCard
        t={t}
        locale={locale}
        title={t('superAdmin.dashboard.breakdowns.planTitle', 'Distribuição por plano')}
        description={t(
          'superAdmin.dashboard.breakdowns.planDescription',
          'Leitura atual da base de empresas segmentada por plano cadastrado.',
        )}
        eyebrow={t('superAdmin.dashboard.breakdowns.planEyebrow', 'Planos')}
        icon={<Layers3 className="h-5 w-5" />}
        items={dashboard?.planBreakdown ?? []}
        colors={PLAN_COLORS}
      />
    </section>
  )
}

function BreakdownChartCard({ t, locale, title, description, eyebrow, icon, items, colors }) {
  const rows = items.map((item, index) => ({
    ...item,
    fill: colors[index % colors.length],
  }))

  const config = rows.reduce((acc, item) => {
    acc[item.key] = { label: item.label, color: item.fill }
    return acc
  }, { value: { label: 'Value' } })

  return (
    <Card className="rounded-[28px] border-border/80 bg-card/95 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
            <CardTitle className="mt-1 text-base">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <ChartContainer className="mx-auto aspect-square max-h-72 w-full" config={config}>
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="key" innerRadius={42} outerRadius="82%" strokeWidth={4}>
                  {rows.map((row) => (
                    <Cell key={row.id} fill={row.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <ChartLegend content={<ChartLegendContent nameKey="key" className="flex-wrap" />} />
              </PieChart>
            </ChartContainer>
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.fill }} />
                      <span className="text-sm text-foreground">{row.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatSuperAdminCompactNumber(row.value, locale)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-8 text-sm text-muted-foreground">
            {t('superAdmin.dashboard.breakdowns.empty', 'Nenhum breakdown disponível.')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
