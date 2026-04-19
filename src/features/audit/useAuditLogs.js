import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAuditLogs } from '../../services/auditLogsService'
import { AUDIT_PER_PAGE_OPTIONS } from './utils'

const DEFAULT_FILTERS = {
  search: '',
  action: '',
  entity_type: '',
  entity_id: '',
  user_id: '',
  performed_by_role: '',
  date_from: '',
  date_to: '',
  company_id: '',
  target_company_id: '',
  per_page: AUDIT_PER_PAGE_OPTIONS[1],
  page: 1,
}

const NUMBER_KEYS = new Set(['page', 'per_page'])
const SUPER_ADMIN_ONLY_KEYS = new Set(['company_id', 'target_company_id'])

const readFiltersFromUrl = (scope) => {
  if (typeof window === 'undefined') return DEFAULT_FILTERS

  const params = new URLSearchParams(window.location.search)
  const next = { ...DEFAULT_FILTERS }

  Object.keys(DEFAULT_FILTERS).forEach((key) => {
    const raw = params.get(key)
    if (raw === null) return
    next[key] = NUMBER_KEYS.has(key) ? Number(raw) || DEFAULT_FILTERS[key] : raw
  })

  if (scope !== 'platform') {
    SUPER_ADMIN_ONLY_KEYS.forEach((key) => {
      next[key] = ''
    })
  }

  return next
}

const writeFiltersToUrl = (scope, filters) => {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (scope !== 'platform' && SUPER_ADMIN_ONLY_KEYS.has(key)) return
    if (value === undefined || value === null || value === '') return
    if (key === 'page' && Number(value) === 1) return
    if (key === 'per_page' && Number(value) === DEFAULT_FILTERS.per_page) return
    params.set(key, String(value))
  })

  const nextSearch = params.toString()
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`
  window.history.replaceState(window.history.state, '', nextUrl)
}

export function useAuditLogs({ scope = 'admin' } = {}) {
  const [filters, setFilters] = useState(() => readFiltersFromUrl(scope))
  const [appliedFilters, setAppliedFilters] = useState(() => readFiltersFromUrl(scope))
  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState(null)
  const [links, setLinks] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadLogs = useCallback(
    async (overrideFilters = appliedFilters) => {
      setLoading(true)
      setError('')

      try {
        const response = await listAuditLogs(scope, overrideFilters)
        setLogs(response?.data || [])
        setMeta(response?.meta || null)
        setLinks(response?.links || {})
      } catch (requestError) {
        setLogs([])
        setMeta(null)
        setLinks({})
        setError(
          requestError?.response?.data?.message ||
            requestError?.userFriendlyMessage ||
            requestError?.message ||
            'Nao foi possivel carregar os logs de auditoria.',
        )
      } finally {
        setLoading(false)
      }
    },
    [appliedFilters, scope],
  )

  useEffect(() => {
    writeFiltersToUrl(scope, filters)
  }, [filters, scope])

  useEffect(() => {
    loadLogs(appliedFilters)
  }, [appliedFilters, loadLogs])

  const updateFilters = useCallback((updater) => {
    setFilters((current) => {
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      return next
    })
  }, [])

  const applyFilters = useCallback(() => {
    setAppliedFilters((current) => ({ ...current, ...filters, page: 1 }))
    setFilters((current) => ({ ...current, page: 1 }))
  }, [filters])

  const resetFilters = useCallback(() => {
    const next = {
      ...DEFAULT_FILTERS,
      per_page: filters?.per_page || DEFAULT_FILTERS.per_page,
    }
    if (scope !== 'platform') {
      next.company_id = ''
      next.target_company_id = ''
    }
    setFilters(next)
    setAppliedFilters(next)
  }, [filters?.per_page, scope])

  const setPage = useCallback(
    (page) => {
      const nextPage = Math.max(1, Number(page) || 1)
      setFilters((current) => ({ ...current, page: nextPage }))
      setAppliedFilters((current) => ({ ...current, page: nextPage }))
    },
    [],
  )

  const setPerPage = useCallback((perPage) => {
    const nextPerPage = Number(perPage) || DEFAULT_FILTERS.per_page
    setFilters((current) => ({ ...current, per_page: nextPerPage, page: 1 }))
    setAppliedFilters((current) => ({ ...current, per_page: nextPerPage, page: 1 }))
  }, [])

  const pagination = useMemo(
    () => {
      const currentPage = meta?.currentPage ?? appliedFilters.page
      const lastPage = meta?.lastPage ?? 1

      return {
        currentPage,
        lastPage,
        perPage: meta?.perPage ?? appliedFilters.per_page,
        total: meta?.total ?? 0,
        canPrevious: currentPage > 1,
        canNext: currentPage < lastPage,
        from: meta?.from ?? null,
        to: meta?.to ?? null,
      }
    },
    [appliedFilters.page, appliedFilters.per_page, meta],
  )

  return {
    filters,
    appliedFilters,
    logs,
    meta,
    loading,
    error,
    pagination,
    setFilters: updateFilters,
    applyFilters,
    resetFilters,
    setPage,
    setPerPage,
    reload: () => loadLogs(appliedFilters),
  }
}
