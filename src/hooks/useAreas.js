import { useCallback, useEffect, useRef, useState } from 'react'
import { listAreas } from '../services/modules/areas'

export function useAreas({ enabled = true, autoLoad = true, onError } = {}) {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const reload = useCallback(async () => {
    if (!enabled) return { ok: false }

    setLoading(true)
    setError('')
    try {
      const response = await listAreas()
      setAreas(Array.isArray(response?.data) ? response.data : [])
      return { ok: true, data: response?.data ?? [] }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load areas.'
      setError(message)
      onErrorRef.current?.(message, err)
      return { ok: false, error: err }
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !autoLoad) return
    reload()
  }, [autoLoad, enabled, reload])

  return {
    areas,
    loading,
    error,
    reload,
  }
}
