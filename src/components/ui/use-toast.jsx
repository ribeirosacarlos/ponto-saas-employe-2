import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ToastContext = createContext({
  toast: () => {},
  dismiss: () => {},
  toasts: [],
})

const DEFAULT_DURATION = 4000
const VARIANT_DURATION = {
  error: 6000,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())
  const removalTimersRef = useRef(new Map())

  const clearTimers = useCallback((id) => {
    const timeout = timersRef.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timersRef.current.delete(id)
    }
    const removalTimeout = removalTimersRef.current.get(id)
    if (removalTimeout) {
      clearTimeout(removalTimeout)
      removalTimersRef.current.delete(id)
    }
  }, [])

  const dismiss = useCallback((id) => {
    if (!id) return
    clearTimers(id)
    setToasts((current) => {
      const exists = current.some((toast) => toast.id === id)
      if (!exists) return current
      return current.map((toast) => (toast.id === id ? { ...toast, state: 'closing' } : toast))
    })
    if (!removalTimersRef.current.has(id)) {
      const removalTimeout = setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
        removalTimersRef.current.delete(id)
      }, 220)
      removalTimersRef.current.set(id, removalTimeout)
    }
  }, [clearTimers])

  const toast = useCallback(
    ({ title, description, variant = 'default', duration }) => {
      const id = crypto.randomUUID()
      const normalizedVariant = variant === 'info' ? 'default' : variant
      const effectiveDuration =
        typeof duration === 'number' ? duration : VARIANT_DURATION[normalizedVariant] || DEFAULT_DURATION

      setToasts((current) => [
        ...current,
        { id, title, description, variant: normalizedVariant, duration: effectiveDuration, state: 'open' },
      ])

      if (effectiveDuration) {
        const timeout = setTimeout(() => dismiss(id), effectiveDuration)
        timersRef.current.set(id, timeout)
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss, toasts }), [toast, dismiss, toasts])

  useEffect(
    () => () => {
      timersRef.current.forEach((timeout) => clearTimeout(timeout))
      removalTimersRef.current.forEach((timeout) => clearTimeout(timeout))
      timersRef.current.clear()
      removalTimersRef.current.clear()
    },
    [],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
