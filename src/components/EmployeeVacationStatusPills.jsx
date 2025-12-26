import { cn } from '../lib/utils'

const PILL_STYLES = {
  success: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  warning: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  info: 'border-indigo-200/70 bg-indigo-500/10 text-indigo-700',
  neutral: 'border-border/60 bg-muted/70 text-muted-foreground',
  danger: 'border-rose-200/70 bg-rose-500/10 text-rose-600',
}

const buildStatusLabel = ({ vacationStatus, isOnVacation }) => {
  if (isOnVacation) {
    return { label: 'Em ferias', tone: 'success' }
  }

  if (vacationStatus === 'scheduled') {
    return { label: 'Ferias marcadas', tone: 'info' }
  }

  return { label: 'Sem ferias marcadas', tone: 'neutral' }
}

export function EmployeeVacationStatusPills({
  vacationStatus = 'none',
  daysUsed,
  daysRemaining,
  hasPendingRequest = false,
  hasRejectedRequest = false,
  isOnVacation = false,
  isBlockedByAbsence = false,
  className,
}) {
  const pills = []
  const statusPill = buildStatusLabel({ vacationStatus, isOnVacation })
  if (statusPill) pills.push(statusPill)

  if (typeof daysUsed === 'number') {
    pills.push({ label: `${daysUsed} dias desfrutados`, tone: 'neutral' })
  }

  if (typeof daysRemaining === 'number') {
    pills.push({ label: `${daysRemaining} dias pendentes`, tone: 'info' })
  }

  if (hasPendingRequest) {
    pills.push({ label: 'Solicitacao pendente', tone: 'warning' })
  }

  if (hasRejectedRequest) {
    pills.push({ label: 'Solicitacao recusada', tone: 'danger' })
  }

  if (isBlockedByAbsence) {
    pills.push({ label: 'Bloqueado por ausencia', tone: 'danger' })
  }

  if (pills.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {pills.map((pill) => (
        <span
          key={pill.label}
          className={cn(
            'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
            PILL_STYLES[pill.tone] || PILL_STYLES.neutral,
          )}
        >
          {pill.label}
        </span>
      ))}
    </div>
  )
}
