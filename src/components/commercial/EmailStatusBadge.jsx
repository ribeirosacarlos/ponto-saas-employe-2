const SEND_COLORS = {
  queued: 'bg-muted text-muted-foreground',
  sent: 'bg-muted text-muted-foreground',
  delivered: 'bg-emerald-500/12 text-emerald-600',
  opened: 'bg-emerald-500/18 text-emerald-600',
  clicked: 'bg-emerald-500/25 text-emerald-700',
  bounced: 'bg-destructive/15 text-destructive',
  complained: 'bg-destructive/15 text-destructive',
  failed: 'bg-destructive/15 text-destructive',
  cancelled: 'bg-muted/60 text-muted-foreground/70',
}

const SEND_LABELS = {
  queued: 'Na fila',
  sent: 'Enviado',
  delivered: 'Entregue',
  opened: 'Aberto',
  clicked: 'Clicado',
  bounced: 'Bounce',
  complained: 'Reclamação',
  failed: 'Falhou',
  cancelled: 'Cancelado',
}

const ENROLLMENT_COLORS = {
  active: 'bg-emerald-500/15 text-emerald-600',
  paused: 'bg-amber-500/15 text-amber-600',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted/60 text-muted-foreground/70',
}

const ENROLLMENT_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export function EmailStatusBadge({ status, kind = 'send' }) {
  const colors = kind === 'enrollment' ? ENROLLMENT_COLORS : SEND_COLORS
  const labels = kind === 'enrollment' ? ENROLLMENT_LABELS : SEND_LABELS
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${colors[status] ?? 'bg-muted text-muted-foreground'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export const EXIT_REASON_LABELS = {
  replied: 'Respondeu',
  unsubscribed: 'Descadastrou',
  bounced: 'Bounce',
  complained: 'Reclamação',
  manual_cancel: 'Cancelado manualmente',
  lead_converted: 'Lead convertido',
  lead_lost: 'Lead perdido',
  send_failed_permanently: 'Falha permanente de envio',
}
