import { useCallback, useEffect, useMemo, useState } from 'react'
import { listSuperAdminCompanies } from '../../services/superAdminService'
import { resolveSuperAdminError } from './utils'

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  activity: 'all',
  sort: '-last_activity_at',
  perPage: 20,
  page: 1,
}

export function useSuperAdminCompanies({ enabled = true, t } = {}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [companies, setCompanies] = useState([])
  const [meta, setMeta] = useState(null)
  const [links, setLinks] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadCompanies = useCallback(
    async (overrides = {}) => {
      if (!enabled) return { ok: false }

      const nextFilters = { ...filters, ...overrides }
      setLoading(true)
      setError('')

      try {
        const response = await listSuperAdminCompanies({
          search: nextFilters.search || undefined,
          status: nextFilters.status === 'all' ? undefined : nextFilters.status,
          activity: nextFilters.activity === 'all' ? undefined : nextFilters.activity,
          sort: nextFilters.sort,
          per_page: nextFilters.perPage,
          page: nextFilters.page,
        })
        setCompanies(response.data || [])
        setMeta(response.meta || null)
        setLinks(response.links || {})
        return { ok: true, data: response.data }
      } catch (err) {
        const message = resolveSuperAdminError(
          err,
          t,
          t?.('superAdmin.companies.states.errorDescription', 'Nao foi possivel carregar as empresas.'),
        )
        setCompanies([])
        setMeta(null)
        setLinks({})
        setError(message)
        return { ok: false, error: err }
      } finally {
        setLoading(false)
      }
    },
    [enabled, filters, t],
  )

  useEffect(() => {
    if (!enabled) return
    loadCompanies()
  }, [enabled, loadCompanies])

  const pagination = useMemo(
    () => ({
      currentPage: meta?.currentPage || filters.page,
      lastPage: meta?.lastPage || 1,
      perPage: meta?.perPage || filters.perPage,
      total: meta?.total || 0,
      canPrevious: Boolean(links?.prev) && (meta?.currentPage || filters.page) > 1,
      canNext:
        Boolean(links?.next) &&
        (meta?.lastPage ? (meta?.currentPage || filters.page) < meta.lastPage : true),
    }),
    [filters.page, filters.perPage, links, meta],
  )

  const updateFilters = useCallback((updater) => {
    setFilters((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      return next
    })
  }, [])

  return {
    companies,
    meta,
    links,
    loading,
    error,
    filters,
    setFilters: updateFilters,
    pagination,
    refreshCompanies: loadCompanies,
  }
}
