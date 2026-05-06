import { useCallback, useEffect, useState } from 'react'
import { listEmployeeAdjustments } from '../services/modules/employee'

export function useEmployeeAdjustments({ status = 'all', page = 1, enabled = true } = {}) {
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 15 })

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError('')
    try {
      const apiStatus = status === 'all' ? undefined : status
      const response = await listEmployeeAdjustments({ status: apiStatus, page })
      setAdjustments(response.data ?? [])
      setMeta(response.meta ?? { currentPage: page, lastPage: 1, total: 0, perPage: 15 })
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Erro ao carregar ajustes.'
      setError(message)
      setAdjustments([])
    } finally {
      setLoading(false)
    }
  }, [enabled, status, page])

  useEffect(() => {
    if (!enabled) return
    reload()
  }, [enabled, reload])

  return { adjustments, loading, error, meta, reload }
}
