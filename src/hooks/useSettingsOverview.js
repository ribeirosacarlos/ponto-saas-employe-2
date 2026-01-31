import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/ui/use-toast'
import { getSettingsOverview } from '../services/settings/getSettingsOverview'
import { useAuthStore } from '../store/useAuth'

export function useSettingsOverview() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const logout = useAuthStore((state) => state.logout)

  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getSettingsOverview()
      setData(response)
    } catch (err) {
      const status = err?.response?.status
      const message =
        err?.response?.data?.message ||
        err?.userFriendlyMessage ||
        err?.message ||
        t('settingsPage.errors.load', 'Não foi possível carregar as configurações.')
      setError(message)

      if (status === 401) {
        toast({
          title: t('toast.sessionExpired.title'),
          description: err?.response?.data?.message || t('toast.sessionExpired.description'),
          variant: 'error',
        })
        await logout()
      } else if (status === 403) {
        const fallbackData = err?.response?.data?.data ?? err?.response?.data ?? null
        if (fallbackData) {
          setData(fallbackData)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [logout, t, toast])

  useEffect(() => {
    load()
  }, [load])

  return { data, isLoading, error, reload: load }
}
