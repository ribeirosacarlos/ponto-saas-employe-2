import { useCallback, useEffect, useState } from 'react'
import { fetchPlatformCompanySettings } from '../services/platformCompanySettingsService'

export function usePlatformCompanySettings(companyId, enabled = true) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!enabled || !companyId) {
      setIsLoading(false)
      return null
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchPlatformCompanySettings(companyId)
      setData(response)
      return response
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || ''
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [companyId, enabled])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  return { data, isLoading, error, reload: load, setData }
}
