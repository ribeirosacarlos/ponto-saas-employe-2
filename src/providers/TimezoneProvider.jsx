import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuth'
import { useTimezoneStore } from '../store/useTimezone'

export function TimezoneProvider({ children }) {
  const token = useAuthStore((state) => state.token)
  const loadTimezone = useTimezoneStore((state) => state.loadTimezone)
  const resetTimezone = useTimezoneStore((state) => state.resetTimezone)

  useEffect(() => {
    if (!token) {
      resetTimezone()
      return
    }
    loadTimezone()
  }, [loadTimezone, resetTimezone, token])

  return children
}
