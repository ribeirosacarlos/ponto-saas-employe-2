import { useCallback, useState } from 'react'
import { updateAdminDeviceSettings } from '../services/adminDeviceSettingsService'

export function useUpdateAdminDeviceSettings() {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const save = useCallback(async (payload) => {
    setIsSaving(true)
    setError('')

    try {
      return await updateAdminDeviceSettings(payload)
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
