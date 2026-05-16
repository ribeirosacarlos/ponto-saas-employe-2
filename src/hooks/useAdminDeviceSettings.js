import { useCallback, useEffect, useState } from 'react'
import { fetchAdminDeviceSettings } from '../services/adminDeviceSettingsService'

export function useAdminDeviceSettings(enabled = true) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return null
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchAdminDeviceSettings()
      setData(response)
      return response
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || ''
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  return { data, isLoading, error, reload: load, setData }
}

