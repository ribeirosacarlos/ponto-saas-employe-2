import { useCallback, useState } from 'react'
import { updatePlatformCompanySettings } from '../services/platformCompanySettingsService'

export function useUpdatePlatformCompanySettings(companyId) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const save = useCallback(
    async (payload) => {
      setIsSaving(true)
      setError('')

      try {
        return await updatePlatformCompanySettings(companyId, payload)
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || ''
        setError(message)
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [companyId],
  )

  return { save, isSaving, error, setError }
}
