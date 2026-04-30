import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Building2,
  CalendarRange,
  ChevronDown,
  FileSearch,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { PageContainer } from '../components/ui/PageContainer'
import { Select } from '../components/ui/select'
import { useToast } from '../components/ui/use-toast'
import { formatDateTime } from '../lib/datetime'
import { cn } from '../lib/utils'
import { listCompanies } from '../services/platformCompaniesService'
import { listAllEmployees } from '../services/modules/employees'
import { getAuditLog } from '../services/auditLogsService'
import { useAuthStore } from '../store/useAuth'
import {
  AUDIT_PER_PAGE_OPTIONS,
  buildAuditLogSuggestions,
  formatAuditActionLabel,
  formatAuditEntityTypeLabel,
  formatAuditRoleLabel,
} from '../features/audit/utils'
import { useAuditLogs } from '../features/audit/useAuditLogs'

const FALLBACK_TEXT = 'Nao informado'

const safeText = (value, fallback = FALLBACK_TEXT) => {
  if (value === undefined || value === null) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

const isObjectLike = (value) => value !== null && typeof value === 'object'

const parseSearchableOptions = (items = [], query = '') => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return items
  return items.filter((item) => {
    const target = `${item.label || ''} ${item.hint || ''} ${item.value || ''}`.toLowerCase()
    return target.includes(normalizedQuery)
  })
}

function FilterCombobox({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  options = [],
  helper,
  disabled = false,
  allowManualEntry = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)

  const selectedOption = useMemo(
    () => options.find((item) => String(item.value) === String(value)) || null,
    [options, value],
  )

  const visibleOptions = useMemo(() => parseSearchableOptions(options, query), [options, query])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3 text-left text-sm text-foreground transition',
            open && 'border-ring',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">
            {selectedOption?.label || selectedOption?.value || value || placeholder}
          </span>
          {value ? (
            <span
              role="button"
              tabIndex={0}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation()
                onChange('')
                setQuery('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  onChange('')
                  setQuery('')
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground', open && 'rotate-180')} />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-[18px] border border-border/70 bg-card/95 p-3 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] backdrop-blur-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="h-9 pl-8 text-xs"
              />
            </div>

            {allowManualEntry ? (
              <div className="mt-2 flex gap-2">
                <Input
                  value={value || ''}
                  onChange={(event) => onChange(event.target.value)}
                  placeholder="Digite o ID exato"
                  className="h-9 text-xs"
                />
                <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Aplicar
                </Button>
              </div>
            ) : null}

            <div className="mt-2 max-h-64 space-y-2 overflow-auto pr-1">
              {visibleOptions.length ? (
                visibleOptions.map((item) => (
                  <button
                    key={`${item.value}`}
                    type="button"
                    onClick={() => {
                      onChange(item.value)
                      setOpen(false)
                      setQuery('')
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition',
                      String(item.value) === String(value)
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border/70 bg-background/70 hover:border-primary/30 hover:bg-muted/60',
                    )}
                  >
                    <Icon
                      className={cn(
                        'mt-0.5 h-3.5 w-3.5 shrink-0',
                        String(item.value) === String(value) ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-foreground">{item.label}</div>
                      {item.hint ? <div className="truncate text-[11px] text-muted-foreground">{item.hint}</div> : null}
                    </div>
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
                  {helper || 'Nenhum resultado encontrado.'}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {helper ? <p className="text-[11px] text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

function AuditValueView({ title, value, emptyText }) {
  const renderNode = useCallback((node, path = 'root') => {
    if (node === null || node === undefined || node === '') {
      return <span className="text-sm text-muted-foreground">{emptyText}</span>
    }

    if (typeof node !== 'object') {
      return <span className="break-words text-sm text-foreground">{String(node)}</span>
    }

    if (Array.isArray(node)) {
      if (!node.length) {
        return <span className="text-sm text-muted-foreground">{emptyText}</span>
      }

      return (
        <div className="space-y-2">
          {node.map((item, index) => (
            <div key={`${path}-${index}`} className="rounded-xl border border-border/70 bg-background/60 p-3">
              {renderNode(item, `${path}-${index}`)}
            </div>
          ))}
        </div>
      )
    }

    const entries = Object.entries(node)
    if (!entries.length) {
      return <span className="text-sm text-muted-foreground">{emptyText}</span>
    }

    return (
      <div className="space-y-2">
        {entries.map(([key, itemValue]) => (
          <div key={`${path}-${key}`} className="rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {key}
            </div>
            {isObjectLike(itemValue) ? (
              <div className="border-l border-border/70 pl-3">{renderNode(itemValue, `${path}-${key}`)}</div>
            ) : (
              <div className="break-words text-sm text-foreground">{safeText(itemValue, emptyText)}</div>
            )}
          </div>
        ))}
      </div>
    )
  }, [emptyText])

  return (
    <section className="space-y-3 rounded-[20px] border border-border/70 bg-card/70 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {renderNode(value)}
    </section>
  )
}

function AuditDetailDialog({ open, onOpenChange, log, loading, error, locale }) {
  const infoItemClassName = 'rounded-xl border border-border/70 bg-background/60 px-3 py-2'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle>{log ? formatAuditActionLabel(log.action) : 'Detalhes do log'}</DialogTitle>
          <DialogDescription>
            {log?.description || 'Inspecione o contexto completo desta acao de auditoria.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200/70 bg-rose-500/10 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : log ? (
          <div className="space-y-4">
            <section className="space-y-3 rounded-[20px] border border-border/70 bg-card/70 p-4">
              <h3 className="text-sm font-semibold text-foreground">Informacoes principais</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className={infoItemClassName}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Acao</div>
                  <div className="mt-1 text-sm font-semibold">{formatAuditActionLabel(log.action)}</div>
                </div>
                <div className={infoItemClassName}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Data e hora</div>
                  <div className="mt-1 text-sm">{formatDateTime(log.createdAt, { locale })}</div>
                </div>
                <div className={infoItemClassName}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Role</div>
                  <div className="mt-1 text-sm">{formatAuditRoleLabel(log.performedByRole)}</div>
                </div>
                <div className={infoItemClassName}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Ator</div>
                  <div className="mt-1 text-sm font-medium">{safeText(log.actor?.name)}</div>
                  <div className="text-[11px] text-muted-foreground">{safeText(log.actor?.email)}</div>
                </div>
                <div className={infoItemClassName}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Entidade</div>
                  <div className="mt-1 text-sm font-medium">{safeText(log.entityLabel)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatAuditEntityTypeLabel(log.entityType)} {log.entityId ? `#${log.entityId}` : ''}
                  </div>
                </div>
                <div className={infoItemClassName}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Empresa</div>
                  <div className="mt-1 text-sm">{safeText(log.company?.name)}</div>
                </div>
                <div className={infoItemClassName}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Empresa alvo</div>
                  <div className="mt-1 text-sm">{safeText(log.targetCompany?.name)}</div>
                </div>
                <div className={cn(infoItemClassName, 'md:col-span-2 xl:col-span-3')}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Descricao</div>
                  <div className="mt-1 text-sm">{safeText(log.description)}</div>
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <AuditValueView title="Antes" value={log.oldValues} emptyText="Sem valores anteriores." />
              <AuditValueView title="Depois" value={log.newValues} emptyText="Sem valores posteriores." />
            </div>

            <AuditValueView title="Contexto extra" value={log.metadata} emptyText="Sem metadata adicional." />

            <section className="space-y-3 rounded-[20px] border border-border/70 bg-card/70 p-4">
              <h3 className="text-sm font-semibold text-foreground">Contexto tecnico</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className={infoItemClassName}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Metodo</div>
                  <div className="mt-1 text-sm">{safeText(log.method)}</div>
                </div>
                <div className={infoItemClassName}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">IP</div>
                  <div className="mt-1 text-sm">{safeText(log.ipAddress)}</div>
                </div>
                <div className={cn(infoItemClassName, 'md:col-span-2')}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Rota</div>
                  <div className="mt-1 break-all text-sm">{safeText(log.route)}</div>
                </div>
                <div className={cn(infoItemClassName, 'md:col-span-2')}>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">User agent</div>
                  <div className="mt-1 break-all text-sm">{safeText(log.userAgent)}</div>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default function AuditLogs() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const isSuperAdmin = useMemo(
    () => roles?.some((role) => String(role).toLowerCase() === 'super_admin'),
    [roles],
  )
  const scope = isSuperAdmin ? 'platform' : 'admin'

  const {
    filters,
    logs,
    loading,
    error,
    pagination,
    setFilters,
    applyFilters,
    resetFilters,
    setPage,
    setPerPage,
    reload,
  } = useAuditLogs({ scope })

  const [companies, setCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const baseSuggestions = useMemo(() => buildAuditLogSuggestions(logs), [logs])

  useEffect(() => {
    if (!isSuperAdmin) return

    let active = true
    const loadCompanyOptions = async () => {
      setCompaniesLoading(true)
      try {
        const response = await listCompanies()
        if (!active) return
        setCompanies(
          (response?.data || []).map((company) => ({
            value: String(company.id),
            label: company.name || String(company.id),
            hint: company.slug || '',
          })),
        )
      } catch (requestError) {
        if (!active) return
        toast({
          title: 'Empresas indisponiveis',
          description:
            requestError?.response?.data?.message ||
            requestError?.message ||
            'Nao foi possivel carregar as empresas para o filtro.',
          variant: 'error',
        })
      } finally {
        if (active) setCompaniesLoading(false)
      }
    }

    loadCompanyOptions()
    return () => {
      active = false
    }
  }, [isSuperAdmin, toast])

  useEffect(() => {
    if (isSuperAdmin) return

    let active = true
    const loadEmployees = async () => {
      setEmployeesLoading(true)
      try {
        const response = await listAllEmployees({ perPage: 100 })
        if (!active) return
        setEmployees(
          (response || []).map((employee, index) => ({
            value: String(employee?.id ?? index),
            label: employee?.name || employee?.email || String(employee?.id ?? index),
            hint: employee?.email || '',
          })),
        )
      } catch (requestError) {
        if (!active) return
        toast({
          title: 'Colaboradores indisponiveis',
          description:
            requestError?.response?.data?.message ||
            requestError?.message ||
            'Nao foi possivel carregar os colaboradores para o filtro.',
          variant: 'error',
        })
      } finally {
        if (active) setEmployeesLoading(false)
      }
    }

    loadEmployees()
    return () => {
      active = false
    }
  }, [isSuperAdmin, toast])

  const userOptions = useMemo(() => {
    if (!isSuperAdmin) return employees
    return baseSuggestions.userOptions
  }, [baseSuggestions.userOptions, employees, isSuperAdmin])

  const actionOptions = useMemo(() => {
    const seedOptions = [
      'employee.updated',
      'employee.deleted',
      'time_entry.adjustment_approved',
      'platform.company_blocked',
      'company.settings.updated',
    ].map((value) => ({
      value,
      label: formatAuditActionLabel(value),
    }))

    const optionMap = new Map(seedOptions.map((option) => [option.value, option]))
    baseSuggestions.actionOptions.forEach((option) => optionMap.set(option.value, option))
    return Array.from(optionMap.values())
  }, [baseSuggestions.actionOptions])

  const entityTypeOptions = useMemo(() => {
    const seedOptions = ['employee', 'company', 'time_entry', 'document', 'vacation'].map((value) => ({
      value,
      label: formatAuditEntityTypeLabel(value),
    }))
    const optionMap = new Map(seedOptions.map((option) => [option.value, option]))
    baseSuggestions.entityTypeOptions.forEach((option) => optionMap.set(option.value, option))
    return Array.from(optionMap.values())
  }, [baseSuggestions.entityTypeOptions])

  const roleOptions = useMemo(
    () =>
      ['super_admin', 'admin', 'manager', 'area_manager', 'employee', 'system'].map((value) => ({
        value,
        label: formatAuditRoleLabel(value),
      })),
    [],
  )

  const companyColumnLabel = isSuperAdmin ? 'Empresa / alvo' : 'Empresa'
  const pageTitle = isSuperAdmin ? 'Auditoria da plataforma' : 'Auditoria da empresa'
  const pageSubtitle = isSuperAdmin
    ? 'Rastreie eventos globais e operacoes sobre todas as empresas a partir dos endpoints de plataforma.'
    : 'Consulte alteracoes relevantes da empresa atual com filtros, paginação e detalhe completo.'

  const openDetails = useCallback(
    async (log) => {
      setDetailOpen(true)
      setDetailLoading(true)
      setDetailError('')
      setSelectedLog(log)

      try {
        const detail = await getAuditLog(scope, log?.id)
        setSelectedLog(detail || log)
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          'Nao foi possivel carregar o detalhe deste log.'
        setDetailError(message)
      } finally {
        setDetailLoading(false)
      }
    },
    [scope],
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    applyFilters()
  }

  return (
    <div className="relative min-h-screen">
      <PageContainer className="py-6 lg:py-8">
        <div className="space-y-6">
          <AppTopBar
            icon={<ShieldCheck className="h-5 w-5" />}
            eyebrow={isSuperAdmin ? 'Plataforma' : 'Admin'}
            title={pageTitle}
            subtitle={pageSubtitle}
            rightMeta={
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                {pagination.total} registro(s)
              </span>
            }
            actions={
              <Button type="button" variant="outline" size="sm" onClick={reload} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Atualizar
              </Button>
            }
          />

          <Card className="overflow-visible border-dashed">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <FileSearch className="h-3.5 w-3.5" />
                <span>Filtros de auditoria</span>
              </div>
              <CardTitle className="mt-1 text-base">Refine por contexto, ator e periodo</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1.5 xl:col-span-2">
                    <Label htmlFor="audit-search" className="text-[11px] text-muted-foreground">
                      Busca geral
                    </Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="audit-search"
                        value={filters.search}
                        onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                        placeholder="Busque por descricao, entidade, rota ou contexto"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <FilterCombobox
                    label="Acao"
                    value={filters.action}
                    onChange={(value) => setFilters((current) => ({ ...current, action: value }))}
                    placeholder="Filtrar por acao"
                    icon={FileSearch}
                    options={actionOptions}
                  />

                  <FilterCombobox
                    label="Tipo de entidade"
                    value={filters.entity_type}
                    onChange={(value) => setFilters((current) => ({ ...current, entity_type: value }))}
                    placeholder="Filtrar por entidade"
                    icon={FileSearch}
                    options={entityTypeOptions}
                  />

                  {isSuperAdmin ? (
                    <FilterCombobox
                      label="Empresa"
                      value={filters.company_id}
                      onChange={(value) => setFilters((current) => ({ ...current, company_id: value }))}
                      placeholder="Selecione a empresa"
                      icon={Building2}
                      options={companies}
                      helper={companiesLoading ? 'Carregando empresas...' : ''}
                      disabled={companiesLoading}
                    />
                  ) : null}

                  {isSuperAdmin ? (
                    <FilterCombobox
                      label="Empresa alvo"
                      value={filters.target_company_id}
                      onChange={(value) => setFilters((current) => ({ ...current, target_company_id: value }))}
                      placeholder="Selecione a empresa alvo"
                      icon={Building2}
                      options={companies}
                      helper={companiesLoading ? 'Carregando empresas...' : 'Use quando a acao afetar outra empresa.'}
                      disabled={companiesLoading}
                    />
                  ) : null}

                  <FilterCombobox
                    label="Colaborador / usuario"
                    value={filters.user_id}
                    onChange={(value) => setFilters((current) => ({ ...current, user_id: value }))}
                    placeholder="Selecione um usuario"
                    icon={UserRound}
                    options={userOptions}
                    disabled={employeesLoading}
                    allowManualEntry={isSuperAdmin}
                    helper={
                      isSuperAdmin
                        ? 'Sem diretório global no frontend atual. Se precisar, informe o ID exato ou selecione atores vistos nos resultados.'
                        : employeesLoading
                          ? 'Carregando colaboradores...'
                          : ''
                    }
                  />

                  <FilterCombobox
                    label="Role de quem executou"
                    value={filters.performed_by_role}
                    onChange={(value) => setFilters((current) => ({ ...current, performed_by_role: value }))}
                    placeholder="Filtrar por role"
                    icon={ShieldCheck}
                    options={roleOptions}
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor="entity-id" className="text-[11px] text-muted-foreground">
                      ID da entidade
                    </Label>
                    <Input
                      id="entity-id"
                      value={filters.entity_id}
                      onChange={(event) => setFilters((current) => ({ ...current, entity_id: event.target.value }))}
                      placeholder="UUID ou ID"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="date-from" className="text-[11px] text-muted-foreground">
                      Data inicial
                    </Label>
                    <div className="relative">
                      <Input
                        id="date-from"
                        type="date"
                        value={filters.date_from}
                        onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))}
                        className="pr-9"
                      />
                      <CalendarRange className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="date-to" className="text-[11px] text-muted-foreground">
                      Data final
                    </Label>
                    <div className="relative">
                      <Input
                        id="date-to"
                        type="date"
                        value={filters.date_to}
                        onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))}
                        className="pr-9"
                      />
                      <CalendarRange className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">
                      Pagina {pagination.currentPage} de {pagination.lastPage}
                    </span>
                    <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">
                      {pagination.from || 0}-{pagination.to || logs.length} de {pagination.total}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="audit-per-page" className="text-[11px] text-muted-foreground">
                        Itens por pagina
                      </Label>
                      <Select
                        id="audit-per-page"
                        value={filters.per_page}
                        onChange={(event) => setPerPage(event.target.value)}
                        className="w-auto min-w-[84px]"
                      >
                        {AUDIT_PER_PAGE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <Button type="button" variant="outline" onClick={resetFilters}>
                      Limpar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Aplicar filtros
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Logs encontrados</div>
                  <CardTitle className="mt-1 text-base">Rastreamento detalhado de eventos</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-2xl bg-muted/60" />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-[20px] border border-rose-200/70 bg-rose-500/10 p-4 text-sm text-rose-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-semibold">Falha ao carregar a auditoria</div>
                      <div className="mt-1">{error}</div>
                    </div>
                  </div>
                </div>
              ) : logs.length ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[20px] border border-border/70">
                    <div className="overflow-x-auto">
                      <table className="min-w-[1080px] w-full text-sm">
                        <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3">Acao</th>
                            <th className="px-4 py-3">Descricao</th>
                            <th className="px-4 py-3">Ator</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">{companyColumnLabel}</th>
                            <th className="px-4 py-3">Entidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log) => (
                            <tr
                              key={log.id}
                              className="cursor-pointer border-t border-border/70 transition hover:bg-primary/5"
                              onClick={() => openDetails(log)}
                            >
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">
                                  {formatDateTime(log.createdAt, { locale: i18n.language })}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-semibold text-foreground">{formatAuditActionLabel(log.action)}</div>
                                <div className="text-[11px] text-muted-foreground">{safeText(log.action)}</div>
                              </td>
                              <td className="max-w-[340px] px-4 py-3 align-top text-foreground">
                                <div className="line-clamp-2">{safeText(log.description)}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">{safeText(log.actor?.name)}</div>
                                <div className="text-[11px] text-muted-foreground">{safeText(log.actor?.email)}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-foreground">
                                  {formatAuditRoleLabel(log.performedByRole)}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">{safeText(log.company?.name)}</div>
                                {isSuperAdmin ? (
                                  <div className="text-[11px] text-muted-foreground">
                                    Alvo: {safeText(log.targetCompany?.name)}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-foreground">{safeText(log.entityLabel)}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {formatAuditEntityTypeLabel(log.entityType)}
                                  {log.entityId ? ` #${log.entityId}` : ''}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Exibindo {pagination.from || 0} a {pagination.to || logs.length} de {pagination.total} registros.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(pagination.currentPage - 1)}
                        disabled={!pagination.canPrevious}
                      >
                        Anterior
                      </Button>
                      <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                        {pagination.currentPage}/{pagination.lastPage}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(pagination.currentPage + 1)}
                        disabled={!pagination.canNext}
                      >
                        Proxima
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-base font-semibold text-foreground">Nenhum log encontrado</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Ajuste os filtros ou amplie o periodo para localizar eventos de auditoria.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>

      <AuditDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        log={selectedLog}
        loading={detailLoading}
        error={detailError}
        locale={i18n.language}
      />
    </div>
  )
}
