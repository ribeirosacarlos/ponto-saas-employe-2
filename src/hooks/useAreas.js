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
      const allItems = []
      let page = 1
      let lastPage = 1
      do {
        const response = await listAreas({ page, perPage: 100 })
        allItems.push(...(Array.isArray(response?.data) ? response.data : []))
        lastPage = response?.meta?.lastPage ?? 1
        page += 1
      } while (page <= lastPage)
      setAreas(allItems)
      return { ok: true, data: allItems }
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
