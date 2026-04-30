import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BadgePercent, Pencil, Plus, RefreshCcw } from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import {
  createBillingPlan,
  listBillingPlans,
  updateBillingPlan,
} from '../services/platformBillingService'

const buildPlanForm = (plan = {}) => ({
  id: plan.id || '',
  name: plan.name || '',
  slug: plan.slug || '',
  description: plan.description || '',
  price: plan.priceCents ? (plan.priceCents / 100).toString() : plan.price_cents ? (plan.price_cents / 100).toString() : '',
  currency: plan.currency || 'BRL',
  billingInterval: plan.billingInterval || plan.billing_interval || 'month',
  trialDays: plan.trialDays ?? plan.trial_days ?? '',
  isActive: plan.isActive ?? plan.is_active ?? true,
  sortOrder: plan.sortOrder ?? plan.sort_order ?? '',
})

const BILLING_INTERVAL_OPTIONS = [
  { value: 'month', label: 'Mensal' },
  { value: 'year', label: 'Anual' },
  { value: 'one_time', label: 'Pagamento único' },
]

const formatPrice = (plan, locale = 'pt-BR') => {
  const amount = plan.priceCents ?? plan.price_cents
  if (amount === undefined || amount === null) return '--'
  const currency = plan.currency || 'BRL'
  const formatted = (Number(amount) / 100 || 0).toLocaleString(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  })
  const interval = plan.billingInterval || plan.billing_interval || ''
  if (!interval || interval === 'one_time') return formatted
  return `${formatted}/${interval === 'month' ? 'mês' : interval === 'year' ? 'ano' : interval}`
}

export default function PlatformBillingPlans() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(
    () => canRenderCard(capabilities, { anyOf: ['super_admin'] }),
    [capabilities],
  )
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [createForm, setCreateForm] = useState(buildPlanForm)
  const [editForm, setEditForm] = useState(buildPlanForm)
  const [saving, setSaving] = useState(false)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await listBillingPlans()
      setPlans(data || [])
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Não foi possível carregar os planos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasAccess) return
    loadPlans()
  }, [hasAccess, loadPlans])

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = buildPlanPayload(createForm)
      const created = await createBillingPlan(payload)
      setPlans((prev) => [created, ...prev])
      setCreateForm(buildPlanForm())
      setCreateOpen(false)
      toast({
        title: 'Plano criado',
        description: 'Plano cadastrado com sucesso.',
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Erro ao criar plano',
        description: err?.response?.data?.message || err?.message || 'Não foi possível criar o plano.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!editForm.id) return
    setSaving(true)
    try {
      const payload = buildPlanPayload(editForm)
      const updated = await updateBillingPlan(editForm.id, payload)
      setPlans((prev) => prev.map((plan) => (plan.id === updated.id ? updated : plan)))
      setEditOpen(false)
      toast({
        title: 'Plano atualizado',
        description: 'Plano salvo com sucesso.',
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Erro ao atualizar plano',
        description: err?.response?.data?.message || err?.message || 'Não foi possível salvar o plano.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditOpen = (plan) => {
    setEditForm(buildPlanForm(plan))
    setEditOpen(true)
  }

  const summary = useMemo(() => plans.length, [plans])
  const activeCount = useMemo(
    () => plans.filter((plan) => plan.isActive || plan.is_active).length,
    [plans],
  )

  if (!hasAccess) {
    return (
      <PageContainer className="py-6">
        <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-6 text-sm text-muted-foreground shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]">
          {t('platformBillingPlans.noAccess', 'Apenas super admins podem gerenciar planos.')}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      className="py-6"
      title={t('platformBillingPlans.title', 'Planos de cobrança')}
      subtitle={t(
        'platformBillingPlans.subtitle',
        'Gerencie os planos disponíveis para as empresas na plataforma.',
      )}
      icon={BadgePercent}
      tag={t('platformBillingPlans.tag', 'Billing')}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadPlans} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('platformBillingPlans.actions.refresh', 'Atualizar')}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('platformBillingPlans.actions.create', 'Novo plano')}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-3 shadow-[0_18px_50px_-38px_rgba(62,82,152,0.35)]">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              {t('platformBillingPlans.summary.total', 'Planos')}
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{summary}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-3 shadow-[0_18px_50px_-38px_rgba(62,82,152,0.35)]">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              {t('platformBillingPlans.summary.active', 'Ativos')}
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{activeCount}</p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`plan-skeleton-${idx}`}
                className="h-32 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
              />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600">
            <p className="font-semibold">
              {t('platformBillingPlans.error.title', 'Algo deu errado')}
            </p>
            <p className="mt-1">{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 rounded-full px-3"
              onClick={loadPlans}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t('platformBillingPlans.actions.refresh', 'Atualizar')}
            </Button>
          </div>
        ) : null}

        {!loading && !error && plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground shadow-[0_18px_50px_-40px_rgba(62,82,152,0.35)]">
            <p className="font-semibold text-foreground">
              {t('platformBillingPlans.empty.title', 'Nenhum plano cadastrado')}
            </p>
            <p className="mt-1">
              {t('platformBillingPlans.empty.description', 'Crie um novo plano para começar.')}
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3 rounded-full px-4"
              onClick={() => setCreateOpen(true)}
            >
              {t('platformBillingPlans.actions.create', 'Novo plano')}
            </Button>
          </div>
        ) : null}

        {!loading && !error && plans.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">
                      {plan.name || t('platformBillingPlans.table.emptyName', 'Plano')}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{plan.slug}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEditOpen(plan)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-xl font-semibold text-foreground">{formatPrice(plan, i18n.language)}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>
                      {plan.billingInterval === 'one_time'
                        ? t('platformBillingPlans.interval.oneTime', 'Único')
                        : plan.billingInterval === 'year' || plan.billing_interval === 'year'
                          ? t('platformBillingPlans.interval.year', 'Anual')
                          : t('platformBillingPlans.interval.month', 'Mensal')}
                    </span>
                    {plan.trialDays || plan.trial_days ? (
                      <>
                        <span>•</span>
                        <span>
                          {t('platformBillingPlans.trial', '{{days}} dias de teste', {
                            days: plan.trialDays || plan.trial_days,
                          })}
                        </span>
                      </>
                    ) : null}
                    {plan.sortOrder || plan.sort_order ? (
                      <>
                        <span>•</span>
                        <span>
                          {t('platformBillingPlans.sort', 'Ordem {{value}}', {
                            value: plan.sortOrder ?? plan.sort_order,
                          })}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {plan.description ? (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  ) : null}
                </div>

                <div className="mt-auto flex items-center gap-2 text-[11px]">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-1 font-semibold',
                      plan.isActive || plan.is_active
                        ? 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700'
                        : 'border-border/70 bg-muted/70 text-muted-foreground',
                    )}
                  >
                    {plan.isActive || plan.is_active
                      ? t('platformBillingPlans.active', 'Ativo')
                      : t('platformBillingPlans.inactive', 'Inativo')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setCreateForm(buildPlanForm())
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>{t('platformBillingPlans.modal.createTitle', 'Novo plano')}</DialogTitle>
            <DialogDescription>
              {t('platformBillingPlans.modal.createDescription', 'Cadastre um plano de cobrança.')}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleCreateSubmit}>
            <PlanForm form={createForm} onChange={setCreateForm} />
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving} className="min-w-[140px]">
                {saving
                  ? t('platformBillingPlans.actions.saving', 'Salvando...')
                  : t('platformBillingPlans.actions.save', 'Salvar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditForm(buildPlanForm())
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>{t('platformBillingPlans.modal.editTitle', 'Editar plano')}</DialogTitle>
            <DialogDescription>
              {t('platformBillingPlans.modal.editDescription', 'Atualize os dados do plano.')}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleEditSubmit}>
            <PlanForm form={editForm} onChange={setEditForm} />
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving} className="min-w-[140px]">
                {saving
                  ? t('platformBillingPlans.actions.saving', 'Salvando...')
                  : t('platformBillingPlans.actions.save', 'Salvar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function buildPlanPayload(form) {
  const priceFloat = form.price ? Number(String(form.price).replace(',', '.')) : null
  const priceCents =
    priceFloat !== null && !Number.isNaN(priceFloat) ? Math.round(priceFloat * 100) : undefined
  const trialDays =
    form.trialDays === '' || form.trialDays === null || form.trialDays === undefined
      ? undefined
      : Number.parseInt(form.trialDays, 10)
  const sortOrder =
    form.sortOrder === '' || form.sortOrder === null || form.sortOrder === undefined
      ? undefined
      : Number.parseInt(form.sortOrder, 10)

  return {
    name: form.name,
    slug: form.slug,
    description: form.description || null,
    price_cents: priceCents,
    currency: form.currency || 'BRL',
    billing_interval: form.billingInterval || 'month',
    trial_days: Number.isNaN(trialDays) ? undefined : trialDays,
    is_active: Boolean(form.isActive),
    sort_order: Number.isNaN(sortOrder) ? undefined : sortOrder,
  }
}

function PlanForm({ form, onChange }) {
  const { t } = useTranslation()

  const handleChange = (field, value) => {
    onChange((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="plan-name">{t('platformBillingPlans.form.name', 'Nome')}</Label>
        <Input
          id="plan-name"
          value={form.name}
          onChange={(event) => handleChange('name', event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan-slug">{t('platformBillingPlans.form.slug', 'Slug')}</Label>
        <Input
          id="plan-slug"
          value={form.slug}
          onChange={(event) => handleChange('slug', event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan-description">
          {t('platformBillingPlans.form.description', 'Descrição (opcional)')}
        </Label>
        <Input
          id="plan-description"
          value={form.description}
          onChange={(event) => handleChange('description', event.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan-price">{t('platformBillingPlans.form.price', 'Preço')}</Label>
          <Input
            id="plan-price"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(event) => handleChange('price', event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-currency">{t('platformBillingPlans.form.currency', 'Moeda')}</Label>
          <Input
            id="plan-currency"
            value={form.currency}
            onChange={(event) => handleChange('currency', event.target.value.toUpperCase())}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan-interval">
            {t('platformBillingPlans.form.billingInterval', 'Intervalo de cobrança')}
          </Label>
          <Select
            id="plan-interval"
            value={form.billingInterval}
            onChange={(event) => handleChange('billingInterval', event.target.value)}
          >
            {BILLING_INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-trial">{t('platformBillingPlans.form.trialDays', 'Dias de teste')}</Label>
          <Input
            id="plan-trial"
            type="number"
            min="0"
            value={form.trialDays}
            onChange={(event) => handleChange('trialDays', event.target.value)}
            placeholder={t('platformBillingPlans.form.trialPlaceholder', 'Ex.: 7')}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan-sort">{t('platformBillingPlans.form.sortOrder', 'Ordem')}</Label>
          <Input
            id="plan-sort"
            type="number"
            value={form.sortOrder}
            onChange={(event) => handleChange('sortOrder', event.target.value)}
            placeholder={t('platformBillingPlans.form.sortPlaceholder', 'Ex.: 1')}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">
              {t('platformBillingPlans.form.isActive', 'Ativo')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('platformBillingPlans.form.isActiveHint', 'Controla a disponibilidade do plano.')}
            </p>
          </div>
          <Switch
            checked={Boolean(form.isActive)}
            onCheckedChange={(checked) => handleChange('isActive', checked)}
          />
        </div>
      </div>
    </div>
  )
}
