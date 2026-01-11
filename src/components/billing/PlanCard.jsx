import { BadgeCheck, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export function PlanCard({
  plan,
  featured,
  onSelect,
  disabled,
  loading,
}) {
  const priceLabel = plan.priceLabel || plan.price || ''
  const intervalLabel = plan.intervalLabel || ''
  const features = Array.isArray(plan.featuresList) ? plan.featuresList : []
  const badge = featured ? plan.featuredBadge || 'Recomendado' : plan.badge

  return (
    <Card
      className={cn(
        'border border-border/80 bg-card/85 transition hover:-translate-y-1 hover:shadow-[0_28px_70px_-45px_rgba(62,82,152,0.55)]',
        featured ? 'border-primary/60 shadow-[0_30px_90px_-50px_rgba(62,82,152,0.7)]' : '',
      )}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            {plan.description ? (
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            ) : null}
          </div>
          {badge ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold">{priceLabel}</span>
          {intervalLabel ? (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{intervalLabel}</span>
          ) : null}
        </div>
        {plan.trialLabel ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <BadgeCheck className="h-4 w-4" />
            {plan.trialLabel}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {features.length ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {features.map((feature, index) => (
              <li key={`${feature}-${index}`} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <Button
          type="button"
          className="w-full rounded-xl"
          disabled={disabled || loading}
          onClick={() => onSelect?.(plan)}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {plan.isCurrent
            ? plan.currentLabel || 'Plano atual'
            : plan.ctaLabel || 'Assinar agora'}
        </Button>
      </CardContent>
    </Card>
  )
}
