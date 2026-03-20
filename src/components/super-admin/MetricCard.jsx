import { cn } from '../../lib/utils'

export function MetricCard({ label, value, helper, tone = 'default' }) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-200/60 bg-rose-500/10'
      : tone === 'warning'
        ? 'border-amber-200/60 bg-amber-500/10'
        : tone === 'success'
          ? 'border-emerald-200/60 bg-emerald-500/10'
          : 'border-border/70 bg-card/95'

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)]',
        toneClass,
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}
