import { BadgeCheck, CalendarClock, CreditCard, Users } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { cn } from '../../lib/utils'

const STATUS_STYLES = {
  active: 'bg-emerald-500/12 text-emerald-700 border-emerald-200/70 dark:text-emerald-200',
  past_due: 'bg-amber-500/12 text-amber-700 border-amber-200/70 dark:text-amber-100',
  trialing: 'bg-sky-500/12 text-sky-700 border-sky-200/70 dark:text-sky-100',
  canceled: 'bg-rose-500/12 text-rose-700 border-rose-200/70 dark:text-rose-100',
  default: 'bg-muted text-foreground border-border/70',
}

const formatPrice = (plan) => {
  if (!plan?.price_cents) return '—'
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
    minimumFractionDigits: 2,
  })
  const interval = plan.billing_interval === 'year'
    ? ' / ano'
    : plan.billing_interval === 'one_time'
      ? ' (pontual)'
      : ' / mês'
  return `${formatter.format(plan.price_cents / 100)}${interval}`
}

const getStatusTone = (status) => {
  if (!status) return STATUS_STYLES.default
  const key = String(status).toLowerCase()
  if (STATUS_STYLES[key]) return STATUS_STYLES[key]
  return STATUS_STYLES.default
}

export function SettingsSummaryCards({ billing, flags, usage }) {
  const plan = billing?.plan
  const subscription = billing?.subscription
  const billableUsers = usage?.billable_users || usage?.employees || {}
  const hasLimit = billableUsers.limit !== null && billableUsers.limit !== undefined
  const usagePercent = hasLimit
    ? Math.min(100, Math.round((billableUsers.current / (billableUsers.limit || 1)) * 100))
    : null

  const daysRemaining = subscription?.trial_days_remaining ?? subscription?.billing_days_remaining ?? null
  const daysLabel = subscription?.trial_days_remaining !== undefined && subscription?.trial_days_remaining !== null
    ? 'dias de teste restantes'
    : 'dias até faturamento'

  const statusLabel =
    subscription?.status_label ||
    subscription?.subscription_status ||
    subscription?.status ||
    (flags?.is_subscription_active ? 'Ativa' : '')

  const statusTone = getStatusTone(subscription?.status || subscription?.subscription_status)

  const cards = [
    {
      id: 'plan',
      icon: CreditCard,
      title: 'Plano',
      value: plan?.name || 'Não informado',
      helper: plan?.billing_interval ? formatPrice(plan) : plan?.price_cents ? formatPrice(plan) : null,
    },
    {
      id: 'status',
      icon: BadgeCheck,
      title: 'Status',
      value: statusLabel || 'Sem status',
      helper: flags?.is_trial ? 'Conta em período de teste' : null,
      tone: statusTone,
    },
    {
      id: 'days',
      icon: CalendarClock,
      title: 'Período',
      value: daysRemaining !== null && daysRemaining !== undefined ? `${daysRemaining} dias` : '—',
      helper: daysRemaining !== null && daysRemaining !== undefined ? daysLabel : 'Sem datas registradas',
    },
    {
      id: 'usage',
      icon: Users,
      title: 'Usuários contabilizados',
      value: hasLimit ? `${billableUsers.current || 0} / ${billableUsers.limit}` : `${billableUsers.current || 0}`,
      helper: billableUsers.over_limit ? 'Acima do limite' : hasLimit ? 'Uso do plano' : 'Limite não definido',
      progress: usagePercent,
    },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.id} className="border border-border/80 bg-card/90">
            <CardContent className="flex items-start gap-3 pt-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{card.title}</p>
                  {card.tone ? (
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', card.tone)}>
                      {card.value}
                    </span>
                  ) : null}
                </div>
                {!card.tone ? <p className="text-lg font-semibold text-foreground">{card.value}</p> : null}
                {card.helper ? <p className="text-[12px] text-muted-foreground">{card.helper}</p> : null}
                {card.progress !== null && card.progress !== undefined ? (
                  <div className="mt-1">
                    <div className="h-2 w-full rounded-full bg-muted/70">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${card.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{card.progress}% da capacidade</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
