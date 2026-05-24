import { useCallback, useEffect, useState } from 'react'
import { fetchCompanyLocale, updateCompanyLocale } from '../services/companyLocaleService'

export function useCompanyLocale(enabled = true) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return null
    }
    setIsLoading(true)
    setError('')
    try {
      const response = await fetchCompanyLocale()
      setData(response)
      return response
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || '')
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  const save = useCallback(async (payload) => {
    setIsSaving(true)
    setError('')
    try {
      const response = await updateCompanyLocale(payload)
      setData(response)
      return response
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || ''
      setError(message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

  return { data, isLoading, isSaving, error, reload: load, save, setData }
}
