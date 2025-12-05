import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext({
  toast: () => {},
  dismiss: () => {},
  toasts: [],
})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 3800 }) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, title, description, variant }])
      if (duration) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss, toasts }), [toast, dismiss, toasts])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
