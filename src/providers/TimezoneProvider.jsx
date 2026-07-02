import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuth'
import { useTimezoneStore } from '../store/useTimezone'

export function TimezoneProvider({ children }) {
  const token = useAuthStore((state) => state.token)
  const roles = useAuthStore((state) => state.roles)
  const loadTimezone = useTimezoneStore((state) => state.loadTimezone)
  const resetTimezone = useTimezoneStore((state) => state.resetTimezone)

  useEffect(() => {
    if (!token) {
      resetTimezone()
      return
    }

    const isAffiliateSession =
      Array.isArray(roles) && roles.some((role) => String(role).toLowerCase() === 'affiliate')

    if (isAffiliateSession) {
      resetTimezone()
      return
    }

    loadTimezone()
  }, [loadTimezone, resetTimezone, roles, token])

  return children
}
