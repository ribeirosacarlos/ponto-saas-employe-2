import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Eye,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { getCompany } from '../services/platformCompaniesService'
import {
  getCompanySubscription,
  listBillingPlans,
  updateCompanySubscription,
} from '../services/platformBillingService'
import { useCompanies } from '../features/platform/useCompanies'

const MANAGEMENT_REQUIRES = { anyOf: ['super_admin'] }

const STATUS_LABELS = {
  active: 'Ativa',
  blocked: 'Bloqueada',
  deleted: 'Deletada',
}

const STATUS_STYLES = {
  active: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  blocked: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  deleted: 'border-rose-200/70 bg-rose-500/10 text-rose-600',
}

const buildCompanyForm = (company = {}) => ({
  name: company?.name || '',
  domain: company?.domain || '',
})

const buildRegisterForm = () => ({
  companyName: '',
  companyDocument: '',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  companyCity: '',
  companyState: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  adminPasswordConfirmation: '',
})

const compactObject = (value) => {
  if (!value || typeof value !== 'object') return value
  return Object.entries(value).reduce((acc, [key, val]) => {
    if (val === undefined || val === null || val === '') return acc
    acc[key] = val
    return acc
  }, {})
}

const buildCompanyPayload = (form) => {
  const name = form?.name?.trim()
  const domain = form?.domain?.trim()
  return compactObject({
    name: name || undefined,
    domain: domain || undefined,
  })
}

const buildRegisterPayload = (form) => {
  const companyName = form?.companyName?.trim()
  const companyDocument = form?.companyDocument?.trim()
  const companyEmail = form?.companyEmail?.trim()
  const companyPhone = form?.companyPhone?.trim()
  const companyAddress = form?.companyAddress?.trim()
  const companyCity = form?.companyCity?.trim()
  const companyState = form?.companyState?.trim()
  const adminName = form?.adminName?.trim()
  const adminEmail = form?.adminEmail?.trim()
  const adminPassword = form?.adminPassword || ''
  const adminPasswordConfirmation = form?.adminPasswordConfirmation || ''

  const payload = compactObject({
    company_name: companyName || undefined,
    company_document: companyDocument || undefined,
    company_email: companyEmail || undefined,
    company_phone: companyPhone || undefined,
    company_address: companyAddress || undefined,
    company_city: companyCity || undefined,
    company_state: companyState || undefined,
    admin_name: adminName || undefined,
    admin_email: adminEmail || undefined,
    admin_password: adminPassword || undefined,
    admin_password_confirmation: adminPasswordConfirmation || undefined,
    name: companyName || undefined,
  })

  const company = compactObject({
    name: companyName || undefined,
    document: companyDocument || undefined,
    email: companyEmail || undefined,
    phone: companyPhone || undefined,
    address: companyAddress || undefined,
    city: companyCity || undefined,
    state: companyState || undefined,
  })
  const admin = compactObject({
    name: adminName || undefined,
    email: adminEmail || undefined,
    password: adminPassword || undefined,
    password_confirmation: adminPasswordConfirmation || undefined,
  })

  if (Object.keys(company).length) payload.company = company
  if (Object.keys(admin).length) payload.admin = admin

  return payload
}

export default function PlatformCompanies() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(
    () => canRenderCard(capabilities, MANAGEMENT_REQUIRES),
    [capabilities],
  )

  const {
    companies,
    filteredCompanies,
    filters,
    setFilters,
    loading,
    error,
    mutationLoading,
    refreshCompanies,
    createCompanyEntry,
    registerCompanyEntry,
    updateCompanyEntry,
    deleteCompanyEntry,
    restoreCompanyEntry,
    blockCompanyEntry,
    unblockCompanyEntry,
  } = useCompanies({ enabled: hasAccess })

  const [viewMode, setViewMode] = useState('grid')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(buildCompanyForm)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerForm, setRegisterForm] = useState(buildRegisterForm)
  const [registerStep, setRegisterStep] = useState(1)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(buildCompanyForm)
  const [editCompany, setEditCompany] = useState(null)
  const [editLoading, setEditLoading] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsCompany, setDetailsCompany] = useState(null)
  const [detailsRaw, setDetailsRaw] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [billingPlans, setBillingPlans] = useState([])
  const [billingPlansLoading, setBillingPlansLoading] = useState(false)
  const [billingError, setBillingError] = useState('')
  const [subscription, setSubscription] = useState(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [subscriptionUpdating, setSubscriptionUpdating] = useState(false)
  const [subscriptionForm, setSubscriptionForm] = useState({ planId: '' })
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const summary = useMemo(() => {
    const totals = { total: companies.length, active: 0, blocked: 0, deleted: 0 }
    companies.forEach((company) => {
      if (company.isDeleted) {
        totals.deleted += 1
      } else if (company.isBlocked) {
        totals.blocked += 1
      } else {
        totals.active += 1
      }
    })
    return totals
  }, [companies])

  const isSamePlanSelection =
    (subscription?.plan?.id || '') === (subscriptionForm.planId || '')

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('platformCompanies.filters.all', 'Todos') },
      { value: 'active', label: t('platformCompanies.filters.active', 'Ativas') },
      { value: 'blocked', label: t('platformCompanies.filters.blocked', 'Bloqueadas') },
      { value: 'deleted', label: t('platformCompanies.filters.deleted', 'Deletadas') },
    ],
    [t],
  )

  const formatDate = (value) => {
    if (!value) return t('platformCompanies.table.emptyDate', 'Sem data')
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatPlanPrice = (plan) => {
    if (!plan) return '--'
    const amount = plan.priceCents ?? plan.price_cents
    if (amount === undefined || amount === null) return '--'
    const currency = plan.currency || 'BRL'
    const formatted = (Number(amount) / 100 || 0).toLocaleString(i18n.language, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    })
    const intervalRaw = plan.billingInterval || plan.billing_interval || ''
    if (!intervalRaw || intervalRaw === 'one_time') return formatted
    const intervalLabel =
      intervalRaw === 'month'
        ? t('platformCompanies.billing.month', 'mês')
        : intervalRaw === 'year'
          ? t('platformCompanies.billing.year', 'ano')
          : intervalRaw
    return `${formatted}/${intervalLabel}`
  }

  const subscriptionStatusStyles = {
    trialing: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
    active: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
    past_due: 'border-rose-200/70 bg-rose-500/10 text-rose-600',
    canceled: 'border-slate-200/70 bg-slate-500/10 text-slate-700',
  }

  const renderSubscriptionStatusPill = (status) => {
    if (!status) return null
    const labelMap = {
      trialing: t('platformCompanies.billing.trialing', 'Em teste'),
      active: t('platformCompanies.billing.active', 'Ativa'),
      past_due: t('platformCompanies.billing.pastDue', 'Em atraso'),
      canceled: t('platformCompanies.billing.canceled', 'Cancelada'),
    }
    const label = labelMap[status] || status
    const style = subscriptionStatusStyles[status] || 'border-border/60 bg-muted/70 text-muted-foreground'
    return (
      <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', style)}>
        {label}
      </span>
    )
  }

  const renderStatusPill = (status) => {
    const label = STATUS_LABELS[status] || t('platformCompanies.status.unknown', 'Indefinida')
    const style = STATUS_STYLES[status] || 'border-border/60 bg-muted/70 text-muted-foreground'
    return (
      <span
        className={cn(
          'inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
          style,
        )}
      >
        {label}
      </span>
    )
  }

  const getActionLabel = (company) => (company?.isBlocked ? 'Desbloquear' : 'Bloquear')

  const getConfirmCopy = (type, company) => {
    const name = company?.name || t('platformCompanies.table.emptyName', 'Empresa')
    if (type === 'delete') {
      return {
        title: 'Remover empresa',
        description: `Deseja remover ${name} da plataforma?`,
        confirm: 'Remover',
        variant: 'destructive',
      }
    }
    if (type === 'restore') {
      return {
        title: 'Restaurar empresa',
        description: `Deseja restaurar ${name}?`,
        confirm: 'Restaurar',
        variant: 'default',
      }
    }
    if (type === 'block') {
      return {
        title: 'Bloquear empresa',
        description: `Deseja bloquear o acesso de ${name}?`,
        confirm: 'Bloquear',
        variant: 'destructive',
      }
    }
    return {
      title: 'Desbloquear empresa',
      description: `Deseja liberar o acesso de ${name}?`,
      confirm: 'Desbloquear',
      variant: 'default',
    }
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    const payload = buildCompanyPayload(createForm)
    const result = await createCompanyEntry(payload)
    if (result.ok) {
      toast({
        title: 'Empresa criada',
        description: 'Cadastro concluido com sucesso.',
        variant: 'success',
      })
      setCreateOpen(false)
      setCreateForm(buildCompanyForm())
      await refreshCompanies()
      return
    }

    toast({
      title: 'Erro ao criar empresa',
      description:
        result.error?.response?.data?.message ||
        result.error?.message ||
        'Nao foi possivel criar a empresa.',
      variant: 'error',
    })
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    if (registerStep < 2) {
      setRegisterStep(2)
      return
    }
    const payload = buildRegisterPayload(registerForm)
    const result = await registerCompanyEntry(payload)
    if (result.ok) {
      toast({
        title: 'Empresa registrada',
        description: 'Empresa e admin criados com sucesso.',
        variant: 'success',
      })
      setRegisterOpen(false)
      setRegisterForm(buildRegisterForm())
      setRegisterStep(1)
      await refreshCompanies()
      return
    }

    toast({
      title: 'Erro ao registrar empresa',
      description:
        result.error?.response?.data?.message ||
        result.error?.message ||
        'Nao foi possivel registrar a empresa.',
      variant: 'error',
    })
  }

  const handleEditOpen = async (company) => {
    if (!company?.id) return
    setEditCompany(company)
    setEditForm(buildCompanyForm(company))
    setEditOpen(true)
    setEditLoading(true)
    try {
      const detail = await getCompany(company.id)
      if (detail) {
        setEditCompany(detail)
        setEditForm(buildCompanyForm(detail))
      }
    } catch (err) {
      toast({
        title: 'Erro ao carregar empresa',
        description:
          err?.response?.data?.message ||
          err?.message ||
          'Nao foi possivel carregar os dados.',
        variant: 'error',
      })
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!editCompany?.id) return
    const payload = buildCompanyPayload(editForm)
    const result = await updateCompanyEntry(editCompany.id, payload)
    if (result.ok) {
      toast({
        title: 'Empresa atualizada',
        description: 'Os dados foram atualizados com sucesso.',
        variant: 'success',
      })
      setEditOpen(false)
      setEditCompany(null)
      setEditForm(buildCompanyForm())
      await refreshCompanies()
      return
    }

    toast({
      title: 'Erro ao atualizar empresa',
      description:
        result.error?.response?.data?.message ||
        result.error?.message ||
        'Nao foi possivel atualizar os dados.',
      variant: 'error',
    })
  }

  const handleDetailsOpen = async (company) => {
    if (!company?.id) return
    setDetailsCompany(company)
    setDetailsOpen(true)
    setDetailsLoading(true)
    setDetailsError('')
    setBillingError('')
    setBillingPlans([])
    setBillingPlansLoading(true)
    setSubscription(null)
    setSubscriptionForm({ planId: '' })
    setSubscriptionLoading(true)
    try {
      const [detailResult, plansResult, subscriptionResult] = await Promise.allSettled([
        getCompany(company.id),
        listBillingPlans(),
        getCompanySubscription(company.id),
      ])

      if (detailResult.status === 'fulfilled') {
        const detail = detailResult.value
        setDetailsCompany(detail)
        setDetailsRaw(detail?.raw ?? null)
      } else {
        throw detailResult.reason
      }

      if (plansResult.status === 'fulfilled') {
        const plansPayload =
          plansResult.value?.data || plansResult.value?.items || plansResult.value || []
        setBillingPlans(Array.isArray(plansPayload) ? plansPayload : [])
      } else {
        setBillingError(
          plansResult.reason?.response?.data?.message ||
            plansResult.reason?.message ||
            'Nao foi possivel carregar os planos.',
        )
      }

      if (subscriptionResult.status === 'fulfilled') {
        const sub = subscriptionResult.value
        setSubscription(sub)
        setSubscriptionForm({ planId: sub?.plan?.id || '' })
      } else {
        setBillingError((prev) => {
          const message =
            subscriptionResult.reason?.response?.data?.message ||
            subscriptionResult.reason?.message ||
            'Nao foi possivel carregar a assinatura.'
          return prev ? `${prev} ${message}` : message
        })
      }
    } catch (err) {
      setDetailsError(
        err?.response?.data?.message || err?.message || 'Nao foi possivel carregar os dados.',
      )
    } finally {
      setDetailsLoading(false)
      setBillingPlansLoading(false)
      setSubscriptionLoading(false)
    }
  }

  const handleSubscriptionSave = async () => {
    if (!detailsCompany?.id) return
    setSubscriptionUpdating(true)
    setBillingError('')
    try {
      const payload = { plan_id: subscriptionForm.planId || null }
      const result = await updateCompanySubscription(detailsCompany.id, payload)
      setSubscription(result)
      setSubscriptionForm({ planId: result?.plan?.id || '' })
      toast({
        title: 'Plano atualizado',
        description: 'Assinatura ajustada com sucesso.',
        variant: 'success',
      })
      await refreshCompanies()
    } catch (err) {
      setBillingError(
        err?.response?.data?.message || err?.message || 'Nao foi possivel atualizar o plano.',
      )
    } finally {
      setSubscriptionUpdating(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction?.company?.id) return
    const companyId = confirmAction.company.id
    const actionType = confirmAction.type
    setConfirmLoading(true)
    setActionLoading((prev) => ({ ...prev, [companyId]: actionType }))

    let result = { ok: false }
    if (actionType === 'delete') {
      result = await deleteCompanyEntry(companyId)
    } else if (actionType === 'restore') {
      result = await restoreCompanyEntry(companyId)
    } else if (actionType === 'block') {
      result = await blockCompanyEntry(companyId)
    } else if (actionType === 'unblock') {
      result = await unblockCompanyEntry(companyId)
    }

    if (result.ok) {
      const successTitle =
        actionType === 'delete'
          ? 'Empresa removida'
          : actionType === 'restore'
            ? 'Empresa restaurada'
            : actionType === 'block'
              ? 'Empresa bloqueada'
              : 'Empresa desbloqueada'
      const successDescription =
        actionType === 'delete'
          ? 'A empresa foi removida com sucesso.'
          : actionType === 'restore'
            ? 'A empresa foi restaurada com sucesso.'
            : actionType === 'block'
              ? 'O acesso foi bloqueado.'
              : 'O acesso foi liberado.'
      toast({
        title: successTitle,
        description: successDescription,
        variant: 'success',
      })
      await refreshCompanies()
      setConfirmAction(null)
    } else {
      toast({
        title: 'Erro ao atualizar empresa',
        description:
          result.error?.response?.data?.message ||
          result.error?.message ||
          'Nao foi possivel concluir a acao.',
        variant: 'error',
      })
    }

    setConfirmLoading(false)
    setActionLoading((prev) => {
      const next = { ...prev }
      delete next[companyId]
      return next
    })
  }

  const openConfirmAction = (type, company) => {
    if (!company?.id) return
    setConfirmAction({ type, company })
  }

  const renderActions = (company, { compact = false } = {}) => {
    const isBusy = Boolean(actionLoading[company.id])
    const disableActions = isBusy || confirmLoading
    const canEdit = !company.isDeleted
    const canToggleBlock = !company.isDeleted

    return (
      <div className={cn('flex flex-wrap gap-2', compact ? 'justify-start' : 'justify-end')}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full px-3 text-xs"
          onClick={() => handleDetailsOpen(company)}
          disabled={disableActions}
        >
          <Eye className="h-3.5 w-3.5" />
          {t('platformCompanies.actions.details', 'Ver detalhes')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full px-3 text-xs"
          onClick={() => handleEditOpen(company)}
          disabled={disableActions || !canEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          {t('platformCompanies.actions.edit', 'Editar')}
        </Button>
        {canToggleBlock ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full px-3 text-xs"
            onClick={() =>
              openConfirmAction(company.isBlocked ? 'unblock' : 'block', company)
            }
            disabled={disableActions}
          >
            {company.isBlocked ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldOff className="h-3.5 w-3.5" />
            )}
            {getActionLabel(company)}
          </Button>
        ) : null}
        {company.isDeleted ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full px-3 text-xs"
            onClick={() => openConfirmAction('restore', company)}
            disabled={disableActions}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('platformCompanies.actions.restore', 'Restaurar')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="rounded-full px-3 text-xs"
            onClick={() => openConfirmAction('delete', company)}
            disabled={disableActions}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('platformCompanies.actions.remove', 'Remover')}
          </Button>
        )}
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
        <PageContainer className="py-5 sm:py-6">
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-6 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {t('equipoPage.states.noPermissionTitle', 'Sem permissao')}
            </p>
            <p className="mt-1">
              {t(
                'equipoPage.states.noPermissionDescription',
                'Voce nao tem acesso a esta pagina.',
              )}
            </p>
          </div>
        </PageContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="py-5 sm:py-6 space-y-6">
        <AppTopBar
          icon={<Building2 className="h-5 w-5" />}
          eyebrow={t('platformCompanies.tag', 'Platform')}
          title={t('platformCompanies.title', 'Empresas')}
          subtitle={t('platformCompanies.subtitle', 'Gerencie empresas da plataforma e controle o acesso.')}
          filters={
            <>
              <div className="flex-1 min-w-[220px] flex items-center gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t(
                    'platformCompanies.searchPlaceholder',
                    'Buscar por nome, dominio ou id',
                  )}
                  className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                />
              </div>

              <div className="min-w-[180px] flex items-center rounded-2xl border border-border bg-muted/70 px-3 py-2 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
                <select
                  aria-label={t('platformCompanies.filters.status', 'Status')}
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, status: event.target.value }))
                  }
                  className="w-full bg-transparent text-foreground outline-none"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center rounded-full border border-border bg-muted/70 p-1 text-[12px]">
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold transition',
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {t('platformCompanies.actions.grid', 'Grid')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold transition',
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                  {t('platformCompanies.actions.list', 'Lista')}
                </button>
              </div>
            </>
          }
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-border bg-background/80 px-3 text-sm"
                onClick={() => refreshCompanies()}
                disabled={loading}
              >
                <RefreshCcw className="h-4 w-4 text-primary" />
                {t('platformCompanies.actions.refresh', 'Atualizar')}
              </Button>
              <Button
                type="button"
                className="rounded-full px-4 text-sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t('platformCompanies.actions.create', 'Nova empresa')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-border bg-background/80 px-3 text-sm"
                onClick={() => setRegisterOpen(true)}
              >
                <UserPlus className="h-4 w-4 text-primary" />
                {t('platformCompanies.actions.register', 'Registrar empresa + admin')}
              </Button>
            </>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-4 shadow-[0_24px_70px_-45px_rgba(62,82,152,0.35)]">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t('platformCompanies.summary.total', 'Total de empresas')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-4 shadow-[0_24px_70px_-45px_rgba(62,82,152,0.35)]">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t('platformCompanies.summary.active', 'Ativas')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.active}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-4 shadow-[0_24px_70px_-45px_rgba(62,82,152,0.35)]">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t('platformCompanies.summary.blocked', 'Bloqueadas')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.blocked}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-4 shadow-[0_24px_70px_-45px_rgba(62,82,152,0.35)]">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t('platformCompanies.summary.deleted', 'Deletadas')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.deleted}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-border/80 bg-card/95 p-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {t('platformCompanies.list.tag', 'Empresas')}
                </p>
                <h2 className="text-sm font-semibold">
                  {t('platformCompanies.list.title', 'Lista de empresas')}
                </h2>
              </div>
            </div>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t('platformCompanies.list.count', '{{count}} empresas', {
                count: filteredCompanies.length,
              })}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                  />
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 shadow-[0_18px_50px_-38px_rgba(255,82,82,0.25)] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                <p className="font-semibold">{t('platformCompanies.states.errorTitle', 'Algo deu errado')}</p>
                <p className="mt-1">{error}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 rounded-full px-3 text-xs"
                  onClick={() => refreshCompanies()}
                >
                  {t('platformCompanies.actions.retry', 'Tentar novamente')}
                </Button>
              </div>
            ) : null}

            {!loading && !error && filteredCompanies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground shadow-[0_18px_50px_-40px_rgba(62,82,152,0.35)]">
                <p className="font-semibold text-foreground">
                  {t('platformCompanies.states.emptyTitle', 'Nenhuma empresa encontrada')}
                </p>
                <p className="mt-1">
                  {t(
                    'platformCompanies.states.emptyDescription',
                    'Ajuste a busca ou cadastre uma nova empresa.',
                  )}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 rounded-full px-4"
                  onClick={() => setCreateOpen(true)}
                >
                  {t('platformCompanies.actions.create', 'Nova empresa')}
                </Button>
              </div>
            ) : null}

            {!loading && !error && filteredCompanies.length > 0 ? (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-snug">
                              {company.name || t('platformCompanies.table.emptyName', 'Empresa')}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {company.domain || company.id}
                            </p>
                          </div>
                          {renderStatusPill(company.status)}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>
                            {t('platformCompanies.table.id', 'ID')}: {company.id}
                          </span>
                          <span>
                            {t('platformCompanies.table.createdAt', 'Criada em')}: {formatDate(company.createdAt)}
                          </span>
                        </div>

                        <div className="mt-4">{renderActions(company, { compact: true })}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 md:hidden">
                      {filteredCompanies.map((company) => (
                        <div
                          key={company.id}
                          className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-snug">
                                {company.name || t('platformCompanies.table.emptyName', 'Empresa')}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {company.domain || company.id}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                <span>
                                  {t('platformCompanies.table.createdAt', 'Criada em')}: {formatDate(company.createdAt)}
                                </span>
                              </div>
                            </div>
                            {renderStatusPill(company.status)}
                          </div>
                          <div className="mt-3">{renderActions(company, { compact: true })}</div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            <th className="px-3 py-3">
                              {t('platformCompanies.table.company', 'Empresa')}
                            </th>
                            <th className="px-3 py-3">
                              {t('platformCompanies.table.status', 'Status')}
                            </th>
                            <th className="px-3 py-3">
                              {t('platformCompanies.table.createdAt', 'Criada em')}
                            </th>
                            <th className="px-3 py-3 text-right">
                              {t('platformCompanies.table.actions', 'Acoes')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCompanies.map((company) => (
                            <tr
                              key={company.id}
                              className="border-b border-border/80 last:border-b-0"
                            >
                              <td className="px-3 py-4">
                                <div className="space-y-1">
                                  <p className="font-semibold">
                                    {company.name || t('platformCompanies.table.emptyName', 'Empresa')}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {company.domain || company.id}
                                  </p>
                                </div>
                              </td>
                              <td className="px-3 py-4">{renderStatusPill(company.status)}</td>
                              <td className="px-3 py-4">{formatDate(company.createdAt)}</td>
                              <td className="px-3 py-4">{renderActions(company)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </section>
      </PageContainer>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setCreateForm(buildCompanyForm())
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('platformCompanies.modals.createTitle', 'Nova empresa')}</DialogTitle>
            <DialogDescription>
              {t(
                'platformCompanies.modals.createDescription',
                'Cadastre uma nova empresa na plataforma.',
              )}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleCreateSubmit}>
            <div className="space-y-2">
              <Label htmlFor="create-company-name">
                {t('platformCompanies.form.nameLabel', 'Nome da empresa')}
              </Label>
              <Input
                id="create-company-name"
                name="name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-company-domain">
                {t('platformCompanies.form.domainLabel', 'Dominio')}
              </Label>
              <Input
                id="create-company-domain"
                name="domain"
                value={createForm.domain}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, domain: event.target.value }))
                }
                placeholder={t('platformCompanies.form.domainPlaceholder', 'empresa.com')}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutationLoading.create} className="min-w-[140px]">
                {mutationLoading.create
                  ? t('platformCompanies.actions.creating', 'Criando...')
                  : t('platformCompanies.actions.save', 'Salvar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={registerOpen}
        onOpenChange={(open) => {
          setRegisterOpen(open)
          if (!open) {
            setRegisterForm(buildRegisterForm())
            setRegisterStep(1)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('platformCompanies.modals.registerTitle', 'Registrar empresa + admin')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'platformCompanies.modals.registerDescription',
                'Crie a empresa e o usuario admin em um unico passo.',
              )}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleRegisterSubmit}>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('platformCompanies.form.stepIndicatorLabel', 'Passo')}</span>
              <span>
                {registerStep}/2 -{' '}
                {registerStep === 1
                  ? t('platformCompanies.form.companyDataLabel', 'Dados da empresa')
                  : t('platformCompanies.form.adminDataLabel', 'Dados do admin')}
              </span>
            </div>

            {registerStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-company-name">
                    {t('platformCompanies.form.companyNameLabel', 'Nome da empresa')}
                  </Label>
                  <Input
                    id="register-company-name"
                    name="company_name"
                    value={registerForm.companyName}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, companyName: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="register-company-document">
                      {t('platformCompanies.form.companyDocumentLabel', 'Documento (CNPJ/CPF)')}
                    </Label>
                    <Input
                      id="register-company-document"
                      name="company_document"
                      value={registerForm.companyDocument}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          companyDocument: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-company-email">
                      {t('platformCompanies.form.companyEmailLabel', 'E-mail da empresa')}
                    </Label>
                    <Input
                      id="register-company-email"
                      name="company_email"
                      type="email"
                      value={registerForm.companyEmail}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, companyEmail: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="register-company-phone">
                      {t('platformCompanies.form.companyPhoneLabel', 'Telefone da empresa')}
                    </Label>
                    <Input
                      id="register-company-phone"
                      name="company_phone"
                      type="tel"
                      value={registerForm.companyPhone}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, companyPhone: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-company-address">
                      {t('platformCompanies.form.companyAddressLabel', 'Endereco')}
                    </Label>
                    <Input
                      id="register-company-address"
                      name="company_address"
                      value={registerForm.companyAddress}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, companyAddress: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="register-company-city">
                      {t('platformCompanies.form.companyCityLabel', 'Cidade')}
                    </Label>
                    <Input
                      id="register-company-city"
                      name="company_city"
                      value={registerForm.companyCity}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, companyCity: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-company-state">
                      {t('platformCompanies.form.companyStateLabel', 'Estado')}
                    </Label>
                    <Input
                      id="register-company-state"
                      name="company_state"
                      value={registerForm.companyState}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, companyState: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {registerStep === 2 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="register-admin-name">
                      {t('platformCompanies.form.adminNameLabel', 'Nome do admin')}
                    </Label>
                    <Input
                      id="register-admin-name"
                      name="admin_name"
                      value={registerForm.adminName}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, adminName: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-admin-email">
                      {t('platformCompanies.form.adminEmailLabel', 'E-mail do admin')}
                    </Label>
                    <Input
                      id="register-admin-email"
                      name="admin_email"
                      type="email"
                      value={registerForm.adminEmail}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({ ...prev, adminEmail: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-admin-password">
                    {t('platformCompanies.form.adminPasswordLabel', 'Senha do admin')}
                  </Label>
                  <Input
                    id="register-admin-password"
                    name="admin_password"
                    type="password"
                    value={registerForm.adminPassword}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, adminPassword: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-admin-password-confirmation">
                    {t(
                      'platformCompanies.form.adminPasswordConfirmationLabel',
                      'Confirma??o da senha do admin',
                    )}
                  </Label>
                  <Input
                    id="register-admin-password-confirmation"
                    name="admin_password_confirmation"
                    type="password"
                    value={registerForm.adminPasswordConfirmation}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        adminPasswordConfirmation: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <div className="flex items-center gap-3">
                {registerStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRegisterStep((prev) => Math.max(1, prev - 1))}
                    disabled={mutationLoading.register}
                  >
                    {t('common.actions.back', 'Voltar')}
                  </Button>
                )}
                {registerStep < 2 ? (
                  <Button type="button" onClick={() => setRegisterStep(2)} className="min-w-[140px]">
                    {t('platformCompanies.actions.continue', 'Continuar')}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={mutationLoading.register}
                    className="min-w-[180px]"
                  >
                    {mutationLoading.register
                      ? t('platformCompanies.actions.registering', 'Registrando...')
                      : t('platformCompanies.actions.register', 'Registrar empresa + admin')}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditCompany(null)
            setEditForm(buildCompanyForm())
            setEditLoading(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('platformCompanies.modals.editTitle', 'Editar empresa')}</DialogTitle>
            <DialogDescription>
              {t(
                'platformCompanies.modals.editDescription',
                'Atualize os dados da empresa selecionada.',
              )}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <Label htmlFor="edit-company-name">
                {t('platformCompanies.form.nameLabel', 'Nome da empresa')}
              </Label>
              <Input
                id="edit-company-name"
                name="name"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company-domain">
                {t('platformCompanies.form.domainLabel', 'Dominio')}
              </Label>
              <Input
                id="edit-company-domain"
                name="domain"
                value={editForm.domain}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, domain: event.target.value }))
                }
                placeholder={t('platformCompanies.form.domainPlaceholder', 'empresa.com')}
                disabled={editLoading}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={mutationLoading.update || editLoading}
                className="min-w-[140px]"
              >
                {mutationLoading.update
                  ? t('platformCompanies.actions.updating', 'Salvando...')
                  : t('platformCompanies.actions.save', 'Salvar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) {
            setDetailsCompany(null)
            setDetailsRaw(null)
            setDetailsError('')
            setBillingPlans([])
            setBillingPlansLoading(false)
            setBillingError('')
            setSubscription(null)
            setSubscriptionLoading(false)
            setSubscriptionUpdating(false)
            setSubscriptionForm({ planId: '' })
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{t('platformCompanies.modals.detailsTitle', 'Detalhes da empresa')}</DialogTitle>
            <DialogDescription>
              {t('platformCompanies.modals.detailsDescription', 'Informacoes completas da empresa.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-border/70 bg-muted/70 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">
                {detailsCompany?.name || t('platformCompanies.table.emptyName', 'Empresa')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {detailsCompany?.domain || detailsCompany?.id}
              </p>
            </div>

            {detailsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                  />
                ))}
              </div>
            ) : null}

            {!detailsLoading && detailsError ? (
              <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600">
                <p className="font-semibold">{t('platformCompanies.states.errorTitle', 'Algo deu errado')}</p>
                <p className="mt-1">{detailsError}</p>
              </div>
            ) : null}

            {!detailsLoading && !detailsError ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {t('platformCompanies.table.status', 'Status')}
                    </p>
                    <div className="mt-2">{renderStatusPill(detailsCompany?.status)}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {t('platformCompanies.table.createdAt', 'Criada em')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {formatDate(detailsCompany?.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {t('platformCompanies.table.id', 'ID')}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {detailsCompany?.id || '--'}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        {t('platformCompanies.billing.subscriptionTitle', 'Plano / assinatura')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {subscription?.plan?.name || t('platformCompanies.billing.noPlan', 'Sem plano')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {billingPlansLoading || subscriptionLoading
                          ? t('platformCompanies.billing.loading', 'Carregando...')
                          : subscription?.plan
                            ? formatPlanPrice(subscription.plan)
                            : t('platformCompanies.billing.selectPlan', 'Selecione um plano')}
                      </p>
                    </div>
                    {!subscriptionLoading && renderSubscriptionStatusPill(subscription?.status)}
                  </div>

                  {billingError ? (
                    <p className="mt-3 rounded-xl border border-rose-200/70 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
                      {billingError}
                    </p>
                  ) : null}

                  {billingPlansLoading || subscriptionLoading ? (
                    <div className="mt-4 space-y-2">
                      <div className="h-10 animate-pulse rounded-lg bg-muted" />
                      <div className="h-10 animate-pulse rounded-lg bg-muted" />
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="company-plan-select">
                          {t('platformCompanies.billing.planSelectLabel', 'Plano da empresa')}
                        </Label>
                        <select
                          id="company-plan-select"
                          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={subscriptionForm.planId}
                          onChange={(event) =>
                            setSubscriptionForm((prev) => ({ ...prev, planId: event.target.value }))
                          }
                          disabled={subscriptionUpdating}
                        >
                          <option value="">
                            {t('platformCompanies.billing.noPlanOption', 'Sem plano')}
                          </option>
                          {billingPlans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} — {formatPlanPrice(plan)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        className="min-w-[140px]"
                        onClick={handleSubscriptionSave}
                        disabled={subscriptionUpdating || isSamePlanSelection}
                      >
                        {subscriptionUpdating
                          ? t('platformCompanies.actions.saving', 'Salvando...')
                          : t('platformCompanies.actions.save', 'Salvar')}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {t('platformCompanies.details.raw', 'Payload completo')}
                  </p>
                  <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-muted/70 p-3 text-[11px] text-muted-foreground">
                    {JSON.stringify(detailsRaw || detailsCompany || {}, null, 2)}
                  </pre>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
      >
        <DialogContent>
          {confirmAction ? (
            <>
              <DialogHeader>
                <DialogTitle>{getConfirmCopy(confirmAction.type, confirmAction.company).title}</DialogTitle>
                <DialogDescription>
                  {getConfirmCopy(confirmAction.type, confirmAction.company).description}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-end gap-3 pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    {t('common.actions.cancel', 'Cancelar')}
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant={getConfirmCopy(confirmAction.type, confirmAction.company).variant}
                  disabled={confirmLoading}
                  onClick={handleConfirmAction}
                >
                  {confirmLoading
                    ? t('platformCompanies.actions.processing', 'Processando...')
                    : getConfirmCopy(confirmAction.type, confirmAction.company).confirm}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

