import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Eye, RefreshCcw, Search } from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useSuperAdminCompanies } from '../features/superAdmin/useSuperAdminCompanies'
import {
  formatCurrencyEUR,
  formatSuperAdminDate,
  formatSuperAdminDateTime,
  getHealthStatusMeta,
  getSubscriptionStatusMeta,
} from '../features/superAdmin/utils'
import { cn } from '../lib/utils'

const ACCESS_REQUIRES = { anyOf: ['super_admin'] }
const PER_PAGE_OPTIONS = [10, 20, 50, 100]

const SORT_OPTIONS = [
  { value: 'name', labelKey: 'superAdmin.companies.filters.sort.name', defaultLabel: 'Nome (A-Z)' },
  { value: '-name', labelKey: 'superAdmin.companies.filters.sort.nameDesc', defaultLabel: 'Nome (Z-A)' },
  { value: '-created_at', labelKey: 'superAdmin.companies.filters.sort.createdDesc', defaultLabel: 'Criacao mais recente' },
  { value: 'created_at', labelKey: 'superAdmin.companies.filters.sort.createdAsc', defaultLabel: 'Criacao mais antiga' },
  { value: '-updated_at', labelKey: 'superAdmin.companies.filters.sort.updatedDesc', defaultLabel: 'Atualizacao mais recente' },
  { value: '-employees_count', labelKey: 'superAdmin.companies.filters.sort.employeesDesc', defaultLabel: 'Mais colaboradores' },
  { value: '-active_employees_30d', labelKey: 'superAdmin.companies.filters.sort.activeEmployeesDesc', defaultLabel: 'Mais ativos 30d' },
  { value: '-time_entries_30d', labelKey: 'superAdmin.companies.filters.sort.timeEntriesDesc', defaultLabel: 'Mais pontos 30d' },
  { value: '-last_activity_at', labelKey: 'superAdmin.companies.filters.sort.lastActivityDesc', defaultLabel: 'Ultima atividade mais recente' },
  { value: 'last_activity_at', labelKey: 'superAdmin.companies.filters.sort.lastActivityAsc', defaultLabel: 'Ultima atividade mais antiga' },
]

export default function SuperAdminCompanies({ onOpenCompany }) {
  const { t, i18n } = useTranslation()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])
  const {
    companies,
    loading,
    error,
    filters,
    setFilters,
    pagination,
    refreshCompanies,
  } = useSuperAdminCompanies({ enabled: hasAccess, t })

  const [searchDraft, setSearchDraft] = useState(filters.search)

  useEffect(() => {
    setSearchDraft(filters.search)
  }, [filters.search])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchDraft === filters.search) return
      setFilters((prev) => ({ ...prev, search: searchDraft, page: 1 }))
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [filters.search, searchDraft, setFilters])

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('superAdmin.companies.filters.status.all', 'Todos os status') },
      { value: 'active', label: t('superAdmin.shared.subscription.active', 'Ativa') },
      { value: 'blocked', label: t('superAdmin.shared.subscription.blocked', 'Bloqueada') },
      { value: 'trialing', label: t('superAdmin.shared.subscription.trialing', 'Trial') },
      { value: 'past_due', label: t('superAdmin.shared.subscription.past_due', 'Em atraso') },
      { value: 'canceled', label: t('superAdmin.shared.subscription.canceled', 'Cancelada') },
    ],
    [t],
  )

  const activityOptions = useMemo(
    () => [
      { value: 'all', label: t('superAdmin.companies.filters.activity.all', 'Toda atividade') },
      { value: 'active', label: t('superAdmin.companies.filters.activity.active', 'Ativas') },
      { value: 'inactive', label: t('superAdmin.companies.filters.activity.inactive', 'Inativas') },
    ],
    [t],
  )

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
        title={t('superAdmin.companies.title', 'Empresas da plataforma')}
        subtitle={t(
          'superAdmin.companies.subtitle',
          'Acompanhe atividade, saude operacional e assinatura por empresa.',
        )}
        filters={
          <>
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                placeholder={t('superAdmin.companies.filters.searchPlaceholder', 'Buscar por nome, slug ou e-mail')}
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </div>
            <SelectFilter
              ariaLabel={t('superAdmin.companies.filters.status.label', 'Status')}
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={statusOptions}
            />
            <SelectFilter
              ariaLabel={t('superAdmin.companies.filters.activity.label', 'Atividade')}
              value={filters.activity}
              onChange={(value) => setFilters((prev) => ({ ...prev, activity: value, page: 1 }))}
              options={activityOptions}
            />
            <SelectFilter
              ariaLabel={t('superAdmin.companies.filters.sort.label', 'Ordenacao')}
              value={filters.sort}
              onChange={(value) => setFilters((prev) => ({ ...prev, sort: value, page: 1 }))}
              options={SORT_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.labelKey, option.defaultLabel),
              }))}
            />
            <SelectFilter
              ariaLabel={t('superAdmin.companies.filters.perPage.label', 'Itens por pagina')}
              value={String(filters.perPage)}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, perPage: Number(value) || 20, page: 1 }))
              }
              options={PER_PAGE_OPTIONS.map((value) => ({
                value: String(value),
                label: t('superAdmin.companies.filters.perPage.option', {
                  defaultValue: '{{value}} por pagina',
                  value,
                }),
              }))}
            />
          </>
        }
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => refreshCompanies()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {t('superAdmin.shared.actions.refresh', 'Atualizar')}
          </Button>
        }
      />

      <section className="rounded-3xl border border-border/80 bg-card/95 p-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t('superAdmin.companies.table.label', 'Tabela')}
            </p>
            <h2 className="text-sm font-semibold">
              {t('superAdmin.companies.table.title', 'Lista de empresas')}
            </h2>
          </div>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t('superAdmin.companies.table.count', {
              defaultValue: '{{count}} registros',
              count: pagination.total || companies.length,
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
            <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600">
              <p className="font-semibold">{t('superAdmin.shared.states.errorTitle', 'Algo deu errado')}</p>
              <p className="mt-1">{error}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 rounded-full px-3"
                onClick={() => refreshCompanies()}
              >
                {t('superAdmin.shared.actions.retry', 'Tentar novamente')}
              </Button>
            </div>
          ) : null}

          {!loading && !error && companies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                {t('superAdmin.companies.states.emptyTitle', 'Nenhuma empresa encontrada')}
              </p>
              <p className="mt-1">
                {t(
                  'superAdmin.companies.states.emptyDescription',
                  'Ajuste os filtros ou aguarde novos dados da plataforma.',
                )}
              </p>
            </div>
          ) : null}

          {!loading && !error && companies.length > 0 ? (
            <>
              <div className="space-y-3 md:hidden">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    className="w-full rounded-2xl border border-border/70 bg-card/95 p-4 text-left shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)] transition hover:border-primary/30"
                    onClick={() => onOpenCompany?.(company.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">
                          {company.name || t('superAdmin.shared.table.emptyName', 'Empresa')}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{company.slug || company.email || company.id}</p>
                      </div>
                      <StatusBadge
                        className={getHealthStatusMeta(company.healthStatus, t).className}
                        label={getHealthStatusMeta(company.healthStatus, t).label}
                      />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <Info label={t('superAdmin.companies.table.subscriptionStatus', 'Assinatura')}>
                        <StatusBadge
                          className={getSubscriptionStatusMeta(
                            company.subscriptionStatus,
                            company.subscriptionStatusLabel,
                            t,
                          ).className}
                          label={getSubscriptionStatusMeta(
                            company.subscriptionStatus,
                            company.subscriptionStatusLabel,
                            t,
                          ).label}
                        />
                      </Info>
                      <Info label={t('superAdmin.companies.table.plan', 'Plano')}>{company.planName || '--'}</Info>
                      <Info label={t('superAdmin.companies.table.employees', 'Colaboradores')}>
                        {company.employeesCount}
                      </Info>
                      <Info label={t('superAdmin.companies.table.lastActivity', 'Ultima atividade')}>
                        {formatSuperAdminDateTime(company.lastActivityAt, i18n.language, company.timezone)}
                      </Info>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                        <Eye className="h-3.5 w-3.5" />
                        {t('superAdmin.shared.actions.viewDetails', 'Ver detalhes')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[1200px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      <th className="px-3 py-3">{t('superAdmin.companies.table.name', 'Nome')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.subscriptionStatus', 'Status da assinatura')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.plan', 'Plano')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.price', 'Preco')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.employees', 'Colaboradores')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.activeEmployees30d', 'Ativos 30d')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.timeEntriesToday', 'Pontos hoje')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.timeEntries30d', 'Pontos 30d')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.lastActivity', 'Ultima atividade')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.healthStatus', 'Health status')}</th>
                      <th className="px-3 py-3">{t('superAdmin.companies.table.createdAt', 'Criada em')}</th>
                      <th className="px-3 py-3 text-right">{t('superAdmin.companies.table.actions', 'Acoes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => {
                      const subscriptionMeta = getSubscriptionStatusMeta(
                        company.subscriptionStatus,
                        company.subscriptionStatusLabel,
                        t,
                      )
                      const healthMeta = getHealthStatusMeta(company.healthStatus, t)

                      return (
                        <tr
                          key={company.id}
                          className="cursor-pointer border-b border-border/80 last:border-b-0 transition hover:bg-muted/30"
                          onClick={() => onOpenCompany?.(company.id)}
                        >
                          <td className="px-3 py-4">
                            <div className="space-y-1">
                              <p className="font-semibold">{company.name || '--'}</p>
                              <p className="text-xs text-muted-foreground">{company.slug || company.email || company.id}</p>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <StatusBadge className={subscriptionMeta.className} label={subscriptionMeta.label} />
                          </td>
                          <td className="px-3 py-4">{company.planName || '--'}</td>
                          <td className="px-3 py-4">
                            {company.planPriceCents === null || company.planPriceCents === undefined
                              ? '--'
                              : formatCurrencyEUR(Number(company.planPriceCents) / 100, i18n.language)}
                          </td>
                          <td className="px-3 py-4">{company.employeesCount}</td>
                          <td className="px-3 py-4">{company.activeEmployees30d}</td>
                          <td className="px-3 py-4">{company.timeEntriesToday}</td>
                          <td className="px-3 py-4">{company.timeEntries30d}</td>
                          <td className="px-3 py-4">
                            {formatSuperAdminDateTime(company.lastActivityAt, i18n.language, company.timezone)}
                          </td>
                          <td className="px-3 py-4">
                            <StatusBadge className={healthMeta.className} label={healthMeta.label} />
                          </td>
                          <td className="px-3 py-4">
                            {formatSuperAdminDate(company.createdAt, i18n.language, company.timezone)}
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-full px-3 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onOpenCompany?.(company.id)
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {t('superAdmin.shared.actions.viewDetails', 'Ver detalhes')}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
                <span>
                  {t('superAdmin.companies.pagination.summary', {
                    defaultValue: 'Pagina {{page}} de {{total}}',
                    page: pagination.currentPage,
                    total: pagination.lastPage,
                  })}
                </span>
                <span>
                  {t('superAdmin.companies.pagination.total', {
                    defaultValue: '{{total}} empresas',
                    total: pagination.total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3 text-xs"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                    }
                    disabled={!pagination.canPrevious || loading}
                  >
                    {t('superAdmin.shared.pagination.previous', 'Anterior')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3 text-xs"
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={!pagination.canNext || loading}
                  >
                    {t('superAdmin.shared.pagination.next', 'Proxima')}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </PageContainer>
  )
}

function SelectFilter({ ariaLabel, value, onChange, options }) {
  return (
    <div className="min-w-[170px] items-center rounded-2xl border border-border bg-muted/70 px-3 py-2 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
      <select
        aria-label={ariaLabel}
        className="w-full bg-transparent text-foreground outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function Info({ label, children }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="text-foreground">{children}</div>
    </div>
  )
}
