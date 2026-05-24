import { MetricCard } from './MetricCard'

export function DashboardMetricGrid({ items = [] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((metric) => (
        <MetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          helper={metric.helper}
          tone={metric.tone}
        />
      ))}
    </section>
  )
}
