import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ClipboardList, Clock3, Loader2, RefreshCcw, Search } from 'lucide-react'
import { AppTopBar } from '../components/ui/AppTopBar'
import { PageContainer } from '../components/ui/PageContainer'
import { Button } from '../components/ui/button'
import { actionTabButtonClass, bareFieldInputClass, fieldShellClass } from '../components/ui/form-controls'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useAuthStore } from '../store/useAuth'
import { useDateTime } from '../hooks/useDateTime'
import { useEmployeeAdjustments } from '../hooks/useEmployeeAdjustments'
import { cn } from '../lib/utils'

const EMPLOYEE_REQUIRES = { anyOf: ['employee'] }
const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected']
const COMPACT_BUTTON_CLASS = 'h-8 rounded-md px-2.5 text-[11px]'

const STATUS_STYLES = {
  approved: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  pending: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  rejected: 'border-rose-200/70 bg-rose-500/10 text-rose-600',
}

const getStatusClass = (status) => STATUS_STYLES[status] || 'border-slate-200/70 bg-slate-100 text-slate-600'

export default function EmployeeAdjustments({ sidebarOpen = false, onToggleSidebar = () => {} }) {
  const { t } = useTranslation()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, EMPLOYEE_REQUIRES), [capabilities])
  const { formatDateTime } = useDateTime()

  const [status, setStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  const { adjustments, loading, error, meta, reload } = useEmployeeAdjustments({
    status,
    page,
    enabled: hasAccess,
  })

  const statusLabel = (currentStatus) => {
    const normalized = String(currentStatus || '').toLowerCase()
    if (normalized === 'approved') return t('employeeAdjustmentsPage.status.approved', 'Aprovado')
    if (normalized === 'rejected') return t('employeeAdjustmentsPage.status.rejected', 'Recusado')
    if (normalized === 'pending') return t('employeeAdjustmentsPage.status.pending', 'Pendente')
    return t('employeeAdjustmentsPage.status.unknown', 'Desconhecido')
  }

  const filteredAdjustments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return adjustments
    return adjustments.filter((item) => {
      const target = `${item.reason || ''} ${item.id || ''}`.toLowerCase()
      return target.includes(query)
    })
  }, [adjustments, searchTerm])

  const pageCount = meta.lastPage ?? 1
  const currentPage = meta.currentPage ?? 1

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
        <PageContainer className="py-5 sm:py-6">
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-6 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {t('employeeAdjustmentsPage.states.noPermissionTitle', 'Acesso restrito')}
            </p>
            <p className="mt-1">
              {t(
                'employeeAdjustmentsPage.states.noPermissionDescription',
                'Voce nao tem permissao para acessar esta pagina.',
              )}
            </p>
          </div>
        </PageContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="space-y-6 py-5 sm:py-6">
        <AppTopBar
          icon={
            <button
              type="button"
              aria-label={t('sidebar.actions.expand', { defaultValue: 'Abrir menu' })}
              onClick={onToggleSidebar}
              className="flex h-full w-full items-center justify-center"
            >
              <ClipboardList className="h-5 w-5" />
            </button>
          }
          eyebrow={t('sidebar.sections.workspace')}
          title={t('employeeAdjustmentsPage.title', 'Solicitacoes de ajustes')}
          subtitle={t(
            'employeeAdjustmentsPage.subtitle',
            'Acompanhe somente os ajustes de ponto enviados por voce.',
          )}
          actions={
            <Button
              variant="outline"
              onClick={() => {
                setStatus('all')
                setSearchTerm('')
                setPage(1)
                reload()
              }}
              disabled={loading}
              className={cn(COMPACT_BUTTON_CLASS, 'border-border bg-background/80')}
            >
              <RefreshCcw className={cn('h-3.5 w-3.5 text-primary', loading && 'animate-spin')} />
              {t('employeeAdjustmentsPage.actions.refresh', 'Atualizar')}
            </Button>
          }
        />

        <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_18px_70px_-50px_rgba(62,82,152,0.35)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    actionTabButtonClass,
                    'border',
                    status === option
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 bg-background/60 text-muted-foreground hover:border-border/80',
                  )}
                  onClick={() => {
                    setStatus(option)
                    setPage(1)
                  }}
                >
                  {option === 'all'
                    ? t('employeeAdjustmentsPage.filters.all', 'Todos')
                    : statusLabel(option)}
                </button>
              ))}
            </div>
            <div className={cn(fieldShellClass, 'w-full max-w-xs focus-within:ring-primary/40')}>
              <Search className="h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t(
                  'employeeAdjustmentsPage.filters.searchPlaceholder',
                  'Buscar por motivo',
                )}
                className={bareFieldInputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_18px_70px_-50px_rgba(62,82,152,0.35)] sm:p-6">
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground">
              {t('employeeAdjustmentsPage.list.title', 'Minhas solicitacoes')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                'employeeAdjustmentsPage.list.description',
                'Todos os pedidos de ajuste de ponto que voce enviou.',
              )}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200/70 bg-rose-500/10 px-4 py-5 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-rose-600" />
                <div>
                  <p className="font-semibold text-foreground">
                    {t('employeeAdjustmentsPage.states.errorTitle', 'Erro ao carregar')}
                  </p>
                  <p className="mt-1 text-muted-foreground">{error}</p>
                </div>
              </div>
            </div>
          ) : filteredAdjustments.length ? (
            <div className="space-y-3">
              {filteredAdjustments.map((adjustment) => (
                <div
                  key={adjustment.id}
                  className="rounded-2xl border border-border/70 bg-card/90 px-4 py-4 shadow-[0_18px_70px_-50px_rgba(62,82,152,0.55)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {t('employeeAdjustmentsPage.table.id', 'Solicitacao')}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {t('employeeAdjustmentsPage.table.createdAt', 'Solicitado em')}:{' '}
                          {formatDateTime(adjustment.createdAt) ||
                            t('employeeAdjustmentsPage.table.unset', 'Nao informado')}
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
                        {t('employeeAdjustmentsPage.table.corrected', 'Horario corrigido')}
                      </p>
                      <p className="font-semibold text-foreground">
                        {formatDateTime(adjustment.correctedTime) ||
                          t('employeeAdjustmentsPage.table.unset', 'Nao informado')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {t('employeeAdjustmentsPage.table.reason', 'Motivo')}
                      </p>
                      <p className="text-foreground">
                        {adjustment.reason || t('employeeAdjustmentsPage.table.unset', 'Nao informado')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card/90 px-4 py-5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold text-foreground">
                    {t('employeeAdjustmentsPage.states.emptyTitle', 'Nenhuma solicitacao')}
                  </p>
                  <p className="mt-1">
                    {t(
                      'employeeAdjustmentsPage.states.emptyDescription',
                      'Nenhum ajuste encontrado com os filtros selecionados.',
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {pageCount > 1 ? (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                {t('employeeAdjustmentsPage.pagination.page', 'Pagina')} {currentPage}{' '}
                {t('employeeAdjustmentsPage.pagination.of', 'de')} {pageCount}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className={COMPACT_BUTTON_CLASS}
                >
                  {t('employeeAdjustmentsPage.pagination.previous', 'Anterior')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= pageCount || loading}
                  onClick={() => setPage((prev) => prev + 1)}
                  className={COMPACT_BUTTON_CLASS}
                >
                  {t('employeeAdjustmentsPage.pagination.next', 'Proxima')}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </PageContainer>
    </div>
  )
}
