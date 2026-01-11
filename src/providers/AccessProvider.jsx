import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  ACCESS_DENIED_REASONS,
  emitAccessClear,
  emitAccessDenied,
  registerAccessHandlers,
} from '../lib/accessDenied'

const AccessContext = createContext({
  accessDeniedReason: null,
  lastDeniedMessage: '',
  setAccessDenied: () => {},
  clearAccessDenied: () => {},
})

export function AccessProvider({ children }) {
  const [accessDeniedReason, setAccessDeniedReason] = useState(null)
  const [lastDeniedMessage, setLastDeniedMessage] = useState('')

  const setAccessDenied = useCallback(({ reason, message } = {}) => {
    setAccessDeniedReason(reason || ACCESS_DENIED_REASONS.FORBIDDEN)
    setLastDeniedMessage(message || '')
  }, [])

  const clearAccessDenied = useCallback(() => {
    setAccessDeniedReason(null)
    setLastDeniedMessage('')
  }, [])

  useEffect(() => {
    registerAccessHandlers({ setAccessDenied, clearAccessDenied })
    return () => registerAccessHandlers({ setAccessDenied: null, clearAccessDenied: null })
  }, [clearAccessDenied, setAccessDenied])

  const value = useMemo(
    () => ({
      accessDeniedReason,
      lastDeniedMessage,
      setAccessDenied,
      clearAccessDenied,
    }),
    [accessDeniedReason, clearAccessDenied, lastDeniedMessage, setAccessDenied],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export function useAccess() {
  return useContext(AccessContext)
}

export { emitAccessDenied, emitAccessClear }
