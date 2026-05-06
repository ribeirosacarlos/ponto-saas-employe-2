import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import {
  actionMenuItemClass,
  bareFieldInputClass,
  fieldShellClass,
  formControlClass,
} from '../components/ui/form-controls'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { normalizeEmployee, useEmployeesManagement } from '../features/employees/useEmployeesManagement'
import { useAreas } from '../hooks/useAreas'
import { getEmployee } from '../services/modules/employees'
import { useSettingsOverview } from '../hooks/useSettingsOverview'
import { createExtraEmployeesCheckoutSession } from '../services/settings/createExtraEmployeesCheckoutSession'
import { cn } from '../lib/utils'

const MANAGEMENT_REQUIRES = { anyOf: ['area_manager'] }
const ROLE_OPTIONS = ['admin', 'manager', 'area_manager', 'employee']
const MANAGED_AREAS_ROLES = new Set(['manager', 'area_manager'])

const buildCreateForm = () => ({
  name: '',
  email: '',
  role: 'employee',
  area_id: '',
  managed_area_ids: [],
  shift_id: '',
})

const buildEditForm = (employee = {}) => ({
  name: employee.name || '',
  email: employee.email || '',
  role: employee.role || 'employee',
  area_id:
    employee.area_id !== null && employee.area_id !== undefined && employee.area_id !== ''
      ? String(employee.area_id)
      : employee.areaId !== null && employee.areaId !== undefined && employee.areaId !== ''
        ? String(employee.areaId)
        : '',
  managed_area_ids: Array.isArray(employee.managed_area_ids)
    ? employee.managed_area_ids.map((value) => String(value))
    : Array.isArray(employee.managedAreaIds)
      ? employee.managedAreaIds.map((value) => String(value))
      : [],
  shift_id: employee.shift_id ?? employee.shiftId ?? '',
})

const buildAssignForm = (employee = {}) => ({
  shift_id: employee.shift_id ?? employee.shiftId ?? '',
  start_date: new Date().toISOString().slice(0, 10),
})

function EmployeeActionsMenu({
  disabled = false,
  showResendFirstAccessEmail = false,
  resendInviteLoading = false,
  onEdit,
  onAssignShift,
  onResendFirstAccessEmail,
  onDeactivate,
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const estimatedDropdownHeight = showResendFirstAccessEmail ? 180 : 140

      setOpenUpward(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow)
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const runAction = (callback) => {
    if (disabled) return
    callback?.()
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="rounded-2xl"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('equipoPage.actions.openMenu')}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open ? (
        <div
          className={cn(
            'absolute right-0 z-30 w-64 overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-[0_24px_70px_-42px_rgba(92,134,255,0.55)] backdrop-blur-xl',
            openUpward ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]',
          )}
        >
          <button type="button" className={actionMenuItemClass} onClick={() => runAction(onEdit)}>
            <Pencil className="h-4 w-4 text-primary" />
            {t('equipoPage.actions.edit')}
          </button>
          <button
            type="button"
            className={actionMenuItemClass}
            onClick={() => runAction(onAssignShift)}
          >
            <CalendarCheck className="h-4 w-4 text-primary" />
            {t('equipoPage.actions.assignShift')}
          </button>
          {showResendFirstAccessEmail ? (
            <button
              type="button"
              className={cn(
                actionMenuItemClass,
                resendInviteLoading && 'cursor-not-allowed opacity-60',
              )}
              onClick={() => runAction(onResendFirstAccessEmail)}
              disabled={disabled || resendInviteLoading}
            >
              {resendInviteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Mail className="h-4 w-4 text-primary" />
              )}
              {resendInviteLoading
                ? t('equipoPage.actions.resendingFirstAccessEmail')
                : t('equipoPage.actions.resendFirstAccessEmail')}
            </button>
          ) : null}
          <button
            type="button"
            className={cn(actionMenuItemClass, 'text-rose-600 hover:bg-rose-500/10')}
            onClick={() => runAction(onDeactivate)}
          >
            <Trash2 className="h-4 w-4" />
            {t('equipoPage.actions.deactivate')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

const parseAreaSearch = (items = [], query = '') => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => String(item.name || '').toLowerCase().includes(normalizedQuery))
}

function ManagedAreasMultiSelect({
  id,
  label,
  value = [],
  options = [],
  onChange,
  hint,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  clearLabel,
  selectedCountLabel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)

  const selectedValues = useMemo(() => value.map((item) => String(item)), [value])
  const visibleOptions = useMemo(() => parseAreaSearch(options, query), [options, query])
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedValues.includes(String(option.id))),
    [options, selectedValues],
  )

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const toggleValue = (nextValue) => {
    const normalizedValue = String(nextValue)
    const exists = selectedValues.includes(normalizedValue)
    const nextSelection = exists
      ? selectedValues.filter((item) => item !== normalizedValue)
      : [...selectedValues, normalizedValue]

    onChange(nextSelection)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div ref={rootRef} className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'flex min-h-12 w-full items-center gap-3 rounded-xl border border-border/80 bg-background/85 px-3 py-2 text-left shadow-[0_14px_35px_-26px_rgba(92,134,255,0.65)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            open && 'border-ring',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <div className="min-w-0 flex-1">
            {selectedOptions.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedOptions.slice(0, 3).map((area) => (
                  <span
                    key={area.id}
                    className="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {area.name || placeholder}
                  </span>
                ))}
                {selectedOptions.length > 3 ? (
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {selectedCountLabel.replace('{{count}}', String(selectedOptions.length))}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')}
          />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-[20px] border border-border/70 bg-card/95 p-3 shadow-[0_28px_80px_-42px_rgba(62,82,152,0.38)] backdrop-blur-xl">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10"
              autoFocus
            />

            <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
              {visibleOptions.length ? (
                visibleOptions.map((area) => {
                  const areaId = String(area.id)
                  const selected = selectedValues.includes(areaId)

                  return (
                    <button
                      key={areaId}
                      type="button"
                      onClick={() => toggleValue(areaId)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                        selected
                          ? 'border-primary/30 bg-primary/10 text-foreground'
                          : 'border-border/70 bg-background/75 hover:border-ring hover:bg-muted/70',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-transparent',
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {area.name || placeholder}
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/50 px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </div>
              )}
            </div>

            {selectedOptions.length ? (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                <span className="text-xs text-muted-foreground">
                  {selectedCountLabel.replace('{{count}}', String(selectedOptions.length))}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => onChange([])}
                >
                  {clearLabel}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function TopFilterSelect({ ariaLabel, value, onChange, options = [], disabled = false, className }) {
  return (
    <div className={cn('relative min-w-[180px]', className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          formControlClass,
          'appearance-none bg-card/95 pr-9 text-[11px] font-medium shadow-[0_18px_40px_-30px_rgba(62,82,152,0.5)]',
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

const ExtraEmployeesNotice = ({
  extraEmployees,
  onPay,
  isPaying,
  t,
  formatDate,
}) => {
  if (!extraEmployees?.has_pending_payment) return null

  const overdue = Boolean(extraEmployees.payment_overdue)
  const Icon = overdue ? ShieldAlert : AlertTriangle

  return (
    <section
      className={cn(
        'rounded-3xl border p-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-5',
        overdue ? 'border-rose-300/70 bg-rose-500/10' : 'border-amber-300/70 bg-amber-500/10',
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              overdue
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-100'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-100',
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {overdue
                  ? t('equipoPage.extraEmployees.overdueTitle')
                  : t('equipoPage.extraEmployees.pendingTitle')}
              </p>
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-[11px] font-semibold',
                  overdue
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-100'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-100',
                )}
              >
                {overdue
                  ? t('equipoPage.extraEmployees.badges.overdue')
                  : t('equipoPage.extraEmployees.badges.pending')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('equipoPage.extraEmployees.description', {
                count: extraEmployees.pending_quantity ?? 0,
              })}
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">
                {t('equipoPage.extraEmployees.pendingQuantity', {
                  count: extraEmployees.pending_quantity ?? 0,
                })}
              </span>
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">
                {t('equipoPage.extraEmployees.paidAllowance', {
                  count: extraEmployees.paid_allowance ?? 0,
                })}
              </span>
              {extraEmployees.payment_due_at ? (
                <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">
                  {t('equipoPage.extraEmployees.dueAt', {
                    date: formatDate(extraEmployees.payment_due_at),
                  })}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <Button type="button" onClick={onPay} disabled={isPaying}>
          {isPaying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('equipoPage.extraEmployees.redirecting')}
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              {t('equipoPage.extraEmployees.payAction')}
            </>
          )}
        </Button>
      </div>
    </section>
  )
}

const roleSupportsManagedAreas = (role) => MANAGED_AREAS_ROLES.has(role)

const normalizeFormRoleState = (nextRole, previousForm) => ({
  ...previousForm,
  role: nextRole,
  managed_area_ids: roleSupportsManagedAreas(nextRole)
    ? previousForm.managed_area_ids || []
    : [],
})

const buildEmployeePayload = (form) => {
  const payload = {
    name: form.name.trim(),
    email: form.email.trim(),
    role: form.role,
    area_id: form.area_id || null,
  }

  if (form.shift_id) {
    payload.shift_id = form.shift_id
  }

  if (roleSupportsManagedAreas(form.role)) {
    payload.managed_area_ids = Array.isArray(form.managed_area_ids)
      ? form.managed_area_ids.filter(Boolean)
      : []
  }

  return payload
}

export default function Equipo() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const { data: settingsOverview, reload: reloadOverview } = useSettingsOverview()
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasManagementAccess = useMemo(
    () => canRenderCard(capabilities, MANAGEMENT_REQUIRES),
    [capabilities],
  )
  const { areas, loading: areasLoading, reload: reloadAreas } = useAreas({
    enabled: hasManagementAccess,
    autoLoad: true,
    onError: (message) => {
      toast({
        title: t('equipoPage.toasts.areasError.title'),
        description: message || t('equipoPage.toasts.areasError.description'),
        variant: 'error',
      })
    },
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(buildCreateForm)

  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState(buildEditForm)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignForm, setAssignForm] = useState(buildAssignForm)
  const [assignEmployee, setAssignEmployee] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showShiftPreview, setShowShiftPreview] = useState(false)
  const [isPayingExtraEmployees, setIsPayingExtraEmployees] = useState(false)

  const roleOptions = useMemo(
    () =>
      ROLE_OPTIONS.map((role) => ({
        value: role,
        label: t(`equipoPage.roles.${role}`),
      })),
    [t],
  )
  const roleFilterOptions = useMemo(
    () => [
      { value: 'all', label: t('equipoPage.roles.all') },
      ...roleOptions,
    ],
    [roleOptions, t],
  )
  const areaFilterOptions = useMemo(
    () =>
      [
        { value: 'all', label: t('equipoPage.filters.allAreas') },
        ...areas.map((area) => ({
          value: String(area.id),
          label: area.name || t('equipoPage.areas.unnamed'),
        })),
      ],
    [areas, t],
  )

  const handleListError = useCallback(
    (message) => {
      toast({
        title: t('equipoPage.toasts.loadError.title'),
        description: message,
        variant: 'error',
      })
    },
    [t, toast],
  )

  const handleShiftsError = useCallback(
    (err) => {
      toast({
        title: t('equipoPage.toasts.shiftsError.title'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('equipoPage.toasts.shiftsError.description'),
        variant: 'error',
      })
    },
    [t, toast],
  )

  const {
    employees,
    filteredEmployees,
    filters,
    setFilters,
    sort,
    setSort,
    page,
    setPage,
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
    resendEmployeeInviteEntry,
  } = useEmployeesManagement({
    t,
    enabled: hasManagementAccess,
    onListError: handleListError,
    onShiftsError: handleShiftsError,
  })

  useEffect(() => {
    if (createOpen || editOpen || assignOpen) {
      ensureShifts()
    }
    if (createOpen || editOpen) {
      reloadAreas()
    }
  }, [assignOpen, createOpen, editOpen, ensureShifts, reloadAreas])

  useEffect(() => {
    if (createOpen) {
      setCreateForm(buildCreateForm())
    }
  }, [createOpen])

  useEffect(() => {
    setShowShiftPreview(false)
  }, [editForm.shift_id])

  const formatRole = (role) => {
    if (!role) return t('equipoPage.roles.unknown')
    return t(`equipoPage.roles.${role}`, role)
  }

  const formatDate = (value) => {
    if (!value) return t('equipoPage.table.emptyDate')
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return t('equipoPage.table.emptyDate')
    return date.toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return '--:--'
    const parts = timeString.split(':')
    return `${parts[0] || '--'}:${parts[1] || '00'}`
  }

  const formatOverviewDate = (value) => {
    if (!value) return '--'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const selectedEditShift = useMemo(
    () => shifts.find((shift) => String(shift.id) === String(editForm.shift_id)),
    [shifts, editForm.shift_id],
  )

  const handleToggleDateSort = () => {
    setSort((current) => (current === 'createdAt:asc' ? 'createdAt:desc' : 'createdAt:asc'))
  }

  const renderDateSortIcon = () => {
    if (sort === 'createdAt:asc') {
      return <ChevronUp className="h-3.5 w-3.5 text-primary" aria-hidden />
    }

    if (sort === 'createdAt:desc') {
      return <ChevronDown className="h-3.5 w-3.5 text-primary" aria-hidden />
    }

    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    const payload = buildEmployeePayload(createForm)

    const result = await createEmployeeEntry(payload)
    if (result.ok) {
      toast({
        title: t('equipoPage.toasts.createSuccess.title'),
        description: t('equipoPage.toasts.createSuccess.description'),
        variant: 'success',
      })
      setCreateOpen(false)
      setCreateForm(buildCreateForm())
      if (page === 1) {
        await refreshEmployees(1)
      } else {
        setPage(1)
      }
      await reloadOverview()
      return
    }

    const emailError = result.error?.response?.data?.errors?.email?.[0]
    const roleError = result.error?.response?.data?.errors?.role?.[0]
    const areaError = result.error?.response?.data?.errors?.area_id?.[0]
    const managedAreasError = result.error?.response?.data?.errors?.managed_area_ids?.[0]
    toast({
      title: t('equipoPage.toasts.createError.title'),
      description:
        managedAreasError ||
        areaError ||
        roleError ||
        emailError ||
        t('equipoPage.toasts.createError.description'),
      variant: 'error',
    })
  }

  const handleExtraEmployeesCheckout = async () => {
    setIsPayingExtraEmployees(true)
    try {
      const response = await createExtraEmployeesCheckoutSession()
      if (!response?.url) {
        throw new Error(t('equipoPage.extraEmployees.errors.missingUrl'))
      }

      await reloadOverview()
      window.location.assign(response.url)
    } catch (err) {
      toast({
        title: t('equipoPage.extraEmployees.errors.title'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('equipoPage.extraEmployees.errors.description'),
        variant: 'error',
      })
      setIsPayingExtraEmployees(false)
    }
  }

  const handleEditOpen = async (employee) => {
    if (!employee?.id) return
    setSelectedEmployee(employee)
    setEditForm(buildEditForm(employee))
    setEditOpen(true)
    setShowShiftPreview(false)
    setEditLoading(true)
    try {
      const detail = await getEmployee(employee.id)
      if (detail) {
        const normalized = normalizeEmployee(detail)
        setSelectedEmployee(normalized)
        setEditForm(buildEditForm(normalized))
      }
    } catch (err) {
      toast({
        title: t('equipoPage.toasts.detailsError.title'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('equipoPage.toasts.detailsError.description'),
        variant: 'error',
      })
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!selectedEmployee?.id) return
    const payload = buildEmployeePayload(editForm)

    const result = await updateEmployeeEntry(selectedEmployee.id, payload)
    if (result.ok) {
      toast({
        title: t('equipoPage.toasts.updateSuccess.title'),
        description: t('equipoPage.toasts.updateSuccess.description'),
        variant: 'success',
      })
      setEditOpen(false)
      setSelectedEmployee(null)
      setEditForm(buildEditForm())
      await refreshEmployees(page)
      return
    }

    const emailError = result.error?.response?.data?.errors?.email?.[0]
    const roleError = result.error?.response?.data?.errors?.role?.[0]
    const areaError = result.error?.response?.data?.errors?.area_id?.[0]
    const managedAreasError = result.error?.response?.data?.errors?.managed_area_ids?.[0]
    toast({
      title: t('equipoPage.toasts.updateError.title'),
      description:
        managedAreasError ||
        areaError ||
        roleError ||
        emailError ||
        t('equipoPage.toasts.updateError.description'),
      variant: 'error',
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return
    const result = await deleteEmployeeEntry(deleteTarget.id)
    if (result.ok) {
      toast({
        title: t('equipoPage.toasts.deleteSuccess.title'),
        description: t('equipoPage.toasts.deleteSuccess.description'),
        variant: 'success',
      })
      setDeleteTarget(null)
      const targetPage = page > 1 && employees.length === 1 ? page - 1 : page
      await refreshEmployees(targetPage)
      await reloadOverview()
      return
    }

    toast({
      title: t('equipoPage.toasts.deleteError.title'),
      description:
        result.error?.response?.data?.message ||
        result.error?.message ||
        t('equipoPage.toasts.deleteError.description'),
      variant: 'error',
    })
  }

  const handleAssignOpen = (employee) => {
    if (!employee?.id) return
    setAssignEmployee(employee)
    setAssignForm(buildAssignForm(employee))
    setAssignOpen(true)
  }

  const handleAssignSubmit = async (event) => {
    event.preventDefault()
    if (!assignEmployee?.id) return
    const payload = {
      shift_id: assignForm.shift_id,
    }
    if (assignForm.start_date) {
      payload.start_date = assignForm.start_date
    }

    const result = await assignShiftEntry(assignEmployee.id, payload)
    if (result.ok) {
      toast({
        title: t('equipoPage.toasts.assignSuccess.title'),
        description: t('equipoPage.toasts.assignSuccess.description'),
        variant: 'success',
      })
      setAssignOpen(false)
      setAssignEmployee(null)
      setAssignForm(buildAssignForm())
      await refreshEmployees(page)
      return
    }

    toast({
      title: t('equipoPage.toasts.assignError.title'),
      description:
        result.error?.response?.data?.message ||
        result.error?.message ||
        t('equipoPage.toasts.assignError.description'),
      variant: 'error',
    })
  }

  const handleResendFirstAccessEmail = async (employee) => {
    if (!employee?.id) return

    const result = await resendEmployeeInviteEntry(employee.id)
    if (result.ok) {
      toast({
        title: t('equipoPage.toasts.resendInviteSuccess.title'),
        description: t('equipoPage.toasts.resendInviteSuccess.description'),
        variant: 'success',
      })
      return
    }

    toast({
      title: t('equipoPage.toasts.resendInviteError.title'),
      description:
        result.error?.response?.data?.message ||
        result.error?.message ||
        t('equipoPage.toasts.resendInviteError.description'),
      variant: 'error',
    })
  }

  const handleRoleChange = (setter) => (event) => {
    const nextRole = event.target.value
    setter((prev) => normalizeFormRoleState(nextRole, prev))
  }

  const handleManagedAreasChange = (setter) => (values) => {
    setter((prev) => ({ ...prev, managed_area_ids: values }))
  }

  const renderAreaFields = (form, setter, prefix, disabled = false) => {
    const showManagedAreas = roleSupportsManagedAreas(form.role)

    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-area`}>{t('equipoPage.form.areaLabel')}</Label>
          <Select
            id={`${prefix}-area`}
            name="area_id"
            value={form.area_id}
            onChange={(event) =>
              setter((prev) => ({ ...prev, area_id: event.target.value }))
            }
            disabled={disabled}
          >
            <option value="">{t('equipoPage.form.areaPlaceholder')}</option>
            {areasLoading ? (
              <option value="" disabled>
                {t('equipoPage.areas.loading')}
              </option>
            ) : areas.length === 0 ? (
              <option value="" disabled>
                {t('equipoPage.areas.empty')}
              </option>
            ) : (
              areas.map((area) => (
                <option key={area.id} value={String(area.id)}>
                  {area.name || t('equipoPage.areas.unnamed')}
                </option>
              ))
            )}
          </Select>
        </div>

        {showManagedAreas ? (
          <ManagedAreasMultiSelect
              id={`${prefix}-managed-areas`}
              value={form.managed_area_ids}
              label={t('equipoPage.form.managedAreasLabel')}
              placeholder={t('equipoPage.form.managedAreasPlaceholder')}
              searchPlaceholder={t('equipoPage.form.managedAreasSearchPlaceholder')}
              emptyLabel={t('equipoPage.form.managedAreasEmpty')}
              clearLabel={t('equipoPage.form.managedAreasClear')}
              selectedCountLabel={t('equipoPage.form.managedAreasSelectedCount')}
              options={areas}
              onChange={handleManagedAreasChange(setter)}
              hint={t('equipoPage.form.managedAreasHint')}
              disabled={disabled || areasLoading || areas.length === 0}
            />
        ) : null}
      </>
    )
  }

  if (!hasManagementAccess) {
    return (
      <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
        <PageContainer className="py-5 sm:py-6">
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-6 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {t('equipoPage.states.noPermissionTitle')}
            </p>
            <p className="mt-1">{t('equipoPage.states.noPermissionDescription')}</p>
          </div>
        </PageContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="py-5 sm:py-6 space-y-6">
        <AppTopBar
          icon={<Users className="h-5 w-5" />}
          eyebrow={t('equipoPage.tag')}
          title={t('equipoPage.title')}
          subtitle={t('equipoPage.subtitle')}
          filters={
            <>
              <div className={cn(fieldShellClass, 'min-w-[220px] flex-1')}>
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('equipoPage.searchPlaceholder')}
                  className={bareFieldInputClass}
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                />
              </div>
              <TopFilterSelect
                ariaLabel={t('equipoPage.form.roleLabel')}
                value={filters.role}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, role: event.target.value }))
                }
                options={roleFilterOptions}
              />
              <TopFilterSelect
                ariaLabel={t('equipoPage.filters.areaLabel')}
                value={filters.area}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, area: event.target.value }))
                }
                options={areaFilterOptions}
                disabled={areasLoading}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-border bg-background/80 px-3 text-sm shrink-0"
                onClick={() => refreshEmployees(page)}
              >
                <RefreshCcw className="h-4 w-4 text-primary" />
                {t('equipoPage.actions.refresh')}
              </Button>
              <Button
                type="button"
                className="rounded-full px-4 text-sm shrink-0"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t('equipoPage.actions.create')}
              </Button>
            </>
          }
        />

        <ExtraEmployeesNotice
          extraEmployees={settingsOverview?.usage?.extra_employees}
          onPay={handleExtraEmployeesCheckout}
          isPaying={isPayingExtraEmployees}
          t={t}
          formatDate={formatOverviewDate}
        />

        <section className="rounded-3xl border border-border/80 bg-card/95 p-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {t('equipoPage.table.label')}
                </p>
                <h2 className="text-sm font-semibold">{t('equipoPage.table.title')}</h2>
              </div>
            </div>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t('equipoPage.table.count', { count: filteredEmployees.length })}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                  />
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 shadow-[0_18px_50px_-38px_rgba(255,82,82,0.25)] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                <p className="font-semibold">{t('equipoPage.states.errorTitle')}</p>
                <p className="mt-1">{error}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 rounded-full px-3 text-xs"
                  onClick={() => refreshEmployees(page)}
                >
                  {t('equipoPage.actions.retry')}
                </Button>
              </div>
            ) : null}

            {!loading && !error && filteredEmployees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground shadow-[0_18px_50px_-40px_rgba(62,82,152,0.35)]">
                <p className="font-semibold text-foreground">{t('equipoPage.table.emptyTitle')}</p>
                <p className="mt-1">{t('equipoPage.table.emptyDescription')}</p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 rounded-full px-4"
                  onClick={() => setCreateOpen(true)}
                >
                  {t('equipoPage.actions.create')}
                </Button>
              </div>
            ) : null}

            {!loading && !error && filteredEmployees.length > 0 ? (
              <>
                <div className="space-y-3 md:hidden">
                  {filteredEmployees.map((employee, index) => {
                    const isBusy =
                      mutationLoading.delete ||
                      mutationLoading.edit ||
                      mutationLoading.shift ||
                      mutationLoading.resendInvite
                    const isDisabled = !employee.id || isBusy
                    return (
                      <div
                        key={employee.id}
                        className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <span className="inline-flex min-w-8 items-center justify-center rounded-full border border-border/70 bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                #{index + 1}
                              </span>
                              <p className="pt-0.5 text-sm font-semibold leading-snug">
                                {employee.name || t('equipoPage.table.emptyName')}
                              </p>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {employee.email || t('equipoPage.table.emptyEmail')}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{formatRole(employee.role)}</span>
                              <span>
                                {employee.area_name || employee.areaName || t('equipoPage.table.emptyArea')}
                              </span>
                              {Array.isArray(employee.managed_areas) && employee.managed_areas.length > 0 ? (
                                <span>
                                  {employee.managed_areas
                                    .map((area) => area?.name)
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              ) : null}
                              <span>{formatDate(employee.createdAt)}</span>
                              {employee.shiftId || employee.shiftName ? (
                                <span className="rounded-full border border-emerald-200/70 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  {t('equipoPage.badges.shiftAssigned')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <EmployeeActionsMenu
                            disabled={isDisabled}
                            showResendFirstAccessEmail={Boolean(
                              employee.must_change_password ?? employee.mustChangePassword,
                            )}
                            resendInviteLoading={mutationLoading.resendInvite}
                            onEdit={() => handleEditOpen(employee)}
                            onAssignShift={() => handleAssignOpen(employee)}
                            onResendFirstAccessEmail={() => handleResendFirstAccessEmail(employee)}
                            onDeactivate={() => setDeleteTarget(employee)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        <th className="w-14 px-3 py-3">{t('equipoPage.table.headers.row')}</th>
                        <th className="px-3 py-3">{t('equipoPage.table.headers.name')}</th>
                        <th className="px-3 py-3">{t('equipoPage.table.headers.email')}</th>
                        <th className="px-3 py-3">{t('equipoPage.table.headers.role')}</th>
                        <th className="px-3 py-3">{t('equipoPage.table.headers.area')}</th>
                        <th className="px-3 py-3">
                          <button
                            type="button"
                            onClick={handleToggleDateSort}
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-inherit transition hover:text-foreground"
                            aria-label={t('equipoPage.sort.columnAriaLabel', {
                              column: t('equipoPage.table.headers.createdAt'),
                            })}
                          >
                            <span>{t('equipoPage.table.headers.createdAt')}</span>
                            {renderDateSortIcon()}
                          </button>
                        </th>
                        <th className="px-3 py-3 text-right">{t('equipoPage.table.headers.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee, index) => {
                        const isBusy =
                          mutationLoading.delete ||
                          mutationLoading.edit ||
                          mutationLoading.shift ||
                          mutationLoading.resendInvite
                        const isDisabled = !employee.id || isBusy
                        return (
                          <tr
                            key={employee.id}
                            className="border-b border-border/80 last:border-b-0"
                          >
                            <td className="px-3 py-4 text-muted-foreground">{index + 1}</td>
                            <td className="px-3 py-4">
                              <div className="space-y-1">
                                <p className="font-semibold">
                                  {employee.name || t('equipoPage.table.emptyName')}
                                </p>
                                {employee.shiftId || employee.shiftName ? (
                                  <span className="inline-flex w-fit rounded-full border border-emerald-200/70 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    {t('equipoPage.badges.shiftAssigned')}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              {employee.email || t('equipoPage.table.emptyEmail')}
                            </td>
                            <td className="px-3 py-4">{formatRole(employee.role)}</td>
                            <td className="px-3 py-4">
                              <div className="space-y-1">
                                <p>{employee.area_name || employee.areaName || t('equipoPage.table.emptyArea')}</p>
                                {Array.isArray(employee.managed_areas) && employee.managed_areas.length > 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    {employee.managed_areas
                                      .map((area) => area?.name)
                                      .filter(Boolean)
                                      .join(', ')}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-4">{formatDate(employee.createdAt)}</td>
                            <td className="px-3 py-4">
                              <div className="flex justify-end">
                                <EmployeeActionsMenu
                                  disabled={isDisabled}
                                  showResendFirstAccessEmail={Boolean(
                                    employee.must_change_password ?? employee.mustChangePassword,
                                  )}
                                  resendInviteLoading={mutationLoading.resendInvite}
                                  onEdit={() => handleEditOpen(employee)}
                                  onAssignShift={() => handleAssignOpen(employee)}
                                  onResendFirstAccessEmail={() => handleResendFirstAccessEmail(employee)}
                                  onDeactivate={() => setDeleteTarget(employee)}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {!loading && !error && filteredEmployees.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
                <span>
                  {totalPages
                    ? t('equipoPage.pagination.pageOf', { page, total: totalPages })
                    : t('equipoPage.pagination.page', { page })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3 text-xs"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1 || loading}
                  >
                    {t('equipoPage.pagination.previous')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3 text-xs"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!canGoNext || loading}
                  >
                    {t('equipoPage.pagination.next')}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </PageContainer>
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setCreateForm(buildCreateForm())
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('equipoPage.modals.createTitle')}</DialogTitle>
            <DialogDescription>{t('equipoPage.modals.createDescription')}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleCreateSubmit}>
            <div className="space-y-2">
              <Label htmlFor="create-name">{t('equipoPage.form.nameLabel')}</Label>
              <Input
                id="create-name"
                name="name"
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">{t('equipoPage.form.emailLabel')}</Label>
              <Input
                id="create-email"
                name="email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">{t('equipoPage.form.roleLabel')}</Label>
              <Select
                id="create-role"
                name="role"
                value={createForm.role}
                onChange={handleRoleChange(setCreateForm)}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            {renderAreaFields(createForm, setCreateForm, 'create')}
            <div className="space-y-2">
              <Label htmlFor="create-shift">{t('equipoPage.form.shiftLabel')}</Label>
              <Select
                id="create-shift"
                name="shift_id"
                value={createForm.shift_id}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, shift_id: event.target.value }))
                }
              >
                <option value="">{t('equipoPage.form.shiftPlaceholder')}</option>
                {shiftsLoading ? (
                  <option value="" disabled>
                    {t('equipoPage.shifts.loading')}
                  </option>
                ) : shifts.length === 0 ? (
                  <option value="" disabled>
                    {t('equipoPage.shifts.empty')}
                  </option>
                ) : (
                  shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name || t('equipoPage.shifts.unnamed')}
                    </option>
                  ))
                )}
              </Select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutationLoading.create} className="min-w-[140px]">
                {mutationLoading.create ? t('equipoPage.actions.creating') : t('equipoPage.actions.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setSelectedEmployee(null)
            setEditForm(buildEditForm())
            setEditLoading(false)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('equipoPage.modals.editTitle')}</DialogTitle>
            <DialogDescription>{t('equipoPage.modals.editDescription')}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('equipoPage.form.nameLabel')}</Label>
              <Input
                id="edit-name"
                name="name"
                value={editForm.name}
                onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('equipoPage.form.emailLabel')}</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={editForm.email}
                onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                required
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">{t('equipoPage.form.roleLabel')}</Label>
              <Select
                id="edit-role"
                name="role"
                value={editForm.role}
                onChange={handleRoleChange(setEditForm)}
                disabled={editLoading}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            {renderAreaFields(editForm, setEditForm, 'edit', editLoading)}
            <div className="space-y-2">
              <Label htmlFor="edit-shift">{t('equipoPage.form.shiftLabel')}</Label>
              <Select
                id="edit-shift"
                name="shift_id"
                value={editForm.shift_id}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, shift_id: event.target.value }))
                }
                disabled={editLoading}
              >
                <option value="">{t('equipoPage.form.shiftPlaceholder')}</option>
                {shiftsLoading ? (
                  <option value="" disabled>
                    {t('equipoPage.shifts.loading')}
                  </option>
                ) : shifts.length === 0 ? (
                  <option value="" disabled>
                    {t('equipoPage.shifts.empty')}
                  </option>
                ) : (
                  shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name || t('equipoPage.shifts.unnamed')}
                    </option>
                  ))
                )}
              </Select>
              {editForm.shift_id && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowShiftPreview((prev) => !prev)}
                      disabled={editLoading}
                    >
                      {showShiftPreview ? 'Esconder pré-visualização' : 'Ver pré-visualização'}
                    </Button>
                    {selectedEditShift?.name && !showShiftPreview && (
                      <span className="text-xs text-muted-foreground">
                        Veja detalhes da jornada selecionada
                      </span>
                    )}
                  </div>
                  {showShiftPreview && selectedEditShift && (
                    <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                      <div className="font-semibold text-foreground">{selectedEditShift.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(selectedEditShift.start_time)} - {formatTime(selectedEditShift.end_time)}
                        {selectedEditShift.is_flexible ? ' · Flexível' : ' · Fixa'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel')}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={mutationLoading.edit || editLoading}
                className="min-w-[140px]"
              >
                {mutationLoading.edit ? t('equipoPage.actions.updating') : t('equipoPage.actions.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open)
          if (!open) {
            setAssignEmployee(null)
            setAssignForm(buildAssignForm())
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('equipoPage.modals.assignTitle')}</DialogTitle>
            <DialogDescription>{t('equipoPage.modals.assignDescription')}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleAssignSubmit}>
            <div className="space-y-2">
              <Label htmlFor="assign-shift">{t('equipoPage.form.shiftLabel')}</Label>
              <Select
                id="assign-shift"
                name="shift_id"
                value={assignForm.shift_id}
                onChange={(event) =>
                  setAssignForm((prev) => ({ ...prev, shift_id: event.target.value }))
                }
                required
              >
                <option value="">{t('equipoPage.form.shiftPlaceholder')}</option>
                {shiftsLoading ? (
                  <option value="" disabled>
                    {t('equipoPage.shifts.loading')}
                  </option>
                ) : shifts.length === 0 ? (
                  <option value="" disabled>
                    {t('equipoPage.shifts.empty')}
                  </option>
                ) : (
                  shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name || t('equipoPage.shifts.unnamed')}
                    </option>
                  ))
                )}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-start">{t('equipoPage.form.startDateLabel')}</Label>
              <Input
                id="assign-start"
                name="start_date"
                type="date"
                value={assignForm.start_date}
                onChange={(event) =>
                  setAssignForm((prev) => ({ ...prev, start_date: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutationLoading.shift} className="min-w-[140px]">
                {mutationLoading.shift ? t('equipoPage.actions.assigning') : t('equipoPage.actions.assign')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('equipoPage.modals.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('equipoPage.modals.deleteDescription', {
                name: deleteTarget?.name || t('equipoPage.table.emptyName'),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.actions.cancel')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={mutationLoading.delete}
              onClick={handleDeleteConfirm}
            >
              {mutationLoading.delete
                ? t('equipoPage.actions.deactivating')
                : t('equipoPage.actions.deactivate')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


