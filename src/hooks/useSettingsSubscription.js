import { useCallback, useEffect, useState } from 'react'
import {
  cancelSettingsSubscription,
  getSettingsSubscription,
} from '../services/settings/subscriptionManagement'

export function useSettingsSubscription(enabled = true) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return null
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await getSettingsSubscription()
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

  const cancel = useCallback(async () => {
    setIsCancelling(true)
    setError('')

    try {
      const response = await cancelSettingsSubscription()

      if (response) {
        setData(response)
        return response
      }

      return await load()
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || ''
      setError(message)
      throw err
    } finally {
      setIsCancelling(false)
    }
  }, [load])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  return {
    data,
    isLoading,
    isCancelling,
    error,
    reload: load,
    cancel,
    setData,
    setError,
  }
}
