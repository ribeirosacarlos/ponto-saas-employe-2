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
  lastDeniedContext: null,
  setAccessDenied: () => {},
  clearAccessDenied: () => {},
})

export function AccessProvider({ children }) {
  const [accessDeniedReason, setAccessDeniedReason] = useState(null)
  const [lastDeniedMessage, setLastDeniedMessage] = useState('')
  const [lastDeniedContext, setLastDeniedContext] = useState(null)

  const setAccessDenied = useCallback((payload = {}) => {
    const { reason, message, routePath, requestUrl, requestMethod, page, title } = payload
    setAccessDeniedReason(reason || ACCESS_DENIED_REASONS.FORBIDDEN)
    setLastDeniedMessage(message || '')
    setLastDeniedContext({
      routePath: routePath || '',
      requestUrl: requestUrl || '',
      requestMethod: requestMethod || '',
      page: page || '',
      title: title || '',
    })
  }, [])

  const clearAccessDenied = useCallback(() => {
    setAccessDeniedReason(null)
    setLastDeniedMessage('')
    setLastDeniedContext(null)
  }, [])

  useEffect(() => {
    registerAccessHandlers({ setAccessDenied, clearAccessDenied })
    return () => registerAccessHandlers({ setAccessDenied: null, clearAccessDenied: null })
  }, [clearAccessDenied, setAccessDenied])

  const value = useMemo(
    () => ({
      accessDeniedReason,
      lastDeniedMessage,
      lastDeniedContext,
      setAccessDenied,
      clearAccessDenied,
    }),
    [accessDeniedReason, clearAccessDenied, lastDeniedContext, lastDeniedMessage, setAccessDenied],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export function useAccess() {
  return useContext(AccessContext)
}

export { emitAccessDenied, emitAccessClear }
