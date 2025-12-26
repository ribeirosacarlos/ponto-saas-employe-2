import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  blockCompany,
  createCompany,
  deleteCompany,
  listCompanies,
  registerCompany,
  restoreCompany,
  unblockCompany,
  updateCompany,
} from '../../services/platformCompaniesService'

export function useCompanies({ enabled = true } = {}) {
  const [companies, setCompanies] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', status: 'all' })
  const [mutationLoading, setMutationLoading] = useState({
    create: false,
    register: false,
    update: false,
    delete: false,
    restore: false,
    block: false,
    unblock: false,
  })

  const loadCompanies = useCallback(async () => {
    if (!enabled) return { ok: false }
    setLoading(true)
    setError('')
    try {
      const response = await listCompanies()
      setCompanies(response?.data || [])
      setMeta(response?.meta || null)
      return { ok: true }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Unable to load companies.'
      setError(message)
      return { ok: false, error: err }
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    loadCompanies()
  }, [enabled, loadCompanies])

  const filteredCompanies = useMemo(() => {
    let result = companies

    if (filters.status && filters.status !== 'all') {
      result = result.filter((company) => company.status === filters.status)
    }

    if (!filters.search) return result
    const query = filters.search.toLowerCase()
    return result.filter((company) => {
      const haystack = `${company.name || ''} ${company.domain || ''} ${company.id || ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [companies, filters.search, filters.status])

  const refreshCompanies = useCallback(async () => loadCompanies(), [loadCompanies])

  const runMutation = useCallback(async (key, handler) => {
    setMutationLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const result = await handler()
      return { ok: true, result }
    } catch (err) {
      return { ok: false, error: err }
    } finally {
      setMutationLoading((prev) => ({ ...prev, [key]: false }))
    }
  }, [])

  const createCompanyEntry = useCallback(
    (payload) => runMutation('create', () => createCompany(payload)),
    [runMutation],
  )

  const registerCompanyEntry = useCallback(
    (payload) => runMutation('register', () => registerCompany(payload)),
    [runMutation],
  )

  const updateCompanyEntry = useCallback(
    (id, payload) => runMutation('update', () => updateCompany(id, payload)),
    [runMutation],
  )

  const deleteCompanyEntry = useCallback(
    (id) => runMutation('delete', () => deleteCompany(id)),
    [runMutation],
  )

  const restoreCompanyEntry = useCallback(
    (id) => runMutation('restore', () => restoreCompany(id)),
    [runMutation],
  )

  const blockCompanyEntry = useCallback(
    (id) => runMutation('block', () => blockCompany(id)),
    [runMutation],
  )

  const unblockCompanyEntry = useCallback(
    (id) => runMutation('unblock', () => unblockCompany(id)),
    [runMutation],
  )

  return {
    companies,
    meta,
    loading,
    error,
    filters,
    setFilters,
    filteredCompanies,
    mutationLoading,
    refreshCompanies,
    createCompanyEntry,
    registerCompanyEntry,
    updateCompanyEntry,
    deleteCompanyEntry,
    restoreCompanyEntry,
    blockCompanyEntry,
    unblockCompanyEntry,
  }
}
