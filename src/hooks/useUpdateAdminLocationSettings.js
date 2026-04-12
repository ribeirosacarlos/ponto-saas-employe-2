import { useCallback, useState } from 'react'
import { updateAdminLocationSettings } from '../services/adminLocationSettingsService'

export function useUpdateAdminLocationSettings() {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const save = useCallback(async (payload) => {
    setIsSaving(true)
    setError('')

    try {
      return await updateAdminLocationSettings(payload)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || ''
      setError(message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

  return { save, isSaving, error, setError }
}
