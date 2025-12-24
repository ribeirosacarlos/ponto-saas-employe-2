import { useCallback, useEffect, useState } from 'react'
import { format, subMonths } from 'date-fns'
import { listEmployees } from '../../lib/api'
import { normalizeEmployee } from '../employees/useEmployeesManagement'
import { listAbsencesByUser } from '../../services/absencesService'
import {
  getAdminVacationSummary,
  listAdminVacationsByUser,
  listPendingAdminVacations,
} from '../../services/adminVacationsService'

const buildBalanceState = (data = null, error = '') => ({
  data,
  error,
  loading: false,
})

export function useAdminVacations({ enabled = true } = {}) {
  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [employeesError, setEmployeesError] = useState('')

  const [pendingRequests, setPendingRequests] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError, setPendingError] = useState('')

  const [balancesByUserId, setBalancesByUserId] = useState({})
  const [balancesLoading, setBalancesLoading] = useState(false)

  const [absencesByUserId, setAbsencesByUserId] = useState({})
  const [vacationsByUserId, setVacationsByUserId] = useState({})

  const loadEmployees = useCallback(async () => {
    if (!enabled) return []
    setEmployeesLoading(true)
    setEmployeesError('')
    try {
      const response = await listEmployees(1)
      const normalized = (response.data || []).map((item, index) => normalizeEmployee(item, index))
      setEmployees(normalized)
      return normalized
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Unable to load employees.'
      setEmployeesError(message)
      setEmployees([])
      return []
    } finally {
      setEmployeesLoading(false)
    }
  }, [enabled])

  const loadPendingRequests = useCallback(async () => {
    if (!enabled) return []
    setPendingLoading(true)
    setPendingError('')
    try {
      const response = await listPendingAdminVacations({ page: 1 })
      setPendingRequests(response.data || [])
      return response.data || []
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Unable to load pending vacations.'
      setPendingError(message)
      setPendingRequests([])
      return []
    } finally {
      setPendingLoading(false)
    }
  }, [enabled])

  const loadBalances = useCallback(async (employeeList = []) => {
    if (!enabled) return
    if (!employeeList || employeeList.length === 0) {
      setBalancesByUserId({})
      return
    }
    setBalancesLoading(true)
    const entries = await Promise.all(
      employeeList.map(async (employee) => {
        if (!employee?.id) return [employee?.id, buildBalanceState(null, '')]
        try {
          const data = await getAdminVacationSummary(employee.id)
          return [employee.id, buildBalanceState(data || null, '')]
        } catch (err) {
          const message =
            err?.response?.data?.message || err?.message || 'Unable to load balance.'
          return [employee.id, buildBalanceState(null, message)]
        }
      }),
    )
    setBalancesByUserId(Object.fromEntries(entries))
    setBalancesLoading(false)
  }, [enabled])

  const loadAbsences = useCallback(async (employeeList = []) => {
    if (!enabled) return
    if (!employeeList || employeeList.length === 0) {
      setAbsencesByUserId({})
      return
    }
    const today = new Date()
    const from = format(subMonths(today, 3), 'yyyy-MM-dd')
    const to = format(today, 'yyyy-MM-dd')
    const entries = await Promise.all(
      employeeList.map(async (employee) => {
        if (!employee?.id) return [employee?.id, []]
        const response = await listAbsencesByUser({ userId: employee.id, from, to, page: 1 })
        return [employee.id, response.data || []]
      }),
    )
    setAbsencesByUserId(Object.fromEntries(entries))
  }, [enabled])

  const loadVacations = useCallback(async (employeeList = []) => {
    if (!enabled) return
    if (!employeeList || employeeList.length === 0) {
      setVacationsByUserId({})
      return
    }
    const entries = await Promise.all(
      employeeList.map(async (employee) => {
        if (!employee?.id) return [employee?.id, []]
        try {
          const response = await listAdminVacationsByUser({ userId: employee.id, page: 1 })
          return [employee.id, response.data || []]
        } catch (err) {
          return [employee.id, []]
        }
      }),
    )
    setVacationsByUserId(Object.fromEntries(entries))
  }, [enabled])

  const refreshBalanceForUser = useCallback(async (userId) => {
    if (!enabled || !userId) return
    setBalancesByUserId((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || buildBalanceState()), loading: true },
    }))
    try {
      const data = await getAdminVacationSummary(userId)
      setBalancesByUserId((prev) => ({
        ...prev,
        [userId]: buildBalanceState(data || null, ''),
      }))
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Unable to load balance.'
      setBalancesByUserId((prev) => ({
        ...prev,
        [userId]: buildBalanceState(null, message),
      }))
    }
  }, [enabled])

  const removePendingRequest = useCallback((requestId) => {
    if (!requestId) return
    setPendingRequests((prev) =>
      (prev || []).filter((request) => String(request.id) !== String(requestId)),
    )
  }, [])

  const addAbsenceForUser = useCallback((userId, absence) => {
    if (!userId || !absence) return
    setAbsencesByUserId((prev) => {
      const current = prev[userId] || []
      return { ...prev, [userId]: [absence, ...current] }
    })
  }, [])

  const refreshAll = useCallback(async () => {
    const employeeList = await loadEmployees()
    await Promise.all([
      loadPendingRequests(),
      loadBalances(employeeList),
      loadAbsences(employeeList),
      loadVacations(employeeList),
    ])
  }, [loadAbsences, loadBalances, loadEmployees, loadPendingRequests, loadVacations])

  useEffect(() => {
    if (!enabled) return
    refreshAll()
  }, [enabled, refreshAll])

  return {
    employees,
    employeesLoading,
    employeesError,
    pendingRequests,
    pendingLoading,
    pendingError,
    balancesByUserId,
    balancesLoading,
    absencesByUserId,
    vacationsByUserId,
    refreshAll,
    refreshBalanceForUser,
    removePendingRequest,
    addAbsenceForUser,
  }
}
