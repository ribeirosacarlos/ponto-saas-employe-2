import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  assignEmployeeShift,
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} from '../../services/modules/employees'
import { normalizeArea } from '../../services/modules/areas'
import { listShifts } from '../../services/modules/shifts'

const ROLE_PRIORITY = ['admin', 'manager', 'area_manager', 'employee']

export const normalizeEmployee = (employee = {}, index = 0) => {
  const roleFromRolesArray = (() => {
    if (!Array.isArray(employee.roles) || employee.roles.length === 0) return undefined
    const roleNames = employee.roles
      .map((role) => role?.name || role?.role || role?.role_name || role?.slug || role?.id)
      .filter(Boolean)

    if (roleNames.length === 0) return undefined

    const sortedByPriority = roleNames.sort((a, b) => {
      const aIndex = ROLE_PRIORITY.indexOf(a)
      const bIndex = ROLE_PRIORITY.indexOf(b)

      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    return sortedByPriority[0]
  })()

  const role =
    roleFromRolesArray ||
    employee.role ||
    employee.type ||
    employee.permission ||
    employee.role_name ||
    employee.profile?.role ||
    employee.profile ||
    employee.user_type ||
    'employee'

  const id =
    employee?.id ??
    employee?.uuid ??
    employee?.employee_id ??
    employee?.user_id ??
    employee?.email ??
    `employee-${index}`

  const primaryUserShift = (() => {
    if (!Array.isArray(employee.user_shifts) || employee.user_shifts.length === 0) return null
    // Prefer the most recent active (end_date null) shift; otherwise take the latest by updated_at.
    const active = employee.user_shifts.filter((s) => !s.end_date)
    if (active.length) return active[0]
    return employee.user_shifts[0]
  })()

  const shiftId =
    primaryUserShift?.shift_id ??
    primaryUserShift?.shift?.id ??
    employee?.shift_id ??
    employee?.shiftId ??
    employee?.shift?.id ??
    ''

  const shiftName =
    primaryUserShift?.shift?.name ??
    employee?.shift_name ??
    employee?.shift?.name ??
    employee?.shift?.title ??
    employee?.shiftLabel ??
    employee?.shift_label ??
    ''

  const directArea = employee?.area ? normalizeArea(employee.area, 0) : null
  const areaId =
    employee?.area_id ??
    employee?.areaId ??
    directArea?.id ??
    employee?.department_id ??
    ''

  const areaName =
    directArea?.name ??
    employee?.area_name ??
    employee?.areaName ??
    employee?.department_name ??
    ''

  const managedAreaItemsSource =
    employee?.managed_areas ??
    employee?.managedAreas ??
    employee?.areas_managed ??
    employee?.areasManaged ??
    []

  const managedAreas = Array.isArray(managedAreaItemsSource)
    ? managedAreaItemsSource
        .map((area, areaIndex) => {
          if (area && typeof area === 'object') return normalizeArea(area, areaIndex)
          if (area === null || area === undefined || area === '') return null
          return normalizeArea({ id: area }, areaIndex)
        })
        .filter(Boolean)
    : []

  const managedAreaIdsSource =
    employee?.managed_area_ids ??
    employee?.managedAreaIds ??
    employee?.managed_areas_ids ??
    employee?.managedAreasIds

  const managed_area_ids = Array.from(
    new Set(
      (
        Array.isArray(managedAreaIdsSource)
          ? managedAreaIdsSource
          : managedAreas.map((area) => area.id)
      ).filter((value) => value !== null && value !== undefined && value !== ''),
    ),
  )

  return {
    ...employee,
    id,
    name: employee?.name ?? employee?.full_name ?? employee?.fullName ?? employee?.profile?.name ?? '',
    email: employee?.email ?? employee?.profile?.email ?? employee?.user?.email ?? '',
    role,
    createdAt:
      employee?.created_at ??
      employee?.createdAt ??
      employee?.created ??
      employee?.inserted_at ??
      '',
    shift_id: shiftId,
    shift_name: shiftName,
    shiftId,
    shiftName,
    area_id: areaId,
    area_name: areaName,
    areaId,
    areaName,
    managed_area_ids,
    managedAreaIds: managed_area_ids,
    managed_areas: managedAreas,
    managedAreas,
  }
}

export const normalizeShift = (shift = {}, index = 0) => ({
  id: shift?.id ?? shift?.uuid ?? shift?.shift_id ?? shift?.code ?? `shift-${index}`,
  name: shift?.name ?? shift?.title ?? shift?.label ?? '',
  start_time: shift?.start_time ?? shift?.startTime ?? shift?.start ?? null,
  end_time: shift?.end_time ?? shift?.endTime ?? shift?.end ?? null,
  is_flexible: shift?.is_flexible ?? shift?.flexible ?? false,
})

export function useEmployeesManagement({
  t,
  enabled = true,
  onListError,
  onShiftsError,
} = {}) {
  const [filters, setFilters] = useState({ search: '', role: 'all' })
  const [page, setPage] = useState(1)
  const [employees, setEmployees] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shifts, setShifts] = useState([])
  const [shiftsLoading, setShiftsLoading] = useState(false)
  const [mutationLoading, setMutationLoading] = useState({
    create: false,
    edit: false,
    delete: false,
    shift: false,
  })

  const fallbackShifts = useMemo(
    () => [
      { id: 'shift-morning', name: t?.('employeesPage.shifts.morning') || 'Morning' },
      { id: 'shift-evening', name: t?.('employeesPage.shifts.evening') || 'Evening' },
      { id: 'shift-overnight', name: t?.('employeesPage.shifts.overnight') || 'Overnight' },
    ],
    [t],
  )

  const loadEmployees = useCallback(
    async (targetPage = 1, currentFilters = {}) => {
      if (!enabled) return { ok: false }
      setLoading(true)
      setError('')
      try {
        const response = await listEmployees(targetPage, currentFilters)
        setEmployees((response.data || []).map((item, index) => normalizeEmployee(item, index)))
        setMeta(response.meta || null)
        return { ok: true }
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t?.('equipoPage.states.errorDescription') ||
          'Unable to load employees.'
        setError(message)
        onListError?.(message, err)
        return { ok: false, error: err }
      } finally {
        setLoading(false)
      }
    },
    [enabled, onListError, t],
  )

  const loadShifts = useCallback(async () => {
    if (!enabled) return { ok: false }
    setShiftsLoading(true)
    try {
      const response = await listShifts()
      const shiftList = Array.isArray(response)
        ? response
        : response?.data || response?.shifts || []

      if (Array.isArray(shiftList) && shiftList.length > 0) {
        setShifts(
          shiftList.map((shift, index) => {
            const normalized = normalizeShift(shift, index)
            return {
              id: normalized.id,
              name: normalized.name || `Shift ${normalized.id}`,
              start_time: normalized.start_time,
              end_time: normalized.end_time,
              is_flexible: normalized.is_flexible,
            }
          }),
        )
      } else {
        setShifts(fallbackShifts)
      }
      return { ok: true }
    } catch (err) {
      setShifts(fallbackShifts)
      onShiftsError?.(err)
      return { ok: false, error: err }
    } finally {
      setShiftsLoading(false)
    }
  }, [enabled, fallbackShifts, onShiftsError])

  const ensureShifts = useCallback(async () => {
    if (!enabled || shiftsLoading || shifts.length) return { ok: false }
    return loadShifts()
  }, [enabled, loadShifts, shifts.length, shiftsLoading])

  useEffect(() => {
    if (!enabled) return
    loadEmployees(1, filters)
    setPage(1)
  }, [enabled, filters, loadEmployees])

  useEffect(() => {
    if (!enabled || page === 1) return
    loadEmployees(page, filters)
  }, [enabled, filters, loadEmployees, page])

  const filteredByRole = useMemo(() => {
    if (filters.role === 'all') return employees
    return employees
      .filter((employee) => employee.role === filters.role)
      .sort(
        (a, b) =>
          ROLE_PRIORITY.indexOf(a.role || 'employee') - ROLE_PRIORITY.indexOf(b.role || 'employee'),
      )
  }, [employees, filters.role])

  const filteredEmployees = useMemo(() => {
    if (!filters.search) return filteredByRole
    const query = filters.search.toLowerCase()
    return filteredByRole.filter((employee) => {
      const candidate = `${employee.name || ''} ${employee.email || ''}`.toLowerCase()
      return candidate.includes(query)
    })
  }, [filteredByRole, filters.search])

  const totalPages = useMemo(() => {
    if (meta?.lastPage) return meta.lastPage
    if (meta?.perPage && meta?.total) {
      return Math.max(1, Math.ceil(meta.total / meta.perPage))
    }
    return Math.max(1, page)
  }, [meta?.lastPage, meta?.perPage, meta?.total, page])

  const canGoNext = useMemo(() => {
    if (meta?.next_page_url || meta?.has_more) return true
    return page < totalPages
  }, [meta, page, totalPages])

  const refreshEmployees = useCallback(
    async (targetPage = page) => {
      if (!enabled) return { ok: false }
      return loadEmployees(targetPage, filters)
    },
    [enabled, filters, loadEmployees, page],
  )

  const runMutation = useCallback(async (key, handler) => {
    setMutationLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const result = await handler()
      return { ok: true, result }
    } catch (err) {
      return { ok: false, error: err }
    } finally {
      setMutationLoading((prev) => ({ ...prev, [key]: false }))
    }
  }, [])

  const createEmployeeEntry = useCallback(
    (payload) => runMutation('create', () => createEmployee(payload)),
    [runMutation],
  )

  const updateEmployeeEntry = useCallback(
    (id, payload) => runMutation('edit', () => updateEmployee(id, payload)),
    [runMutation],
  )

  const deleteEmployeeEntry = useCallback(
    (id) => runMutation('delete', () => deleteEmployee(id)),
    [runMutation],
  )

  const assignShiftEntry = useCallback(
    (id, payload) => runMutation('shift', () => assignEmployeeShift(id, payload)),
    [runMutation],
  )

  return {
    employees,
    filteredEmployees,
    filters,
    setFilters,
    page,
    setPage,
    meta,
    loading,
    error,
    shifts,
    shiftsLoading,
    mutationLoading,
    totalPages,
    canGoNext,
    refreshEmployees,
    ensureShifts,
    createEmployeeEntry,
    updateEmployeeEntry,
    deleteEmployeeEntry,
    assignShiftEntry,
  }
}
