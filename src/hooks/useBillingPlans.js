import { useCallback, useEffect, useMemo, useState } from 'react'
import { listActivePlans, normalizePlanInterval } from '../services/billingService'

const STORAGE_KEY_INTERVAL = 'billing:selected_interval'
const STORAGE_KEY_PLAN = 'billing:last_selected_plan_payload'
const STORAGE_KEY_REASON = 'billing:reason'

const DEFAULT_INTERVAL = 'monthly'
const INTERVAL_MAP = {
  monthly: 'month',
  yearly: 'year',
}

export function useBillingPlans({ reason } = {}) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedInterval, setSelectedInterval] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_INTERVAL
    return window.sessionStorage.getItem(STORAGE_KEY_INTERVAL) || DEFAULT_INTERVAL
  })

  const saveInterval = useCallback((value) => {
    setSelectedInterval(value)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY_INTERVAL, value)
    }
  }, [])

  const persistPlanSelection = useCallback((plan) => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(plan || null))
    } catch (err) {
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && reason) {
      window.sessionStorage.setItem(STORAGE_KEY_REASON, reason)
    }
  }, [reason])

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listActivePlans()
      setPlans(data || [])
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Erro ao carregar planos.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const filteredPlans = useMemo(() => {
    const target = INTERVAL_MAP[selectedInterval] || INTERVAL_MAP[DEFAULT_INTERVAL]
    return (plans || []).filter((plan) => normalizePlanInterval(plan) === target)
  }, [plans, selectedInterval])

  const featuredPlanId = useMemo(() => {
    const basic = filteredPlans.find((plan) => (plan.slug || '').toLowerCase().includes('basic'))
    if (basic) return basic.id
    const pro = filteredPlans.find((plan) => (plan.slug || '').toLowerCase().includes('pro'))
    if (pro) return pro.id
    return filteredPlans[0]?.id
  }, [filteredPlans])

  return {
    plans: filteredPlans,
    loading,
    error,
    selectedInterval,
    setSelectedInterval: saveInterval,
    refetch: fetchPlans,
    featuredPlanId,
    persistPlanSelection,
  }
}

export function restoreLastPlanSelection() {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY_PLAN)
    return stored ? JSON.parse(stored) : null
  } catch (err) {
    return null
  }
}

export function restoreLastReason() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(STORAGE_KEY_REASON) || ''
}
