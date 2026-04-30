import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Ban, Building2, CheckCircle2, CreditCard, RefreshCcw, Save, ShieldAlert } from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { getCompany, blockCompany, unblockCompany } from '../services/platformCompaniesService'
import { AdministrativeSettingsCard } from '../components/super-admin/AdministrativeSettingsCard'
import {
  getCompanySubscription,
  listBillingPlans,
  updateCompanySubscription,
} from '../services/platformBillingService'
import {
  formatCurrencyEUR,
  formatSuperAdminDate,
  formatSuperAdminDateTime,
  getHealthStatusMeta,
  getSubscriptionStatusMeta,
  resolveSuperAdminError,
} from '../features/superAdmin/utils'
import { cn } from '../lib/utils'

const ACCESS_REQUIRES = { anyOf: ['super_admin'] }

const buildSubscriptionForm = (subscription = {}) => ({
  plan_id: subscription?.plan?.id || '',
  status: subscription?.status || 'active',
  trial_ends_at: subscription?.trialEndsAt || '',
  current_period_start: subscription?.currentPeriodStart || '',
  current_period_end: subscription?.currentPeriodEnd || '',
  canceled_at: subscription?.canceledAt || '',
  past_due_since: subscription?.pastDueSince || '',
  grace_period_days:
    subscription?.gracePeriodDays === null || subscription?.gracePeriodDays === undefined
      ? ''
      : String(subscription.gracePeriodDays),
  stripe_customer_id: subscription?.stripeCustomerId || '',
  stripe_subscription_id: subscription?.stripeSubscriptionId || '',
  metadata_origin: subscription?.metadata?.origin || 'admin',
})

const cleanNullableValue = (value) => {
  if (value === '' || value === undefined) return null
  return value
}

export default function SuperAdminCompanyDetails({ companyId, onBack, onSubscriptionUpdated }) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])

  const [company, setCompany] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [billingPlans, setBillingPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [subscriptionOpen, setSubscriptionOpen] = useState(false)
  const [subscriptionForm, setSubscriptionForm] = useState(buildSubscriptionForm())
  const [subscriptionSaving, setSubscriptionSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!hasAccess || !companyId) return
    setLoading(true)
    setError('')

    try {
      const [companyResponse, subscriptionResponse, plansResponse] = await Promise.all([
        getCompany(companyId),
        getCompanySubscription(companyId),
        listBillingPlans(),
      ])

      setCompany(companyResponse)
      setSubscription(subscriptionResponse)
      setSubscriptionForm(buildSubscriptionForm(subscriptionResponse))
      setBillingPlans(plansResponse?.data || [])
    } catch (err) {
      setError(
        resolveSuperAdminError(
          err,
          t,
          t('superAdmin.companyDetails.states.errorDescription', 'Nao foi possivel carregar a empresa.'),
        ),
      )
      setCompany(null)
      setSubscription(null)
      setBillingPlans([])
    } finally {
      setLoading(false)
    }
  }, [companyId, hasAccess, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const companyTimezone = company?.timezone || company?.raw?.timezone || 'Europe/Madrid'
  const companyName =
    company?.name ||
    company?.raw?.company_name ||
    t('superAdmin.shared.table.emptyName', 'Empresa')
  const subscriptionMeta = getSubscriptionStatusMeta(
    subscription?.status || company?.raw?.subscription_status,
    subscription?.raw?.status_label || company?.raw?.subscription_status_label,
    t,
  )
  const healthMeta = getHealthStatusMeta(company?.raw?.health_status, t)

  const handleAdministrativeSettingsSaved = useCallback((settings) => {
    if (!settings?.timezone) return

    setCompany((current) => {
      if (!current) return current

      return {
        ...current,
        timezone: settings.timezone,
        raw: {
          ...current.raw,
          timezone: settings.timezone,
        },
      }
    })
  }, [])

  const handleBlockConfirm = async () => {
    if (!companyId) return
    setActionLoading(true)
    try {
      if (company?.isBlocked) {
        await unblockCompany(companyId)
        toast({
          title: t('superAdmin.companyDetails.actions.unblock', 'Desbloquear empresa'),
          description: t('superAdmin.companyDetails.toast.unblockSuccess', 'Empresa desbloqueada com sucesso.'),
          variant: 'success',
        })
      } else {
        await blockCompany(companyId, { reason: blockReason.trim() || 'manual' })
        toast({
          title: t('superAdmin.companyDetails.actions.block', 'Bloquear empresa'),
          description: t('superAdmin.companyDetails.toast.blockSuccess', 'Empresa bloqueada com sucesso.'),
          variant: 'success',
        })
      }

      setBlockOpen(false)
      setBlockReason('')
      await loadData()
      onSubscriptionUpdated?.()
    } catch (err) {
      toast({
        title: t('superAdmin.shared.states.errorTitle', 'Algo deu errado'),
        description: resolveSuperAdminError(err, t),
        variant: 'error',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveSubscription = async (event) => {
    event.preventDefault()
    if (!companyId) return
    setSubscriptionSaving(true)
    try {
      const payload = {
        plan_id: cleanNullableValue(subscriptionForm.plan_id),
        status: subscriptionForm.status,
        trial_ends_at: cleanNullableValue(subscriptionForm.trial_ends_at),
        current_period_start: cleanNullableValue(subscriptionForm.current_period_start),
        current_period_end: cleanNullableValue(subscriptionForm.current_period_end),
        canceled_at: cleanNullableValue(subscriptionForm.canceled_at),
        past_due_since: cleanNullableValue(subscriptionForm.past_due_since),
        grace_period_days:
          subscriptionForm.grace_period_days === ''
            ? null
            : Number.parseInt(subscriptionForm.grace_period_days, 10),
        stripe_customer_id: cleanNullableValue(subscriptionForm.stripe_customer_id),
        stripe_subscription_id: cleanNullableValue(subscriptionForm.stripe_subscription_id),
        metadata: {
          origin: subscriptionForm.metadata_origin || 'admin',
        },
      }

      const updated = await updateCompanySubscription(companyId, payload)
      setSubscription(updated)
      setSubscriptionForm(buildSubscriptionForm(updated))
      setSubscriptionOpen(false)
      toast({
        title: t('superAdmin.companyDetails.actions.updateSubscription', 'Atualizar assinatura'),
        description: t('superAdmin.companyDetails.toast.subscriptionSuccess', 'Assinatura atualizada com sucesso.'),
        variant: 'success',
      })
      await loadData()
      onSubscriptionUpdated?.()
    } catch (err) {
      toast({
        title: t('superAdmin.shared.states.errorTitle', 'Algo deu errado'),
        description: resolveSuperAdminError(err, t),
        variant: 'error',
      })
    } finally {
      setSubscriptionSaving(false)
    }
  }

  if (!hasAccess) {
    return (
      <PageContainer className="py-6">
        <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-6 text-sm text-muted-foreground">
          {t('superAdmin.shared.errors.forbidden', 'Voce não tem permissao para acessar esta area.')}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6 py-6">
      <AppTopBar
        icon={<Building2 className="h-5 w-5" />}
        eyebrow={t('superAdmin.nav.section', 'Super Admin')}
        title={companyName}
        subtitle={t(
          'superAdmin.companyDetails.subtitle',
          'Detalhes da empresa, assinatura e status operacional.',
        )}
        meta={companyId}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              {t('superAdmin.shared.actions.back', 'Voltar')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
              {t('superAdmin.shared.actions.refresh', 'Atualizar')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSubscriptionOpen(true)} disabled={!company}>
              <Save className="h-4 w-4" />
              {t('superAdmin.companyDetails.actions.updateSubscription', 'Atualizar assinatura')}
            </Button>
            <Button
              type="button"
              variant={company?.isBlocked ? 'default' : 'destructive'}
              size="sm"
              onClick={() => setBlockOpen(true)}
              disabled={!company || actionLoading}
            >
              {company?.isBlocked ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              {company?.isBlocked
                ? t('superAdmin.companyDetails.actions.unblock', 'Desbloquear empresa')
                : t('superAdmin.companyDetails.actions.block', 'Bloquear empresa')}
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`super-admin-company-details-${index}`}
              className="h-72 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
            />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600">
          <p className="font-semibold">{t('superAdmin.shared.states.errorTitle', 'Algo deu errado')}</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {!loading && !error && company ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {t('superAdmin.companyDetails.summary.tag', 'Resumo')}
                </p>
                <CardTitle className="text-base">
                  {t('superAdmin.companyDetails.summary.title', 'Resumo da empresa')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailItem label={t('superAdmin.companyDetails.fields.name', 'Nome')} value={companyName} />
              <DetailItem label={t('superAdmin.companyDetails.fields.slug', 'Slug')} value={company?.raw?.slug || company?.domain || '--'} />
              <DetailItem label={t('superAdmin.companyDetails.fields.email', 'E-mail')} value={company?.raw?.email || '--'} />
              <DetailItem label={t('superAdmin.companyDetails.fields.document', 'Documento')} value={company?.raw?.document || '--'} />
              <DetailItem
                label={t('superAdmin.companyDetails.fields.location', 'Cidade / Estado')}
                value={[company?.raw?.city, company?.raw?.state].filter(Boolean).join(' / ') || '--'}
              />
              <DetailItem label={t('superAdmin.companyDetails.fields.timezone', 'Timezone')} value={companyTimezone} />
              <DetailItem
                label={t('superAdmin.companyDetails.fields.createdAt', 'Criada em')}
                value={formatSuperAdminDate(company?.createdAt || company?.raw?.created_at, i18n.language, companyTimezone)}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-1">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CreditCard className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {t('superAdmin.companyDetails.subscription.tag', 'Assinatura')}
                </p>
                <CardTitle className="text-base">
                  {t('superAdmin.companyDetails.subscription.title', 'Resumo da assinatura')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                <span className="text-muted-foreground">
                  {t('superAdmin.companyDetails.subscription.status', 'Status')}
                </span>
                <StatusBadge label={subscriptionMeta.label} className={subscriptionMeta.className} />
              </div>
              <DetailItem label={t('superAdmin.companyDetails.subscription.plan', 'Plano')} value={subscription?.plan?.name || company?.raw?.plan_name || '--'} />
              <DetailItem
                label={t('superAdmin.companyDetails.subscription.price', 'Preco')}
                value={
                  subscription?.plan?.priceCents || company?.raw?.plan_price_cents
                    ? formatCurrencyEUR(
                        Number(subscription?.plan?.priceCents ?? company?.raw?.plan_price_cents) / 100,
                        i18n.language,
                      )
                    : '--'
                }
              />
              <DetailItem
                label={t('superAdmin.companyDetails.subscription.trialEnds', 'Trial termina em')}
                value={formatSuperAdminDateTime(subscription?.trialEndsAt, i18n.language, companyTimezone)}
              />
              <DetailItem
                label={t('superAdmin.companyDetails.subscription.currentPeriodEnd', 'Fim do periodo atual')}
                value={formatSuperAdminDateTime(subscription?.currentPeriodEnd, i18n.language, companyTimezone)}
              />
              <DetailItem
                label={t('superAdmin.companyDetails.subscription.pastDueSince', 'Em atraso desde')}
                value={formatSuperAdminDateTime(subscription?.pastDueSince, i18n.language, companyTimezone)}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-1">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {t('superAdmin.companyDetails.operations.tag', 'Operacao')}
                </p>
                <CardTitle className="text-base">
                  {t('superAdmin.companyDetails.operations.title', 'Status operacional')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                <span className="text-muted-foreground">
                  {t('superAdmin.companyDetails.operations.healthStatus', 'Health status')}
                </span>
                <StatusBadge label={healthMeta.label} className={healthMeta.className} />
              </div>
              <DetailItem
                label={t('superAdmin.companyDetails.operations.blocked', 'Bloqueada')}
                value={company?.isBlocked ? t('superAdmin.shared.values.yes', 'Sim') : t('superAdmin.shared.values.no', 'Nao')}
              />
              <DetailItem
                label={t('superAdmin.companyDetails.operations.blockedAt', 'Bloqueada em')}
                value={formatSuperAdminDateTime(company?.blockedAt, i18n.language, companyTimezone)}
              />
              <DetailItem
                label={t('superAdmin.companyDetails.operations.updatedAt', 'Atualizada em')}
                value={formatSuperAdminDateTime(company?.updatedAt, i18n.language, companyTimezone)}
              />
              <DetailItem
                label={t('superAdmin.companyDetails.operations.employees', 'Colaboradores')}
                value={company?.raw?.employees_count ?? '--'}
              />
              <DetailItem
                label={t('superAdmin.companyDetails.operations.activeEmployees30d', 'Ativos 30d')}
                value={company?.raw?.active_employees_30d ?? '--'}
              />
              <DetailItem
                label={t('superAdmin.companyDetails.operations.lastActivity', 'Ultima atividade')}
                value={formatSuperAdminDateTime(company?.raw?.last_activity_at, i18n.language, companyTimezone)}
              />
            </CardContent>
          </Card>

          <AdministrativeSettingsCard
            companyId={companyId}
            enabled={hasAccess && Boolean(company)}
            onSaved={handleAdministrativeSettingsSaved}
          />
        </div>
      ) : null}

      <Dialog
        open={blockOpen}
        onOpenChange={(open) => {
          setBlockOpen(open)
          if (!open) setBlockReason('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {company?.isBlocked
                ? t('superAdmin.companyDetails.actions.unblock', 'Desbloquear empresa')
                : t('superAdmin.companyDetails.actions.block', 'Bloquear empresa')}
            </DialogTitle>
            <DialogDescription>
              {company?.isBlocked
                ? t(
                    'superAdmin.companyDetails.modals.unblockDescription',
                    'Esta acao libera novamente o acesso da empresa.',
                  )
                : t(
                    'superAdmin.companyDetails.modals.blockDescription',
                    'Informe o motivo do bloqueio para registrar a acao.',
                  )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {!company?.isBlocked ? (
              <div className="space-y-2">
                <Label htmlFor="block-reason">
                  {t('superAdmin.companyDetails.modals.blockReason', 'Motivo do bloqueio')}
                </Label>
                <Textarea
                  id="block-reason"
                  value={blockReason}
                  onChange={(event) => setBlockReason(event.target.value)}
                  placeholder={t('superAdmin.companyDetails.modals.blockReasonPlaceholder', 'Ex.: inadimplencia manual')}
                />
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant={company?.isBlocked ? 'default' : 'destructive'}
                onClick={handleBlockConfirm}
                disabled={actionLoading || (!company?.isBlocked && !blockReason.trim())}
              >
                {company?.isBlocked
                  ? t('superAdmin.companyDetails.actions.unblock', 'Desbloquear empresa')
                  : t('superAdmin.companyDetails.actions.block', 'Bloquear empresa')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={subscriptionOpen}
        onOpenChange={(open) => {
          setSubscriptionOpen(open)
          if (open) {
            setSubscriptionForm(buildSubscriptionForm(subscription))
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[780px]">
          <DialogHeader>
            <DialogTitle>
              {t('superAdmin.companyDetails.actions.updateSubscription', 'Atualizar assinatura')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'superAdmin.companyDetails.modals.subscriptionDescription',
                'Ajuste plano, status e datas relevantes da assinatura.',
              )}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleSaveSubscription}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subscription-plan">{t('superAdmin.companyDetails.subscription.plan', 'Plano')}</Label>
                <Select
                  id="subscription-plan"
                  value={subscriptionForm.plan_id}
                  onChange={(event) =>
                    setSubscriptionForm((prev) => ({ ...prev, plan_id: event.target.value }))
                  }
                >
                  <option value="">{t('superAdmin.companyDetails.modals.noPlan', 'Sem plano')}</option>
                  {billingPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription-status">{t('superAdmin.companyDetails.subscription.status', 'Status')}</Label>
                <Select
                  id="subscription-status"
                  value={subscriptionForm.status}
                  onChange={(event) =>
                    setSubscriptionForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  <option value="active">{t('superAdmin.shared.subscription.active', 'Ativa')}</option>
                  <option value="trialing">{t('superAdmin.shared.subscription.trialing', 'Trial')}</option>
                  <option value="past_due">{t('superAdmin.shared.subscription.past_due', 'Em atraso')}</option>
                  <option value="canceled">{t('superAdmin.shared.subscription.canceled', 'Cancelada')}</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DateTimeField
                id="trial-ends-at"
                label={t('superAdmin.companyDetails.subscription.trialEnds', 'Trial termina em')}
                value={subscriptionForm.trial_ends_at}
                onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, trial_ends_at: value }))}
              />
              <DateTimeField
                id="current-period-start"
                label={t('superAdmin.companyDetails.modals.currentPeriodStart', 'Inicio do periodo atual')}
                value={subscriptionForm.current_period_start}
                onChange={(value) =>
                  setSubscriptionForm((prev) => ({ ...prev, current_period_start: value }))
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DateTimeField
                id="current-period-end"
                label={t('superAdmin.companyDetails.subscription.currentPeriodEnd', 'Fim do periodo atual')}
                value={subscriptionForm.current_period_end}
                onChange={(value) =>
                  setSubscriptionForm((prev) => ({ ...prev, current_period_end: value }))
                }
              />
              <DateTimeField
                id="past-due-since"
                label={t('superAdmin.companyDetails.subscription.pastDueSince', 'Em atraso desde')}
                value={subscriptionForm.past_due_since}
                onChange={(value) =>
                  setSubscriptionForm((prev) => ({ ...prev, past_due_since: value }))
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DateTimeField
                id="canceled-at"
                label={t('superAdmin.companyDetails.modals.canceledAt', 'Cancelada em')}
                value={subscriptionForm.canceled_at}
                onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, canceled_at: value }))}
              />
              <div className="space-y-2">
                <Label htmlFor="grace-period-days">{t('superAdmin.companyDetails.modals.gracePeriodDays', 'Dias de grace period')}</Label>
                <Input
                  id="grace-period-days"
                  type="number"
                  min="0"
                  value={subscriptionForm.grace_period_days}
                  onChange={(event) =>
                    setSubscriptionForm((prev) => ({ ...prev, grace_period_days: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id="stripe-customer-id"
                label={t('superAdmin.companyDetails.modals.stripeCustomerId', 'Stripe customer ID')}
                value={subscriptionForm.stripe_customer_id}
                onChange={(value) =>
                  setSubscriptionForm((prev) => ({ ...prev, stripe_customer_id: value }))
                }
              />
              <TextField
                id="stripe-subscription-id"
                label={t('superAdmin.companyDetails.modals.stripeSubscriptionId', 'Stripe subscription ID')}
                value={subscriptionForm.stripe_subscription_id}
                onChange={(value) =>
                  setSubscriptionForm((prev) => ({ ...prev, stripe_subscription_id: value }))
                }
              />
            </div>

            <TextField
              id="subscription-origin"
              label={t('superAdmin.companyDetails.modals.metadataOrigin', 'Metadata origin')}
              value={subscriptionForm.metadata_origin}
              onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, metadata_origin: value }))}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={subscriptionSaving}>
                {subscriptionSaving
                  ? t('superAdmin.shared.actions.saving', 'Salvando...')
                  : t('superAdmin.shared.actions.save', 'Salvar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value || '--'}</p>
    </div>
  )
}

function StatusBadge({ label, className }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold', className)}>
      {label}
    </span>
  )
}

function DateTimeField({ id, label, value, onChange }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder="2026-03-30 10:00:00" />
    </div>
  )
}

function TextField({ id, label, value, onChange }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
