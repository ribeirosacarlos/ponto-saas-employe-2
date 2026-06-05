import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Activity, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'
import { formatSuperAdminCompactNumber } from '../../features/superAdmin/utils'

const chartConfig = {
  value: {
    label: 'Value',
    color: 'var(--chart-1)',
  },
}

const WINDOW_OPTIONS = ['30d', '60d', '90d']

export function ActivitySeriesChart({ t, dashboard, locale }) {
  const [metric, setMetric] = useState('timeEntries')
  const [windowKey, setWindowKey] = useState('30d')

  const seriesMap = metric === 'timeEntries' ? dashboard?.timeEntriesSeries : dashboard?.activeCompaniesSeries
  const chartRows = seriesMap?.[windowKey] ?? []

  const total = useMemo(
    () => chartRows.reduce((sum, item) => sum + Number(item?.value ?? 0), 0),
    [chartRows],
  )

  const title =
    metric === 'timeEntries'
      ? t('superAdmin.dashboard.series.timeEntriesTitle', 'Batidas por período')
      : t('superAdmin.dashboard.series.activeCompaniesTitle', 'Empresas ativas por período')

  const description =
    metric === 'timeEntries'
      ? t(
          'superAdmin.dashboard.series.timeEntriesDescription',
          'Série diária entregue pela API para acompanhar volume de registros.',
        )
      : t(
          'superAdmin.dashboard.series.activeCompaniesDescription',
          'Série diária de empresas com atividade observada na plataforma.',
        )

  return (
    <Card className="rounded-[28px] border-border/80 bg-card/95 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)]">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t('superAdmin.dashboard.series.eyebrow', 'Séries temporais')}
            </p>
            <CardTitle className="mt-1 text-base">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TogglePill
              active={metric === 'timeEntries'}
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              label={t('superAdmin.dashboard.series.timeEntriesPill', 'Batidas')}
              onClick={() => setMetric('timeEntries')}
            />
            <TogglePill
              active={metric === 'activeCompanies'}
              icon={<Activity className="h-3.5 w-3.5" />}
              label={t('superAdmin.dashboard.series.activeCompaniesPill', 'Empresas ativas')}
              onClick={() => setMetric('activeCompanies')}
            />
            {WINDOW_OPTIONS.map((option) => (
              <TogglePill key={option} active={windowKey === option} label={option.toUpperCase()} onClick={() => setWindowKey(option)} />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('superAdmin.dashboard.series.totalLabel', 'Total no período')}</p>
            <p className="text-2xl font-semibold text-foreground">{formatSuperAdminCompactNumber(total, locale)}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('superAdmin.dashboard.series.windowLabel', 'Janela {{value}}', { value: windowKey.toUpperCase() })}
          </p>
        </div>

        {chartRows.length > 0 ? (
          <ChartContainer className="aspect-[22/8] w-full" config={chartConfig}>
            <AreaChart data={chartRows} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="super-admin-series" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} className="stroke-border" />
              <XAxis
                axisLine={false}
                dataKey="date"
                minTickGap={28}
                tickFormatter={(value) =>
                  new Date(`${value}T12:00:00`).toLocaleDateString(locale || 'pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  })
                }
                tickLine={false}
                tickMargin={8}
              />
              <YAxis axisLine={false} tickLine={false} tickMargin={8} width={44} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload
                      if (!row?.date) return ''
                      return new Date(`${row.date}T12:00:00`).toLocaleDateString(locale || 'pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                fill="url(#super-admin-series)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-8 text-sm text-muted-foreground">
            {t('superAdmin.dashboard.series.empty', 'Nenhuma série disponível para este período.')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TogglePill({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border/70 bg-background/70 text-muted-foreground hover:border-primary/20 hover:text-foreground',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}
