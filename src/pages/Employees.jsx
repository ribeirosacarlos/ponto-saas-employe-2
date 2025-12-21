import { useCallback, useEffect, useMemo, useState } from 'react'
import { Menu, RefreshCcw, UserPlus, Users, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import {
  assignEmployeeShift,
  createEmployee,
  deleteEmployee,
  listEmployees,
  listShifts,
  updateEmployee,
} from '../lib/api'

const ROLE_BADGES = {
  admin: 'border-amber-200 bg-amber-500/10 text-amber-700',
  manager: 'border-indigo-200 bg-indigo-500/10 text-indigo-700',
  area_manager: 'border-sky-200 bg-sky-500/10 text-sky-700',
  employee: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
}

const ROLE_PRIORITY = ['admin', 'manager', 'area_manager', 'employee']

const formatDate = (value, locale) =>
  value
    ? new Date(value).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '--'

function EmployeeFormModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
  initialData,
  roleOptions,
  shiftOptions,
  title,
  submitLabel,
  nameLabel,
  emailLabel,
  passwordLabel,
  shiftLabel,
  roleLabel,
  cancelLabel,
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'employee',
    password: '',
    shift_id: '',
  })

  useEffect(() => {
    if (!open) return
    setForm({
      name: initialData?.name || '',
      email: initialData?.email || '',
      role: initialData?.role || 'employee',
      password: '',
      shift_id: initialData?.shift_id ?? initialData?.shiftId ?? '',
    })
  }, [initialData, open])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {nameLabel}
            </label>
            <Input
              name="name"
              placeholder={nameLabel}
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {emailLabel}
            </label>
            <Input
              name="email"
              type="email"
              placeholder={emailLabel}
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {roleLabel}
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="h-12 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {passwordLabel}
            </label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {shiftLabel}
            </label>
            <select
              name="shift_id"
              value={form.shift_id || ''}
              onChange={handleChange}
              className="h-12 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="">{shiftLabel}</option>
              {shiftOptions.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="rounded-full">
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" className="rounded-full" disabled={loading}>
              {loading ? `${submitLabel}...` : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ShiftAssignModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
  shiftOptions,
  initialShift,
  title,
  shiftLabel,
  startDateLabel,
  submitLabel,
  cancelLabel,
}) {
  const [form, setForm] = useState({
    shift_id: '',
    start_date: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    if (!open) return
    setForm({
      shift_id: initialShift || '',
      start_date: new Date().toISOString().slice(0, 10),
    })
  }, [initialShift, open])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {shiftLabel}
            </label>
            <select
              name="shift_id"
              value={form.shift_id || ''}
              onChange={handleChange}
              required
              className="h-12 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="">{shiftLabel}</option>
              {shiftOptions.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {startDateLabel}
            </label>
            <Input
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange}
              required
            />
          </div>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="rounded-full">
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" className="rounded-full" disabled={loading}>
              {loading ? `${submitLabel}...` : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  title,
  description,
  confirmLabel,
  cancelLabel,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="rounded-full">
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="rounded-full"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? `${confirmLabel}...` : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function normalizeEmployee(employee = {}) {
  const role =
    employee.role ||
    employee.type ||
    employee.permission ||
    employee.profile ||
    employee.user_type ||
    'employee'

  return {
    ...employee,
    role,
    createdAt: employee.created_at || employee.createdAt,
    shift_id: employee.shift_id ?? employee.shiftId ?? employee.shift?.id,
    shift_name: employee.shift_name || employee.shift?.name,
  }
}

export default function Employees({ sidebarOpen = false, onToggleSidebar = () => {} }) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [filters, setFilters] = useState({ search: '', role: 'all' })
  const [page, setPage] = useState(1)
  const [employees, setEmployees] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [shifts, setShifts] = useState([])
  const [modalState, setModalState] = useState({
    create: false,
    edit: null,
    shift: null,
    delete: null,
  })
  const [mutationLoading, setMutationLoading] = useState({
    create: false,
    edit: false,
    delete: false,
    shift: false,
  })

  const roleOptions = useMemo(
    () => [
      { value: 'all', label: t('employeesPage.roles.all') },
      { value: 'admin', label: t('employeesPage.roles.admin') },
      { value: 'manager', label: t('employeesPage.roles.manager') },
      { value: 'area_manager', label: t('employeesPage.roles.area_manager') },
      { value: 'employee', label: t('employeesPage.roles.employee') },
    ],
    [t],
  )

  const fallbackShifts = useMemo(
    () => [
      { id: 'shift-morning', name: t('employeesPage.shifts.morning') },
      { id: 'shift-evening', name: t('employeesPage.shifts.evening') },
      { id: 'shift-overnight', name: t('employeesPage.shifts.overnight') },
    ],
    [t],
  )

  const fetchShifts = useCallback(async () => {
    try {
      const data = await listShifts()
      if (Array.isArray(data) && data.length > 0) {
        setShifts(
          data.map((shift) => ({
            id: shift.id,
            name: shift.name || shift.title || shift.label || `Shift ${shift.id}`,
          })),
        )
      } else {
        setShifts(fallbackShifts)
      }
    } catch (error) {
      console.warn('TODO: replace mock shifts when /v1/admin/shifts is available', error)
      setShifts(fallbackShifts)
    }
  }, [fallbackShifts])

  const loadEmployees = useCallback(
    async (targetPage = 1, currentFilters = {}) => {
      setLoading(true)
      try {
        const response = await listEmployees(targetPage, currentFilters)
        setEmployees((response.data || []).map(normalizeEmployee))
        setMeta(response.meta || null)
      } catch (error) {
        console.error('[Employees] Failed to load list', error)
        toast({
          title: t('employeesPage.errors.generic'),
          description: error.response?.data?.message || t('employeesPage.errors.generic'),
        })
      } finally {
        setLoading(false)
      }
    },
    [t, toast],
  )

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  useEffect(() => {
    loadEmployees(1, filters)
    setPage(1)
  }, [filters, loadEmployees])

  useEffect(() => {
    if (page === 1) return
    loadEmployees(page, filters)
  }, [filters, loadEmployees, page])

  const summary = useMemo(() => {
    const counts = {
      total: meta?.total ?? employees.length,
      managers: 0,
      employees: 0,
    }

    employees.forEach((employee) => {
      const role = employee.role || 'employee'
      if (role === 'employee') counts.employees += 1
      if (role === 'admin' || role === 'manager' || role === 'area_manager') {
        counts.managers += 1
      }
    })

    return counts
  }, [employees, meta?.total])

  const filteredByRole = useMemo(() => {
    if (filters.role === 'all') return employees
    return employees
      .filter((employee) => employee.role === filters.role)
      .sort(
        (a, b) =>
          ROLE_PRIORITY.indexOf(a.role || 'employee') - ROLE_PRIORITY.indexOf(b.role || 'employee'),
      )
  }, [employees, filters.role])

  const filteredList = useMemo(() => {
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

  const handleOpenCreate = () => setModalState((prev) => ({ ...prev, create: true }))
  const handleCloseCreate = () => setModalState((prev) => ({ ...prev, create: false }))
  const handleOpenEdit = (employee) => setModalState((prev) => ({ ...prev, edit: employee }))
  const handleCloseEdit = () => setModalState((prev) => ({ ...prev, edit: null }))
  const handleOpenShift = (employee) => setModalState((prev) => ({ ...prev, shift: employee }))
  const handleCloseShift = () => setModalState((prev) => ({ ...prev, shift: null }))
  const handleOpenDelete = (employee) => setModalState((prev) => ({ ...prev, delete: employee }))
  const handleCloseDelete = () => setModalState((prev) => ({ ...prev, delete: null }))

  const handleCreate = async (payload) => {
    setMutationLoading((prev) => ({ ...prev, create: true }))
    try {
      await createEmployee(payload)
      toast({
        title: t('employeesPage.toasts.created.title'),
        description: t('employeesPage.toasts.created.description'),
      })
      handleCloseCreate()
      setPage(1)
      await loadEmployees(1, filters)
    } catch (error) {
      console.error('[Employees] Create error', error)
      const emailError = error.response?.data?.errors?.email?.[0]
      toast({
        title: t('employeesPage.errors.generic'),
        description: emailError || t('employeesPage.errors.emailTaken'),
      })
    } finally {
      setMutationLoading((prev) => ({ ...prev, create: false }))
    }
  }

  const handleUpdate = async (payload) => {
    if (!modalState.edit?.id) return
    setMutationLoading((prev) => ({ ...prev, edit: true }))
    try {
      await updateEmployee(modalState.edit.id, payload)
      toast({
        title: t('employeesPage.toasts.updated.title'),
        description: t('employeesPage.toasts.updated.description'),
      })
      handleCloseEdit()
      await loadEmployees(page, filters)
    } catch (error) {
      console.error('[Employees] Update error', error)
      const emailError = error.response?.data?.errors?.email?.[0]
      toast({
        title: t('employeesPage.errors.generic'),
        description: emailError || t('employeesPage.errors.emailTaken'),
      })
    } finally {
      setMutationLoading((prev) => ({ ...prev, edit: false }))
    }
  }

  const handleDelete = async () => {
    if (!modalState.delete?.id) return
    setMutationLoading((prev) => ({ ...prev, delete: true }))
    try {
      await deleteEmployee(modalState.delete.id)
      toast({
        title: t('employeesPage.toasts.deleted.title'),
        description: t('employeesPage.toasts.deleted.description'),
      })
      handleCloseDelete()
      await loadEmployees(page, filters)
    } catch (error) {
      console.error('[Employees] Delete error', error)
      toast({
        title: t('employeesPage.errors.generic'),
        description: error.response?.data?.message || t('employeesPage.errors.generic'),
      })
    } finally {
      setMutationLoading((prev) => ({ ...prev, delete: false }))
    }
  }

  const handleAssignShift = async (payload) => {
    if (!modalState.shift?.id) return
    setMutationLoading((prev) => ({ ...prev, shift: true }))
    try {
      await assignEmployeeShift(modalState.shift.id, payload)
      toast({
        title: t('employeesPage.toasts.shiftAssigned.title'),
        description: t('employeesPage.toasts.shiftAssigned.description'),
      })
      handleCloseShift()
      await loadEmployees(page, filters)
    } catch (error) {
      console.error('[Employees] Shift assign error', error)
      toast({
        title: t('employeesPage.errors.generic'),
        description: error.response?.data?.message || t('employeesPage.errors.generic'),
      })
    } finally {
      setMutationLoading((prev) => ({ ...prev, shift: false }))
    }
  }

  const headerActions = (
    <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => loadEmployees(page, filters)}
        className="rounded-full border-border bg-background/80 px-4 text-sm font-semibold"
      >
        <RefreshCcw className="mr-2 h-4 w-4 text-primary" />
        {t('employeesPage.actions.refresh')}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={handleOpenCreate}
        className="rounded-full px-5 text-sm font-semibold"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        {t('employeesPage.actions.new')}
      </Button>
    </div>
  )

  const renderBadge = (role) => (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold capitalize',
        ROLE_BADGES[role] || 'border-border/70 text-muted-foreground',
      )}
    >
      {t(`employeesPage.roles.${role}`) || role}
    </span>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-5%] top-[-5%] h-64 w-64 rounded-full bg-primary/16 blur-[120px]" />
        <div className="absolute right-[-8%] top-1/4 h-72 w-72 rounded-full bg-sky-300/20 blur-[120px]" />
        <div className="absolute bottom-[-12%] right-[-10%] h-72 w-72 rounded-full bg-indigo-200/20 blur-[120px]" />
      </div>

      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">
          <header className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-6 shadow-[0_18px_90px_-60px_rgba(62,82,152,0.55)] backdrop-blur-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label={t('dashboardPage.header.toggleMenu')}
                    onClick={onToggleSidebar}
                    className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80"
                  >
                    {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        {t('employeesPage.tag')}
                      </p>
                      <h1 className="text-2xl font-semibold leading-tight">
                        {t('employeesPage.title')}
                      </h1>
                      <p className="text-sm text-muted-foreground">{t('employeesPage.subtitle')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                    {t('employeesPage.helper.primary')}
                  </span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] text-primary">
                    {t('employeesPage.helper.secondary')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 items-start lg:items-end">{headerActions}</div>
            </div>
          </header>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-border/80 bg-card/90 p-4 shadow-[0_25px_80px_-60px_rgba(62,82,152,0.55)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <RefreshCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {t('employeesPage.filters.title')}
                    </p>
                    <h2 className="text-sm font-semibold">{t('employeesPage.filters.subtitle')}</h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">{headerActions}</div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t('employeesPage.filters.search')}
                  </label>
                  <Input
                    value={filters.search}
                    onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                    placeholder={t('employeesPage.filters.searchPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t('employeesPage.filters.role')}
                  </label>
                  <select
                    value={filters.role}
                    onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
                    className="h-12 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full border-border"
                    onClick={() => loadEmployees(1, filters)}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t('employeesPage.actions.refresh')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-border/80 bg-card/90 p-4 shadow-[0_25px_80px_-60px_rgba(62,82,152,0.55)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {t('employeesPage.table.label')}
                      </p>
                      <h2 className="text-sm font-semibold">{t('employeesPage.table.title')}</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    <span className="uppercase tracking-[0.18em]">
                      {t('employeesPage.summary.total')}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-[2px] text-[12px] font-semibold text-primary">
                      {summary.total}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 shadow-inner overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[960px]">
                      <div className="grid grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_minmax(150px,.8fr)_minmax(180px,1fr)_minmax(160px,.9fr)_120px] gap-3 border-b border-border/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <span>{t('employeesPage.table.columns.name')}</span>
                        <span>{t('employeesPage.table.columns.email')}</span>
                        <span>{t('employeesPage.table.columns.role')}</span>
                        <span>{t('employeesPage.table.columns.shift')}</span>
                        <span>{t('employeesPage.table.columns.createdAt')}</span>
                        <span className="text-right">{t('employeesPage.table.columns.actions')}</span>
                      </div>
                      <div className="max-h-[520px] overflow-y-auto divide-y divide-border/60">
                        {loading ? (
                          <div className="px-4 py-6 text-sm text-muted-foreground">
                            {t('employeesPage.states.loading')}
                          </div>
                        ) : filteredList.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-muted-foreground">
                            {t('employeesPage.table.empty')}
                          </div>
                        ) : (
                          filteredList.map((employee) => (
                            <div
                              key={employee.id}
                              className={cn(
                                'grid grid-cols-1 gap-3 px-4 py-4 text-sm text-foreground',
                                'md:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_minmax(150px,.8fr)_minmax(180px,1fr)_minmax(160px,.9fr)_120px]',
                              )}
                            >
                              <div className="space-y-1">
                                <strong className="block text-foreground">{employee.name}</strong>
                                <span className="text-[11px] text-muted-foreground">ID: {employee.id}</span>
                              </div>
                              <div className="space-y-1">
                                <span>{employee.email}</span>
                                {employee.company_id ? (
                                  <span className="text-[11px] text-muted-foreground">
                                    {t('employeesPage.table.company')}: {employee.company_id}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center">{renderBadge(employee.role)}</div>
                              <div className="space-y-1">
                                <span className="text-sm">
                                  {employee.shift_name || employee.shift_label || t('employeesPage.table.noShift')}
                                </span>
                                {employee.shift_id ? (
                                  <span className="text-[11px] text-muted-foreground">ID: {employee.shift_id}</span>
                                ) : null}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(employee.createdAt, i18n.language)}
                              </span>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={() => handleOpenEdit(employee)}
                                >
                                  {t('employeesPage.actions.edit')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={() => handleOpenShift(employee)}
                                >
                                  {t('employeesPage.actions.shift')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={() => handleOpenDelete(employee)}
                                >
                                  {t('employeesPage.actions.delete')}
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={page <= 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      {t('employeesPage.pagination.previous')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={page >= totalPages}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      {t('employeesPage.pagination.next')}
                    </Button>
                  </div>
                  <span>
                    {t('employeesPage.pagination.page')} {page} / {totalPages}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <EmployeeFormModal
        open={modalState.create}
        onOpenChange={handleCloseCreate}
        onSubmit={handleCreate}
        loading={mutationLoading.create}
        initialData={null}
        roleOptions={roleOptions.filter((option) => option.value !== 'all')}
        shiftOptions={shifts.length ? shifts : fallbackShifts}
        title={t('employeesPage.modals.create.title')}
        submitLabel={t('employeesPage.actions.create')}
        nameLabel={t('employeesPage.form.name')}
        emailLabel={t('employeesPage.form.email')}
        passwordLabel={t('employeesPage.form.passwordOptional')}
        shiftLabel={t('employeesPage.form.shift')}
        roleLabel={t('employeesPage.form.role')}
        cancelLabel={t('common.actions.cancel')}
      />

      <EmployeeFormModal
        open={Boolean(modalState.edit)}
        onOpenChange={handleCloseEdit}
        onSubmit={handleUpdate}
        loading={mutationLoading.edit}
        initialData={modalState.edit}
        roleOptions={roleOptions.filter((option) => option.value !== 'all')}
        shiftOptions={shifts.length ? shifts : fallbackShifts}
        title={t('employeesPage.modals.edit.title')}
        submitLabel={t('employeesPage.actions.save')}
        nameLabel={t('employeesPage.form.name')}
        emailLabel={t('employeesPage.form.email')}
        passwordLabel={t('employeesPage.form.passwordOptional')}
        shiftLabel={t('employeesPage.form.shift')}
        roleLabel={t('employeesPage.form.role')}
        cancelLabel={t('common.actions.cancel')}
      />

      <ShiftAssignModal
        open={Boolean(modalState.shift)}
        onOpenChange={handleCloseShift}
        onSubmit={handleAssignShift}
        loading={mutationLoading.shift}
        shiftOptions={shifts.length ? shifts : fallbackShifts}
        initialShift={modalState.shift?.shift_id}
        title={t('employeesPage.modals.shift.title')}
        shiftLabel={t('employeesPage.form.shift')}
        startDateLabel={t('employeesPage.form.startDate')}
        submitLabel={t('employeesPage.actions.assignShift')}
        cancelLabel={t('common.actions.cancel')}
      />

      <ConfirmDialog
        open={Boolean(modalState.delete)}
        onOpenChange={handleCloseDelete}
        onConfirm={handleDelete}
        loading={mutationLoading.delete}
        title={t('employeesPage.modals.delete.title')}
        description={t('employeesPage.modals.delete.description', {
          name: modalState.delete?.name || '',
        })}
        confirmLabel={t('employeesPage.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
      />
    </div>
  )
}
