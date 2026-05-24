import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../../lib/utils'

export function DashboardPanel({
  icon,
  eyebrow,
  title,
  description,
  rows = [],
  footer,
  className,
}) {
  return (
    <Card
      className={cn(
        'rounded-[28px] border-border/80 bg-card/95 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)]',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
          ) : null}
          <CardTitle className="mt-1 text-base">{title}</CardTitle>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <DashboardRow
            key={row.label}
            icon={row.icon}
            label={row.label}
            value={row.value}
            hint={row.hint}
            valueClassName={row.valueClassName}
          />
        ))}
        {footer ? <div className="border-t border-border/70 pt-3">{footer}</div> : null}
      </CardContent>
    </Card>
  )
}

export function DashboardRow({ icon, label, value, hint, valueClassName }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon ? <span className="text-primary">{icon}</span> : null}
            <span className="text-sm">{label}</span>
          </div>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn('text-sm font-semibold text-foreground', valueClassName)}>{value}</span>
      </div>
    </div>
  )
}
