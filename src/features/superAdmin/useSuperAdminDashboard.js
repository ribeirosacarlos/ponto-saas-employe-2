import { useCallback, useEffect, useState } from 'react'
import { getSuperAdminDashboard } from '../../services/superAdminService'
import { resolveSuperAdminError } from './utils'

export function useSuperAdminDashboard({ enabled = true, t } = {}) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    if (!enabled) return { ok: false }
    setLoading(true)
    setError('')

    try {
      const response = await getSuperAdminDashboard()
      setDashboard(response)
      return { ok: true, data: response }
    } catch (err) {
      const message = resolveSuperAdminError(
        err,
        t,
        t?.('superAdmin.dashboard.states.errorDescription', 'Nao foi possivel carregar o dashboard.'),
      )
      setError(message)
      setDashboard(null)
      return { ok: false, error: err }
    } finally {
      setLoading(false)
    }
  }, [enabled, t])

  useEffect(() => {
    if (!enabled) return
    loadDashboard()
  }, [enabled, loadDashboard])

  return {
    dashboard,
    loading,
    error,
    refreshDashboard: loadDashboard,
  }
}
