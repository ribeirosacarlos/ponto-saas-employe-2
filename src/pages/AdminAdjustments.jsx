import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ClipboardList, Clock3, RefreshCcw, Search, UserCheck, UserX } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { PageContainer } from '../components/ui/PageContainer'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useAuthStore } from '../store/useAuth'
import { useDateTime } from '../hooks/useDateTime'
import {
  approveAdminAdjustment,
  listAdminAdjustments,
  listTeamEntries,
  rejectAdminAdjustment,
} from '../services/adminAdjustmentsService'

const PAGE_SIZE = 10
const MANAGEMENT_REQUIRES = { anyOf: ['area_manager', 'admin', 'super_admin'] }

const STATUS_STYLES = {
  approved: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  pending: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  rejected: 'border-rose-200/70 bg-rose-500/10 text-rose-600',
}

const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected']

const TYPE_LABELS = {
  in: 'types.in',
  out: 'types.out',
  break_start: 'adminAdjustmentsPage.types.breakStart',
  break_end: 'adminAdjustmentsPage.types.breakEnd',
}

const getStatusClass = (status) => STATUS_STYLES[status] || 'border-slate-200/70 bg-slate-100 text-slate-600'

export default function AdminAdjustments({ sidebarOpen = false, onToggleSidebar = () => {} }) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const { formatDateTime } = useDateTime()
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, MANAGEMENT_REQUIRES), [capabilities])

  const [filters, setFilters] = useState({ status: 'pending', userId: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  const [adjustments, setAdjustments] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState({})

  const [teamEntries, setTeamEntries] = useState([])
  const [teamMeta, setTeamMeta] = useState(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState('')

  const statusLabel = useCallback(
    (status) => {
      const normalized = (status || '').toString().toLowerCase()
      if (normalized === 'approved') return t('adminAdjustmentsPage.status.approved', 'Aprovado')
      if (normalized === 'rejected') return t('adminAdjustmentsPage.status.rejected', 'Recusado')
      if (normalized === 'pending') return t('adminAdjustmentsPage.status.pending', 'Pendente')
      return t('adminAdjustmentsPage.status.unknown', 'Desconhecido')
    },
    [t],
  )

  const typeLabel = useCallback(
    (type) => {
      if (!type) return t('adminAdjustmentsPage.table.unset', 'Nao informado')
      const normalized = type.toString().toLowerCase()
      const key = TYPE_LABELS[normalized]
      if (key) return t(key, normalized)
      return normalized
    },
    [t],
  )

  const loadAdjustments = useCallback(
    async (pageToLoad = 1) => {
      if (!hasAccess) return
      setLoading(true)
      setError('')
      try {
        const status = filters.status === 'all' ? undefined : filters.status
        const userId = filters.userId || undefined
        const { data, meta: responseMeta } = await listAdminAdjustments({
          status,
          userId,
          page: pageToLoad,
          perPage: PAGE_SIZE,
        })
        setAdjustments(data || [])
        setMeta(responseMeta || null)
        setPage(responseMeta?.currentPage || pageToLoad || 1)
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('adminAdjustmentsPage.states.errorDescription', 'Nao foi possivel carregar os ajustes.')
        setError(message)
        setAdjustments([])
      } finally {
        setLoading(false)
      }
    },
    [filters.status, filters.userId, hasAccess, t],
  )

  const loadTeam = useCallback(
    async (pageToLoad = 1) => {
      if (!hasAccess) return
      setTeamLoading(true)
      setTeamError('')
      try {
        const { data, meta: responseMeta } = await listTeamEntries({ page: pageToLoad })
        setTeamEntries(data || [])
        setTeamMeta(responseMeta || null)
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('adminAdjustmentsPage.teamEntries.error', 'Nao foi possivel carregar as batidas.')
        setTeamError(message)
        setTeamEntries([])
      } finally {
        setTeamLoading(false)
      }
    },
    [hasAccess, t],
  )

  useEffect(() => {
    if (!hasAccess) return
    loadAdjustments(page)
  }, [hasAccess, loadAdjustments, page])

  useEffect(() => {
    if (!hasAccess) return
    setPage(1)
  }, [filters.status, filters.userId, hasAccess])

  useEffect(() => {
    if (!hasAccess) return
    loadTeam(1)
  }, [hasAccess, loadTeam])

  const filteredAdjustments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return adjustments
    return (adjustments || []).filter((item) => {
      const target = `${item.user?.name || ''} ${item.user?.email || ''} ${item.reason || ''}`.toLowerCase()
      return target.includes(query)
    })
  }, [adjustments, searchTerm])

  const userOptions = useMemo(() => {
    const map = new Map()
    adjustments.forEach((item, index) => {
      if (!item?.userId) return
      map.set(item.userId, item.user || { name: t('adminAdjustmentsPage.table.userFallback', 'Colaborador'), hint: index })
    })
    teamEntries.forEach((entry) => {
      if (!entry?.userId) return
      if (map.has(entry.userId)) return
      map.set(entry.userId, entry.user || { name: t('adminAdjustmentsPage.table.userFallback', 'Colaborador') })
    })
    return Array.from(map.entries()).map(([value, user]) => ({
      value,
      label: user?.name || user?.email || value,
      email: user?.email,
    }))
  }, [adjustments, teamEntries, t])

  const handleApprove = async (id) => {
    if (!id) return
    setActionLoading((prev) => ({ ...prev, [id]: 'approve' }))
    try {
      await approveAdminAdjustment(id)
      toast({
        title: t('adminAdjustmentsPage.actions.approveSuccess', 'Ajuste aprovado'),
        description: t('adminAdjustmentsPage.actions.approveDescription', 'Status atualizado para aprovado.'),
      })
      loadAdjustments(page)
    } catch (err) {
      toast({
        title: t('adminAdjustmentsPage.actions.approveError', 'Nao foi possivel aprovar'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('adminAdjustmentsPage.states.errorDescription', 'Nao foi possivel carregar os ajustes.'),
        variant: 'destructive',
      })
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  const handleReject = async (id) => {
    if (!id) return
    setActionLoading((prev) => ({ ...prev, [id]: 'reject' }))
    try {
      await rejectAdminAdjustment(id)
      toast({
        title: t('adminAdjustmentsPage.actions.rejectSuccess', 'Ajuste recusado'),
        description: t('adminAdjustmentsPage.actions.rejectDescription', 'Status atualizado para recusado.'),
      })
      loadAdjustments(page)
    } catch (err) {
      toast({
        title: t('adminAdjustmentsPage.actions.rejectError', 'Nao foi possivel recusar'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('adminAdjustmentsPage.states.errorDescription', 'Nao foi possivel carregar os ajustes.'),
        variant: 'destructive',
      })
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  const adjustmentsState = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`adjustment-skel-${index}`}
              className="animate-pulse rounded-2xl border border-border/70 bg-card/80 px-4 py-4"
            >
              <div className="h-4 w-2/3 rounded-full bg-muted/70" />
              <div className="mt-3 h-3 w-1/2 rounded-full bg-muted/60" />
              <div className="mt-2 h-3 w-5/6 rounded-full bg-muted/50" />
            </div>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-rose-200/70 bg-rose-500/10 px-4 py-4 text-sm text-rose-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-semibold">{t('adminAdjustmentsPage.states.errorTitle', 'Algo deu errado')}</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => loadAdjustments(page)}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t('adminAdjustmentsPage.actions.refresh', 'Tentar novamente')}
            </Button>
          </div>
        </div>
      )
    }

    if (!filteredAdjustments.length) {
      return (
        <div className="rounded-2xl border border-border/70 bg-card/90 px-4 py-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">
            {t('adminAdjustmentsPage.states.emptyTitle', 'Nenhuma solicitacao')}
          </p>
          <p className="mt-1">
            {t(
              'adminAdjustmentsPage.states.emptyDescription',
              'Nenhum ajuste encontrado com os filtros selecionados.',
            )}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {filteredAdjustments.map((adjustment) => {
          const disabled = actionLoading[adjustment.id]
          const createdAt =
            formatDateTime(adjustment.createdAt) ||
            t('adminAdjustmentsPage.table.unset', 'Nao informado')
          return (
            <div
              key={adjustment.id}
              className="rounded-2xl border border-border/70 bg-card/90 px-4 py-4 shadow-[0_18px_70px_-50px_rgba(62,82,152,0.55)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {adjustment.user?.name || t('adminAdjustmentsPage.table.userFallback', 'Colaborador')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {adjustment.user?.email || t('adminAdjustmentsPage.table.userEmailFallback', 'Email nao informado')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {t('adminAdjustmentsPage.table.createdAt', 'Solicitado em')}: {createdAt}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm',
                    getStatusClass(adjustment.status),
                  )}
                >
                  {statusLabel(adjustment.status)}
                </span>
              </div>

              <div className="mt-3 grid gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3 text-xs sm:grid-cols-2 sm:text-sm">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('adminAdjustmentsPage.table.corrected', 'Horario corrigido')}
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatDateTime(adjustment.correctedTime) ||
                      t('adminAdjustmentsPage.table.unset', 'Nao informado')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('adminAdjustmentsPage.table.reason', 'Motivo')}
                  </p>
                  <p className="text-foreground">
                    {adjustment.reason || t('adminAdjustmentsPage.table.unset', 'Nao informado')}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {t('adminAdjustmentsPage.table.id', 'ID')}: {adjustment.id}
                </p>
                {adjustment.status === 'pending' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(adjustment.id)}
                      disabled={disabled}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      {actionLoading[adjustment.id] === 'reject'
                        ? t('adminAdjustmentsPage.actions.rejecting', 'Recusando...')
                        : t('adminAdjustmentsPage.actions.reject', 'Recusar')}
                    </Button>
                    <Button size="sm" onClick={() => handleApprove(adjustment.id)} disabled={disabled}>
                      <UserCheck className="mr-2 h-4 w-4" />
                      {actionLoading[adjustment.id] === 'approve'
                        ? t('adminAdjustmentsPage.actions.approving', 'Aprovando...')
                        : t('adminAdjustmentsPage.actions.approve', 'Aprovar')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    )
  }, [
    actionLoading,
    error,
    filteredAdjustments,
    formatDateTime,
    loadAdjustments,
    loading,
    page,
    statusLabel,
    t,
  ])

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
        <PageContainer className="py-5 sm:py-6">
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-6 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {t('equipoPage.states.noPermissionTitle')}
            </p>
            <p className="mt-1">
              {t('equipoPage.states.noPermissionDescription', 'Voce nao tem permissao para acessar.')}
            </p>
          </div>
        </PageContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="py-5 sm:py-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border/80 bg-card/90 px-5 py-5 shadow-[0_10px_45px_-30px_rgba(62,82,152,0.35)] backdrop-blur-lg sm:px-7 sm:py-6 lg:px-8 lg:py-5">
          <div className="flex min-w-[240px] flex-1 flex-col gap-3 sm:max-w-xl">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                aria-label={t('sidebar.actions.expand', { defaultValue: 'Abrir menu' })}
                onClick={onToggleSidebar}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted text-foreground transition hover:bg-muted/80"
              >
                <ClipboardList className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {t('sidebar.sections.admin')}
                </p>
                <h1 className="text-2xl font-semibold leading-tight">
                  {t('adminAdjustmentsPage.title', 'Ajustes de ponto')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'adminAdjustmentsPage.subtitle',
                    'Acompanhe solicitacoes de ajuste e aprove ou recuse rapidamente.',
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadAdjustments(page)} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t('adminAdjustmentsPage.actions.refresh', 'Atualizar')}
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-1">
          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_18px_70px_-50px_rgba(62,82,152,0.35)] sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('adminAdjustmentsPage.filters.title', 'Filtros')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'adminAdjustmentsPage.filters.description',
                      'Selecione status, colaborador ou pesquise por nome/motivo.',
                    )}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t('adminAdjustmentsPage.filters.status', 'Status')}
                  </Label>
                  <select
                    value={filters.status}
                    onChange={(event) => {
                      setFilters((prev) => ({ ...prev, status: event.target.value }))
                    }}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === 'all'
                          ? t('adminAdjustmentsPage.filters.all', 'Todos')
                          : statusLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t('adminAdjustmentsPage.filters.employee', 'Colaborador')}
                  </Label>
                  <select
                    value={filters.userId}
                    onChange={(event) => {
                      setFilters((prev) => ({ ...prev, userId: event.target.value }))
                    }}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">
                      {t('adminAdjustmentsPage.filters.allEmployees', 'Todos os colaboradores')}
                    </option>
                    {userOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} {option.email ? `(${option.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t('adminAdjustmentsPage.filters.search', 'Busca')}
                  </Label>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/40">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder={t(
                        'adminAdjustmentsPage.filters.searchPlaceholder',
                        'Nome, email ou motivo',
                      )}
                      className="h-full w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_18px_70px_-50px_rgba(62,82,152,0.35)] sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('adminAdjustmentsPage.list.title', 'Solicitacoes de ajuste')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'adminAdjustmentsPage.list.description',
                      'Aprove ou recuse rapidamente os ajustes enviados pelos colaboradores.',
                    )}
                  </p>
                </div>
              </div>
              {adjustmentsState}
              {meta?.lastPage || meta?.total ? (
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    {t('adminAdjustmentsPage.pagination.page', 'Pagina')} {meta?.currentPage || page}{' '}
                    {meta?.lastPage ? ` ${t('adminAdjustmentsPage.pagination.of', 'de')} ${meta.lastPage}` : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading || (meta?.currentPage || page) <= 1}
                      onClick={() => setPage((prev) => Math.max(1, (prev || 1) - 1))}
                    >
                      {t('adminAdjustmentsPage.pagination.previous', 'Anterior')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        loading ||
                        (meta?.lastPage
                          ? (meta?.currentPage || page) >= meta.lastPage
                          : filteredAdjustments.length < PAGE_SIZE)
                      }
                      onClick={() => setPage((prev) => (prev || 1) + 1)}
                    >
                      {t('adminAdjustmentsPage.pagination.next', 'Proxima')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          {/* <aside className="space-y-4">
            <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_18px_70px_-50px_rgba(62,82,152,0.35)] sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('adminAdjustmentsPage.teamEntries.title', 'Batidas da equipe')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'adminAdjustmentsPage.teamEntries.description',
                      'Ultimas batidas registradas pelos colaboradores da area.',
                    )}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => loadTeam(teamMeta?.currentPage || 1)} disabled={teamLoading}>
                  <RefreshCcw className={cn('mr-2 h-4 w-4', teamLoading && 'animate-spin')} />
                  {t('adminAdjustmentsPage.actions.refresh', 'Atualizar')}
                </Button>
              </div>

              {teamLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`team-entry-skel-${index}`}
                      className="animate-pulse rounded-2xl border border-border/70 bg-card/80 px-4 py-3"
                    >
                      <div className="h-3 w-2/3 rounded-full bg-muted/70" />
                      <div className="mt-2 h-3 w-1/2 rounded-full bg-muted/50" />
                    </div>
                  ))}
                </div>
              ) : teamError ? (
                <div className="rounded-2xl border border-rose-200/70 bg-rose-500/10 px-4 py-4 text-xs text-rose-700">
                  <p className="font-semibold">{t('adminAdjustmentsPage.states.errorTitle', 'Algo deu errado')}</p>
                  <p className="mt-1">{teamError}</p>
                </div>
              ) : teamEntries.length ? (
                <div className="space-y-3">
                  {teamEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">
                          {entry.user?.name || t('adminAdjustmentsPage.table.userFallback', 'Colaborador')}
                        </p>
                        <span className="text-[11px] text-muted-foreground">{typeLabel(entry.type)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.user?.email || t('adminAdjustmentsPage.table.userEmailFallback', 'Email nao informado')}
                      </p>
                      <p className="mt-2 text-xs text-foreground">
                        {formatDateTime(entry.clockedAt, t('adminAdjustmentsPage.table.unset', 'Nao informado'))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4 text-xs text-muted-foreground">
                  {t('adminAdjustmentsPage.teamEntries.empty', 'Nenhuma batida encontrada ainda.')}
                </div>
              )}

              {teamMeta?.lastPage || teamMeta?.total ? (
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div>
                    {t('adminAdjustmentsPage.pagination.page', 'Pagina')} {teamMeta?.currentPage || 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={teamLoading || (teamMeta?.currentPage || 1) <= 1}
                      onClick={() => loadTeam(Math.max(1, (teamMeta?.currentPage || 1) - 1))}
                    >
                      {t('adminAdjustmentsPage.pagination.previous', 'Anterior')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        teamLoading ||
                        (teamMeta?.lastPage
                          ? (teamMeta?.currentPage || 1) >= teamMeta.lastPage
                          : teamEntries.length < (teamMeta?.perPage || PAGE_SIZE))
                      }
                      onClick={() => loadTeam((teamMeta?.currentPage || 1) + 1)}
                    >
                      {t('adminAdjustmentsPage.pagination.next', 'Proxima')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
          </aside> */}
        </div>
      </PageContainer>
    </div>
  )
}
