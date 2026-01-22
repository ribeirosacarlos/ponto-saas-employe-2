import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, Pencil, Plus, RefreshCcw, Search, Trash2, Users } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
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
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { normalizeEmployee, useEmployeesManagement } from '../features/employees/useEmployeesManagement'
import {
  getEmployee,
} from '../lib/api'

const MANAGEMENT_REQUIRES = { anyOf: ['area_manager'] }
const ROLE_OPTIONS = ['admin', 'manager', 'area_manager', 'employee']

const buildCreateForm = () => ({
  name: '',
  email: '',
  role: 'employee',
  shift_id: '',
})

const buildEditForm = (employee = {}) => ({
  name: employee.name || '',
  email: employee.email || '',
  role: employee.role || 'employee',
  shift_id: employee.shift_id ?? employee.shiftId ?? '',
})

const buildAssignForm = (employee = {}) => ({
  shift_id: employee.shift_id ?? employee.shiftId ?? '',
  start_date: new Date().toISOString().slice(0, 10),
})


export default function Equipo() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasManagementAccess = useMemo(
    () => canRenderCard(capabilities, MANAGEMENT_REQUIRES),
    [capabilities],
  )

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
  }, [assignOpen, createOpen, editOpen, ensureShifts])

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
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return '--:--'
    const parts = timeString.split(':')
    return `${parts[0] || '--'}:${parts[1] || '00'}`
  }

  const selectedEditShift = useMemo(
    () => shifts.find((shift) => shift.id === editForm.shift_id),
    [shifts, editForm.shift_id],
  )

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      role: createForm.role,
    }
    if (createForm.shift_id) {
      payload.shift_id = createForm.shift_id
    }

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
      return
    }

    const emailError = result.error?.response?.data?.errors?.email?.[0]
    toast({
      title: t('equipoPage.toasts.createError.title'),
      description: emailError || t('equipoPage.toasts.createError.description'),
      variant: 'error',
    })
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
    const payload = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
    }
    if (editForm.shift_id) {
      payload.shift_id = editForm.shift_id
    }

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
    toast({
      title: t('equipoPage.toasts.updateError.title'),
      description: emailError || t('equipoPage.toasts.updateError.description'),
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
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border/80 bg-card/90 px-5 py-5 shadow-[0_10px_45px_-30px_rgba(62,82,152,0.35)] backdrop-blur-lg sm:px-7 sm:py-6 lg:px-8 lg:py-5">
          <div className="flex-1 min-w-[240px] max-w-full sm:max-w-xl flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Users className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {t('equipoPage.tag')}
                </p>
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                  {t('equipoPage.title')}
                </h1>
                <p className="text-sm text-muted-foreground">{t('equipoPage.subtitle')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[220px] flex items-center gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('equipoPage.searchPlaceholder')}
                  className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                />
              </div>
              <div className="min-w-[180px] flex items-center rounded-2xl border border-border bg-muted/70 px-3 py-2 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
                <select
                  aria-label={t('equipoPage.form.roleLabel')}
                  value={filters.role}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, role: event.target.value }))
                  }
                  className="w-full bg-transparent text-foreground outline-none"
                >
                  {roleFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full px-4"
              onClick={() => refreshEmployees(page)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t('equipoPage.actions.refresh')}
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full px-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t('equipoPage.actions.create')}
            </Button>
          </div>
        </header>

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
                  {filteredEmployees.map((employee) => {
                    const isBusy =
                      mutationLoading.delete || mutationLoading.edit || mutationLoading.shift
                    const isDisabled = !employee.id || isBusy
                    return (
                      <div
                        key={employee.id}
                        className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-snug">
                              {employee.name || t('equipoPage.table.emptyName')}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {employee.email || t('equipoPage.table.emptyEmail')}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{formatRole(employee.role)}</span>
                              <span>{formatDate(employee.createdAt)}</span>
                              {employee.shiftId || employee.shiftName ? (
                                <span className="rounded-full border border-emerald-200/70 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  {t('equipoPage.badges.shiftAssigned')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full px-3 text-xs"
                            onClick={() => handleEditOpen(employee)}
                            disabled={isDisabled}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t('equipoPage.actions.edit')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full px-3 text-xs"
                            onClick={() => handleAssignOpen(employee)}
                            disabled={isDisabled}
                          >
                            <CalendarCheck className="h-3.5 w-3.5" />
                            {t('equipoPage.actions.assignShift')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="rounded-full px-3 text-xs"
                            onClick={() => setDeleteTarget(employee)}
                            disabled={isDisabled}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('equipoPage.actions.deactivate')}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        <th className="px-3 py-3">{t('equipoPage.table.headers.name')}</th>
                        <th className="px-3 py-3">{t('equipoPage.table.headers.email')}</th>
                        <th className="px-3 py-3">{t('equipoPage.table.headers.role')}</th>
                        <th className="px-3 py-3">{t('equipoPage.table.headers.createdAt')}</th>
                        <th className="px-3 py-3 text-right">{t('equipoPage.table.headers.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => {
                        const isBusy =
                          mutationLoading.delete || mutationLoading.edit || mutationLoading.shift
                        const isDisabled = !employee.id || isBusy
                        return (
                          <tr
                            key={employee.id}
                            className="border-b border-border/80 last:border-b-0"
                          >
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
                            <td className="px-3 py-4">{formatDate(employee.createdAt)}</td>
                            <td className="px-3 py-4">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full px-3 text-xs"
                                  onClick={() => handleEditOpen(employee)}
                                  disabled={isDisabled}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  {t('equipoPage.actions.edit')}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full px-3 text-xs"
                                  onClick={() => handleAssignOpen(employee)}
                                  disabled={isDisabled}
                                >
                                  <CalendarCheck className="h-3.5 w-3.5" />
                                  {t('equipoPage.actions.assignShift')}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="rounded-full px-3 text-xs"
                                  onClick={() => setDeleteTarget(employee)}
                                  disabled={isDisabled}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t('equipoPage.actions.deactivate')}
                                </Button>
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
              <select
                id="create-role"
                name="role"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={createForm.role}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-shift">{t('equipoPage.form.shiftLabel')}</Label>
              <select
                id="create-shift"
                name="shift_id"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              </select>
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
        <DialogContent>
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
              <select
                id="edit-role"
                name="role"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={editForm.role}
                onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value }))}
                disabled={editLoading}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-shift">{t('equipoPage.form.shiftLabel')}</Label>
              <select
                id="edit-shift"
                name="shift_id"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              </select>
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
              <select
                id="assign-shift"
                name="shift_id"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              </select>
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
