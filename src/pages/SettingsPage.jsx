import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CreditCard,
  Globe2,
  Link as LinkIcon,
  LockKeyhole,
  RefreshCcw,
  Radar,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  HelpCircle,
  Info,
  Users,
} from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { PlanSummaryCard } from '../components/settings/PlanSummaryCard'
import { CompanyCard } from '../components/settings/CompanyCard'
import { PreferencesCard } from '../components/settings/PreferencesCard'
import { SecurityCard } from '../components/settings/SecurityCard'
import { useSettingsOverview } from '../hooks/useSettingsOverview'
import { useAuthStore } from '../store/useAuth'
import { getCapabilitiesFromRoles } from '../auth/acl'
import { fetchCompanyTimezone, updateCompanyTimezone } from '../services/companyTimezoneService'

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const STATUS_TONES = {
  active: 'bg-emerald-500/12 text-emerald-700 border-emerald-200/70 dark:text-emerald-100',
  past_due: 'bg-amber-500/12 text-amber-700 border-amber-200/70 dark:text-amber-100',
  trialing: 'bg-sky-500/12 text-sky-700 border-sky-200/70 dark:text-sky-100',
  canceled: 'bg-rose-500/12 text-rose-700 border-rose-200/70 dark:text-rose-100',
  default: 'bg-muted text-foreground border-border/70',
}

const valueOrPlaceholder = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  return value
}

const formatBooleanValue = (value) => {
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  return 'Não informado'
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPrice = (plan) => {
  if (!plan?.price_cents) return '—'
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
    minimumFractionDigits: 2,
  })
  const intervalLabel =
    plan.billing_interval === 'year'
      ? 'ano'
      : plan.billing_interval === 'one_time'
        ? 'única vez'
        : 'mês'
  return `${formatter.format(plan.price_cents / 100)} / ${intervalLabel}`
}

const StatusBadge = ({ status, label }) => {
  if (!status && !label) return <span className="text-sm text-muted-foreground">—</span>
  const key = String(status || '').toLowerCase()
  const tone = STATUS_TONES[key] || STATUS_TONES.default
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold', tone)}>
      <BadgeCheck className="h-3.5 w-3.5" />
      {label || status}
    </span>
  )
}

const SectionCard = ({ icon: Icon, title, description, children, className }) => (
  <Card className={cn('border border-border/80 bg-card/90', className)}>
    <CardHeader className="flex flex-row items-start gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
)

const KeyValue = ({ label, value, helper }) => (
  <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{valueOrPlaceholder(value)}</p>
    {helper ? <p className="text-[11px] text-muted-foreground">{helper}</p> : null}
  </div>
)

const LimitsList = ({ limits }) => {
  if (!limits || typeof limits !== 'object') return null
  const entries = Object.entries(limits)
  if (!entries.length) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Limites do plano</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <KeyValue key={key} label={key} value={value} />
        ))}
      </div>
    </div>
  )
}

const WorkdayDays = ({ days }) => {
  if (!Array.isArray(days) || !days.length) return <p className="text-sm text-muted-foreground">Nenhuma jornada padrão configurada.</p>
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Dias da jornada</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {days.map((day) => {
          const weekdayLabel = WEEKDAY_LABELS[Number(day.weekday) - 1] || `Dia ${day.weekday}`
          const interval =
            day.start_time && day.end_time
              ? `${day.start_time} - ${day.end_time}`
              : 'Horário não definido'
          return (
            <div key={`${day.weekday}-${day.start_time}-${day.end_time}`} className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-sm font-semibold text-foreground">{weekdayLabel}</p>
              <p className="text-[12px] text-muted-foreground">{interval}</p>
              <p className="text-[11px] text-muted-foreground">
                {day.is_working_day ? 'Dia de trabalho' : 'Folga'} {day.break_expected ? '• Intervalo esperado' : ''}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SettingsSkeleton = () => (
  <div className="space-y-4">
    <div className="h-24 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
    <div className="h-72 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-64 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
      <div className="h-64 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
    </div>
    <div className="h-56 animate-pulse rounded-[22px] border border-border/70 bg-card/80" />
  </div>
)

const EmptyState = ({ onRetry }) => (
  <Card className="border border-border/80 bg-card/90">
    <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertCircle className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Nenhuma informação de configurações foi retornada. Tente recarregar ou confirme suas permissões.
      </p>
      <Button type="button" onClick={onRetry}>
        Tentar novamente
      </Button>
    </CardContent>
  </Card>
)

const BillingCard = ({ billing, links }) => {
  const plan = billing?.plan
  const subscription = billing?.subscription

  return (
    <SectionCard
      icon={CreditCard}
      title="Plano e Assinatura"
      description="Visão completa do plano, status de cobrança e IDs Stripe."
    >
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <KeyValue label="Nome do plano" value={plan?.name} helper={plan?.slug ? `Slug: ${plan.slug}` : null} />
          <KeyValue label="Preço" value={formatPrice(plan)} helper={plan?.currency ? `Moeda: ${plan.currency}` : null} />
          <KeyValue label="Ciclo" value={plan?.billing_interval || '—'} />
          <KeyValue label="Limites" value={plan?.limits ? 'Personalizados' : 'Nenhum limite informado'} />
        </div>

        {plan?.limits ? <LimitsList limits={plan.limits} /> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Assinatura</p>
            <StatusBadge status={subscription?.status || subscription?.subscription_status} label={subscription?.status_label} />
            <KeyValue label="Status label" value={subscription?.status_label} />
            <KeyValue label="Status da assinatura" value={subscription?.subscription_status} />
            <KeyValue label="Próxima ação" value={subscription?.next_action} />
            <KeyValue label="Dias de trial restantes" value={subscription?.trial_days_remaining} />
            <KeyValue label="Dias até faturamento" value={subscription?.billing_days_remaining} />
            <KeyValue label="Stripe Customer ID" value={subscription?.stripe_customer_id} />
            <KeyValue label="Stripe Subscription ID" value={subscription?.stripe_subscription_id} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Datas e períodos</p>
            <KeyValue label="Trial termina em" value={formatDateTime(subscription?.trial_ends_at)} helper={subscription?.trial_days_remaining !== null && subscription?.trial_days_remaining !== undefined ? `${subscription.trial_days_remaining} dias restantes` : null} />
            <KeyValue label="Próximo ciclo" value={formatDateTime(subscription?.current_period_end)} helper={subscription?.billing_days_remaining !== null && subscription?.billing_days_remaining !== undefined ? `${subscription.billing_days_remaining} dias até faturamento` : null} />
            <KeyValue label="Término da assinatura" value={formatDateTime(subscription?.subscription_ends_at)} />
            <KeyValue label="Cancelar ao fim do período" value={formatBooleanValue(subscription?.cancel_at_period_end)} />
            <KeyValue label="Cancelada em" value={formatDateTime(subscription?.canceled_at)} />
          </div>
        </div>

        {links ? (
          <div className="flex flex-wrap gap-2">
            <InlineActionLink label="Checkout" url={links.checkout_url} />
            <InlineActionLink label="Portal do cliente" url={links.customer_portal_url} />
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}

const InlineActionLink = ({ label, url }) => {
  if (!url) return null
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-[12px] text-foreground">
      <LinkIcon className="h-3.5 w-3.5" />
      <a href={url} target="_blank" rel="noreferrer" className="underline decoration-primary/70 decoration-2 underline-offset-2">
        {label}
      </a>
    </span>
  )
}

const TimezoneCard = ({ canEdit }) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timezone, setTimezone] = useState('')
  const [availableTimezones, setAvailableTimezones] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  const filteredTimezones = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return availableTimezones
    return availableTimezones.filter((tz) => tz.toLowerCase().includes(term))
  }, [availableTimezones, searchTerm])

  const loadTimezone = useCallback(async () => {
    setLoading(true)
    setError('')
    setValidationErrors({})
    try {
      const response = await fetchCompanyTimezone()
      const nextTz = response.timezone || ''
      setTimezone(nextTz)
      setSearchTerm(nextTz)
      setAvailableTimezones(Array.isArray(response.available_timezones) ? response.available_timezones : [])
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível carregar o fuso horário.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTimezone()
  }, [loadTimezone])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canEdit || !timezone) return
    setSaving(true)
    setValidationErrors({})
    try {
      const response = await updateCompanyTimezone(timezone)
      const savedTz = response.timezone || timezone
      setTimezone(savedTz)
      setSearchTerm(savedTz)
      setAvailableTimezones(Array.isArray(response.available_timezones) ? response.available_timezones : [])
      toast({
        title: 'Fuso horário atualizado',
        description: 'A empresa agora usa o novo timezone.',
        variant: 'success',
      })
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {}
      setValidationErrors(apiErrors)
      const message =
        apiErrors?.timezone?.join?.(', ') ||
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível salvar o timezone.'
      toast({
        title: 'Erro ao salvar',
        description: message,
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const timezoneError = validationErrors?.timezone

  return (
    <SectionCard
      icon={Globe2}
      title="Fuso horário da empresa"
      description="Defina como horários são exibidos e interpretados em filtros e exportações."
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-semibold">Erro</p>
            </div>
            <p className="text-sm">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={loadTimezone}
              disabled={loading}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Recarregar
            </Button>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label htmlFor="company-timezone">Timezone da empresa (para exibição e filtros)</Label>
                <p className="text-xs text-muted-foreground">
                  O backend aplica este timezone em listagens, relatórios e exportações.
                </p>
              </div>
              <HelpCircle
                className="h-4 w-4 text-muted-foreground"
                title="Este valor define como séries de data/hora aparecem e são interpretadas no ASP.NET (ex.: Europe/Madrid para empresas espanholas)."
              />
            </div>
            <div className="relative">
              <input
                id="company-timezone"
                name="timezone"
                className="mt-1 block w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                value={searchTerm}
                autoComplete="off"
                placeholder="Digite ou selecione um timezone"
                disabled={loading || saving || !canEdit}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setTimezone(event.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                required
              />
              {showSuggestions ? (
                <ul className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-lg border border-border/80 bg-card/95 shadow-2xl backdrop-blur">
                  {filteredTimezones.length ? (
                    filteredTimezones.map((tz) => (
                      <li key={tz}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-primary/10',
                            tz === timezone ? 'bg-primary/10 text-primary' : 'text-foreground',
                          )}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setTimezone(tz)
                            setSearchTerm(tz)
                            setShowSuggestions(false)
                          }}
                        >
                          {tz}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum timezone disponível</li>
                  )}
                </ul>
              ) : null}
              {timezoneError ? (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">
                  {Array.isArray(timezoneError) ? timezoneError.join(', ') : timezoneError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving || loading || !timezone || !canEdit}>
              {saving ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
            <Button type="button" variant="outline" disabled={loading || saving} onClick={loadTimezone}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Recarregar
            </Button>
            {!canEdit ? (
              <span className="text-xs text-muted-foreground">
                Apenas administradores podem editar.
              </span>
            ) : null}
          </div>

          <div className="rounded-xl border border-sky-200/70 bg-sky-50/80 p-4 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-50">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <p className="text-sm font-semibold">Impacto nos filtros e exportações</p>
            </div>
            <p className="mt-2 text-sm">
              Ao abrir filtros de data, os intervalos são interpretados usando este timezone. A API converte para UTC automaticamente.
            </p>
          </div>
        </form>
      </div>
    </SectionCard>
  )
}

const CompanyCard = ({ company }) => (
  <SectionCard
    icon={Building2}
    title="Empresa"
    description="Informações gerais da organização autenticada."
  >
    <div className="grid gap-2 sm:grid-cols-2">
      <KeyValue label="Nome" value={company?.name} />
      <KeyValue label="Fuso horário" value={company?.timezone} />
      <KeyValue label="País" value={company?.country} />
      <KeyValue label="Locale" value={company?.locale} />
      <KeyValue label="Criada em" value={formatDateTime(company?.created_at)} />
    </div>
  </SectionCard>
)

const UsageCard = ({ usage }) => {
  const employees = usage?.employees || {}
  const hasLimit = employees.limit !== null && employees.limit !== undefined
  const percent = hasLimit ? Math.min(100, Math.round((employees.current / (employees.limit || 1)) * 100)) : null
  return (
    <SectionCard
      icon={Users}
      title="Uso e Limites"
      description="Acompanhamento de colaboradores cadastrados."
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <KeyValue label="Colaboradores atuais" value={employees.current} />
          <KeyValue label="Limite contratado" value={hasLimit ? employees.limit : 'Sem limite definido'} />
          <KeyValue label="Acima do limite" value={formatBooleanValue(employees.over_limit)} />
        </div>
        {percent !== null ? (
          <div>
            <div className="h-2 w-full rounded-full bg-muted/60">
              <div className={cn('h-2 rounded-full transition-all', employees.over_limit ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">{percent}% da capacidade de colaboradores.</p>
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}

const WorkdayCard = ({ workday }) => {
  const defaultShift = workday?.default_shift
  return (
    <SectionCard
      icon={SlidersHorizontal}
      title="Jornada e Regras"
      description="Configurações de jornada padrão, tolerância e controles."
    >
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <KeyValue label="Tolerância (min)" value={workday?.tolerance_minutes} />
          <KeyValue label="Arredondamento (min)" value={workday?.rounding_minutes} />
          <KeyValue label="Geolocalização" value={formatBooleanValue(workday?.geolocation_enabled)} />
          <KeyValue label="Exigir foto" value={formatBooleanValue(workday?.require_photo)} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Jornada padrão</p>
          {defaultShift ? (
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
              <p className="text-sm font-semibold text-foreground">{defaultShift.name}</p>
              <p className="text-[12px] text-muted-foreground">
                {defaultShift.start_time && defaultShift.end_time
                  ? `${defaultShift.start_time} - ${defaultShift.end_time}`
                  : 'Horário não definido'}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <KeyValue label="ID da jornada" value={defaultShift.id} />
                <KeyValue label="Início" value={defaultShift.start_time} />
                <KeyValue label="Fim" value={defaultShift.end_time} />
              </div>
              <WorkdayDays days={defaultShift.days} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma jornada padrão configurada.</p>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

const SecurityComplianceCard = ({ security, compliance }) => (
  <SectionCard
    icon={ShieldCheck}
    title="Segurança e Conformidade"
    description="Preferências de segurança, retenção e exportação de dados."
  >
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Segurança</p>
        <KeyValue label="2FA habilitado" value={formatBooleanValue(security?.two_factor_enabled)} />
        <KeyValue label="Último login" value={formatDateTime(security?.last_login_at)} />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Compliance</p>
        <KeyValue label="Retenção de logs (dias)" value={compliance?.log_retention_days} />
        <KeyValue label="Exportação habilitada" value={formatBooleanValue(compliance?.export_enabled)} />
      </div>
    </div>
  </SectionCard>
)

const FlagsCard = ({ flags }) => {
  if (!flags) return null
  return (
    <SectionCard
      icon={Radar}
      title="Sinalizadores"
      description="Status operacionais para a conta e acesso."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <KeyValue label="Pode acessar o sistema" value={formatBooleanValue(flags.can_access_system)} />
        <KeyValue label="Conta em teste" value={formatBooleanValue(flags.is_trial)} />
        <KeyValue label="Teste ativo" value={formatBooleanValue(flags.is_trial_active)} />
        <KeyValue label="Assinatura ativa" value={formatBooleanValue(flags.is_subscription_active)} />
        <KeyValue label="Requer ação" value={formatBooleanValue(flags.requires_action)} />
      </div>
    </SectionCard>
  )
}

const ActionsCard = ({ links, onDefaultSubscribe }) => {
  const hasPortal = Boolean(links?.customer_portal_url)
  const hasCheckout = Boolean(links?.checkout_url)

  const handleOpen = (url) => {
    if (!url) return
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <SectionCard
      icon={LockKeyhole}
      title="Ações"
      description="Atalhos diretos para resolver pendências de billing ou gerenciamento."
      className="lg:col-span-2"
    >
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => (hasPortal ? handleOpen(links.customer_portal_url) : onDefaultSubscribe())}
        >
          Portal do cliente
        </Button>
        <Button
          type="button"
          onClick={() => (hasCheckout ? handleOpen(links.checkout_url) : onDefaultSubscribe())}
        >
          {hasCheckout ? 'Regularizar / Assinar' : 'Assinar / Regularizar'}
        </Button>
        {links?.checkout_url ? (
          <InlineActionLink label="Checkout URL" url={links.checkout_url} />
        ) : null}
        {links?.customer_portal_url ? (
          <InlineActionLink label="Portal URL" url={links.customer_portal_url} />
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <KeyValue label="checkout_url" value={links?.checkout_url} />
        <KeyValue label="customer_portal_url" value={links?.customer_portal_url} />
      </div>
    </SectionCard>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { data, isLoading, error, reload } = useSettingsOverview()
  const overview = data || {}

  const roles = useAuthStore((state) => state.roles)
  const showCompanyTimezone = false
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const canEditTimezone = useMemo(
    () => capabilities.includes('admin') || capabilities.includes('super_admin'),
    [capabilities],
  )
  const limitLabels = {
    max_employees: t('settingsPage.limits.maxEmployees', 'Funcionarios'),
  }

  const setTimezone = useTimezoneStore((state) => state.setTimezone)

  useEffect(() => {
    if (overview?.company?.timezone) {
      setTimezone(overview.company.timezone)
    }
  }, [overview?.company?.timezone, setTimezone])

  const links = overview.links || {}
  const hasPortal = Boolean(links.customer_portal_url)
  const hasCheckout = Boolean(links.checkout_url)

  const hasContent = useMemo(
    () =>
      Boolean(
        overview?.billing ||
          overview?.company ||
          overview?.security ||
          overview?.compliance ||
          overview?.usage,
      ),
    [overview],
  )

  const openExternal = (url) => {
    if (!url || typeof window === 'undefined') return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="relative min-h-screen bg-transparent text-foreground">
      <PageContainer className="relative z-10 flex flex-col gap-5 py-6">
        <AppTopBar
          icon={<ShieldCheck className="h-5 w-5" />}
          eyebrow={t('settingsPage.header.title')}
          title={t('settingsPage.header.title')}
          subtitle={t('settingsPage.header.subtitle')}
          filters={
            error
              ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-3 py-1 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
                  {error}
                </div>
              )
              : null
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={reload}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('settingsPage.header.actions.reload')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!hasPortal}
                onClick={() => openExternal(links.customer_portal_url)}
                title={
                  hasPortal ? undefined : t('settingsPage.header.actions.portalUnavailable')
                }
              >
                {t('settingsPage.header.actions.manageSubscription')}
              </Button>
              {hasCheckout ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openExternal(links.checkout_url)}
                >
                  {t('settingsPage.header.actions.updatePlan')}
                </Button>
              ) : null}
            </div>
          }
        />

        {isLoading ? (
          <SettingsSkeleton />
        ) : !hasContent ? (
          <EmptyState message={error || t('settingsPage.states.empty')} onRetry={reload} />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <BillingCard billing={overview.billing} links={overview.links} />
              <CompanyCard company={overview.company} />
              <PreferencesCard
                company={overview.company}
                canEdit={canEditTimezone}
                onTimezoneSaved={reload}
              />
            </div>

            <PlanSummaryCard billing={overview.billing} usage={overview.usage} links={links} />

            <SecurityCard security={overview.security} compliance={overview.compliance} />
          </div>
        )}
      </PageContainer>
    </div>
  )
}
