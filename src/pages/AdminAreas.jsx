import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  X,
  Users,
} from 'lucide-react'
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
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { normalizeEmployee } from '../features/employees/useEmployeesManagement'
import { useAreas } from '../hooks/useAreas'
import {
  createArea,
  deleteArea,
  updateArea,
} from '../services/modules/areas'
import {
  listAllEmployees,
  updateEmployee,
} from '../services/modules/employees'
import { cn } from '../lib/utils'

const MANAGEMENT_REQUIRES = { anyOf: ['admin', 'super_admin'] }
const MANAGED_AREAS_ROLES = new Set(['manager', 'area_manager'])

const buildAreaForm = (area = null, linkedEmployees = []) => ({
  id: area?.id ?? '',
  name: area?.name ?? '',
  employeeIds: linkedEmployees.map((employee) => String(employee.id)),
})

const sortEmployeesByName = (employees = []) =>
  [...employees].sort((left, right) => {
    const leftLabel = `${left?.name || ''} ${left?.email || ''}`.trim()
    const rightLabel = `${right?.name || ''} ${right?.email || ''}`.trim()
    return leftLabel.localeCompare(rightLabel, undefined, { sensitivity: 'base' })
  })

const isManagedAreasRole = (role) => MANAGED_AREAS_ROLES.has(role)

const getInitials = (value, fallback = 'AR') => {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return fallback

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function buildEmployeeUpdatePayload(employee, areaId) {
  const payload = {
    name: employee?.name || '',
    email: employee?.email || '',
    role: employee?.role || 'employee',
    area_id: areaId,
  }

  const shiftId = employee?.shift_id ?? employee?.shiftId
  if (shiftId) {
    payload.shift_id = shiftId
  }

  if (isManagedAreasRole(employee?.role)) {
    payload.managed_area_ids = Array.isArray(employee?.managed_area_ids)
      ? employee.managed_area_ids.filter(Boolean)
      : Array.isArray(employee?.managedAreaIds)
        ? employee.managedAreaIds.filter(Boolean)
        : []
  }

  return payload
}

export default function AdminAreas() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasManagementAccess = useMemo(
    () => canRenderCard(capabilities, MANAGEMENT_REQUIRES),
    [capabilities],
  )
  const { areas, loading, error, reload } = useAreas({
    enabled: hasManagementAccess,
    onError: (message) => {
      toast({
        title: t('adminAreasPage.toasts.loadError.title'),
        description: message || t('adminAreasPage.toasts.loadError.description'),
        variant: 'error',
      })
    },
  })

  const [directoryEmployees, setDirectoryEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [formState, setFormState] = useState(() => buildAreaForm())
  const [initialEmployeeIds, setInitialEmployeeIds] = useState([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const employeeById = useMemo(
    () => new Map(directoryEmployees.map((employee) => [String(employee.id), employee])),
    [directoryEmployees],
  )

  const employeesByAreaId = useMemo(() => {
    const grouped = new Map()

    directoryEmployees.forEach((employee) => {
      if (employee?.area_id === null || employee?.area_id === undefined || employee?.area_id === '') {
        return
      }

      const key = String(employee.area_id)
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key).push(employee)
    })

    grouped.forEach((employees, key) => {
      grouped.set(key, sortEmployeesByName(employees))
    })

    return grouped
  }, [directoryEmployees])

  const employeeOptions = useMemo(
    () => sortEmployeesByName(directoryEmployees),
    [directoryEmployees],
  )

  const filteredEmployeeOptions = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase()
    if (!query) return employeeOptions

    return employeeOptions.filter((employee) =>
      String(employee?.name || '').toLowerCase().includes(query),
    )
  }, [employeeOptions, employeeSearch])

  const selectedEmployees = useMemo(
    () =>
      formState.employeeIds
        .map((employeeId) => employeeById.get(String(employeeId)))
        .filter(Boolean),
    [employeeById, formState.employeeIds],
  )

  const areaMetrics = useMemo(() => {
    const totalAreas = areas.length
    let totalEmployees = 0
    let emptyAreas = 0
    let busiestArea = null

    areas.forEach((area) => {
      const linkedEmployees = employeesByAreaId.get(String(area.id)) || []
      const linkedCount = linkedEmployees.length

      totalEmployees += linkedCount

      if (linkedCount === 0) {
        emptyAreas += 1
      }

      if (!busiestArea || linkedCount > busiestArea.count) {
        busiestArea = {
          name: area.name || t('adminAreasPage.states.cardFallback'),
          count: linkedCount,
        }
      }
    })

    return {
      totalAreas,
      totalEmployees,
      emptyAreas,
      busiestAreaName:
        busiestArea?.count > 0
          ? busiestArea.name
          : t('adminAreasPage.metrics.noEmployees'),
    }
  }, [areas, employeesByAreaId, t])

  const reloadEmployees = useCallback(async () => {
    if (!hasManagementAccess) return { ok: false }

    setEmployeesLoading(true)
    try {
      const response = await listAllEmployees({ perPage: 100 })
      setDirectoryEmployees(
        (Array.isArray(response) ? response : []).map((employee, index) =>
          normalizeEmployee(employee, index),
        ),
      )
      return { ok: true }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('adminAreasPage.toasts.employeesLoadError.description')

      toast({
        title: t('adminAreasPage.toasts.employeesLoadError.title'),
        description: message,
        variant: 'error',
      })

      return { ok: false, error: err }
    } finally {
      setEmployeesLoading(false)
    }
  }, [hasManagementAccess, t, toast])

  const reloadAll = useCallback(async () => {
    await Promise.all([reload(), reloadEmployees()])
  }, [reload, reloadEmployees])

  useEffect(() => {
    if (!hasManagementAccess) return
    reloadEmployees()
  }, [hasManagementAccess, reloadEmployees])

  const handleOpenCreate = () => {
    setFormMode('create')
    setInitialEmployeeIds([])
    setEmployeeSearch('')
    setFormState(buildAreaForm())
    setDialogOpen(true)
  }

  const handleOpenEdit = (area) => {
    const linkedEmployees = employeesByAreaId.get(String(area?.id)) || []
    const linkedEmployeeIds = linkedEmployees.map((employee) => String(employee.id))

    setFormMode('edit')
    setInitialEmployeeIds(linkedEmployeeIds)
    setEmployeeSearch('')
    setFormState(buildAreaForm(area, linkedEmployees))
    setDialogOpen(true)
  }

  const syncEmployeesForArea = useCallback(
    async (targetAreaId, nextEmployeeIds, previousEmployeeIds = []) => {
      const normalizedAreaId = String(targetAreaId)
      const nextIds = new Set((nextEmployeeIds || []).map((value) => String(value)))
      const previousIds = new Set((previousEmployeeIds || []).map((value) => String(value)))

      const updates = []

      nextIds.forEach((employeeId) => {
        const employee = employeeById.get(employeeId)
        if (!employee) return

        const currentAreaId =
          employee?.area_id !== null && employee?.area_id !== undefined && employee?.area_id !== ''
            ? String(employee.area_id)
            : null

        if (currentAreaId === normalizedAreaId) return

        updates.push(
          updateEmployee(employee.id, buildEmployeeUpdatePayload(employee, normalizedAreaId)),
        )
      })

      previousIds.forEach((employeeId) => {
        if (nextIds.has(employeeId)) return

        const employee = employeeById.get(employeeId)
        if (!employee) return

        const currentAreaId =
          employee?.area_id !== null && employee?.area_id !== undefined && employee?.area_id !== ''
            ? String(employee.area_id)
            : null

        if (currentAreaId !== normalizedAreaId) return

        updates.push(
          updateEmployee(employee.id, buildEmployeeUpdatePayload(employee, null)),
        )
      })

      if (updates.length === 0) return
      await Promise.all(updates)
    },
    [employeeById],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formState.name.trim()) {
      toast({
        title: t('adminAreasPage.toasts.nameRequired.title'),
        description: t('adminAreasPage.toasts.nameRequired.description'),
        variant: 'error',
      })
      return
    }

    setSaving(true)
    try {
      const payload = { name: formState.name.trim() }
      const savedArea =
        formMode === 'edit' && formState.id
          ? await updateArea(formState.id, payload)
          : await createArea(payload)

      const savedAreaId = savedArea?.id || formState.id
      await syncEmployeesForArea(savedAreaId, formState.employeeIds, initialEmployeeIds)
      await reloadAll()

      setDialogOpen(false)
      setFormMode('create')
      setInitialEmployeeIds([])
      setEmployeeSearch('')
      setFormState(buildAreaForm())

      toast({
        title:
          formMode === 'edit'
            ? t('adminAreasPage.toasts.updated.title')
            : t('adminAreasPage.toasts.created.title'),
        description:
          formMode === 'edit'
            ? t('adminAreasPage.toasts.updated.description')
            : t('adminAreasPage.toasts.created.description'),
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: t('adminAreasPage.toasts.saveError.title'),
        description:
          err?.response?.data?.message ||
          t('adminAreasPage.toasts.saveError.description'),
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return

    setDeleting(true)
    try {
      await deleteArea(deleteTarget.id)
      await reloadAll()
      toast({
        title: t('adminAreasPage.toasts.deleted.title'),
        description: t('adminAreasPage.toasts.deleted.description', {
          name: deleteTarget.name || t('adminAreasPage.states.cardFallback'),
        }),
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: t('adminAreasPage.toasts.deleteError.title'),
        description:
          err?.response?.data?.message ||
          t('adminAreasPage.toasts.deleteError.description'),
        variant: 'error',
      })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleEmployeeToggle = (employeeId) => {
    const normalizedEmployeeId = String(employeeId)
    setFormState((prev) => {
      const currentIds = Array.isArray(prev.employeeIds) ? prev.employeeIds : []
      const nextIds = currentIds.includes(normalizedEmployeeId)
        ? currentIds.filter((value) => value !== normalizedEmployeeId)
        : [...currentIds, normalizedEmployeeId]

      return { ...prev, employeeIds: nextIds }
    })
  }

  const renderContent = () => {
    if (!hasManagementAccess) {
      return (
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground">
          <p className="text-base font-semibold text-foreground">
            {t('adminAreasPage.states.noPermissionTitle')}
          </p>
          <p className="mt-1">{t('adminAreasPage.states.noPermissionDescription')}</p>
        </div>
      )
    }

    if (loading || employeesLoading) {
      return (
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={`metric-${item}`}
                className="h-16 animate-pulse rounded-xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
              />
            ))}
          </div>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {[1, 2, 3].map((item) => (
              <div
                key={`card-${item}`}
                className="h-56 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
              />
            ))}
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 dark:border-rose-500/30 dark:text-rose-100">
          <p className="font-semibold">{t('adminAreasPage.states.errorTitle')}</p>
          <p className="mt-1">{error}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 rounded-full px-3 text-xs"
            onClick={reloadAll}
          >
            {t('adminAreasPage.actions.refresh')}
          </Button>
        </div>
      )
    }

    if (!areas.length) {
      return (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{t('adminAreasPage.states.emptyTitle')}</p>
          <p className="mt-1">{t('adminAreasPage.states.emptyDescription')}</p>
          <Button
            type="button"
            size="sm"
            className="mt-3 rounded-full px-4"
            onClick={handleOpenCreate}
          >
            <Plus className="h-4 w-4" />
            {t('adminAreasPage.actions.create')}
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card/95 px-3 py-2.5 shadow-[0_18px_40px_-40px_rgba(62,82,152,0.38)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('adminAreasPage.metrics.totalAreas')}
            </p>
            <p className="mt-1 text-xl font-semibold leading-none text-foreground">{areaMetrics.totalAreas}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/95 px-3 py-2.5 shadow-[0_18px_40px_-40px_rgba(62,82,152,0.38)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('adminAreasPage.metrics.totalEmployees')}
            </p>
            <p className="mt-1 text-xl font-semibold leading-none text-foreground">{areaMetrics.totalEmployees}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/95 px-3 py-2.5 shadow-[0_18px_40px_-40px_rgba(62,82,152,0.38)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('adminAreasPage.metrics.emptyAreas')}
            </p>
            <p className="mt-1 text-xl font-semibold leading-none text-foreground">{areaMetrics.emptyAreas}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/95 px-3 py-2.5 shadow-[0_18px_40px_-40px_rgba(62,82,152,0.38)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('adminAreasPage.metrics.busiestArea')}
            </p>
            <p className="mt-1 truncate text-sm font-semibold leading-5 text-foreground">
              {areaMetrics.busiestAreaName}
            </p>
          </div>
        </div>

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {areas.map((area) => {
            const linkedEmployees = employeesByAreaId.get(String(area.id)) || []
            const memberCount = linkedEmployees.length
            const hasEmployees = memberCount > 0

            return (
              <div
                key={area.id}
                className="flex min-h-[248px] flex-col rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">
                          {area.name || t('adminAreasPage.states.cardFallback')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('adminAreasPage.card.employeeCount', { count: memberCount })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-semibold',
                      hasEmployees
                        ? 'border-primary/35 bg-primary/12 text-primary'
                        : 'border-border/70 bg-muted/70 text-muted-foreground',
                    )}
                  >
                    {hasEmployees
                      ? t('adminAreasPage.card.memberCountBadge', { count: memberCount })
                      : t('adminAreasPage.card.emptyBadge')}
                  </span>
                </div>

                <div className="mt-4 border-t border-border/70 pt-4">
                  <div className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {t('adminAreasPage.card.membersLabel')}
                  </div>

                  {hasEmployees ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {linkedEmployees.map((employee) => {
                        const employeeName =
                          employee.name || t('adminAreasPage.form.employeeFallback')

                        return (
                          <span
                            key={`${area.id}-${employee.id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 py-1 pl-1 pr-3 text-[11px] text-foreground"
                          >
                            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                              {getInitials(employeeName, 'CL')}
                            </span>
                            <span className="max-w-[150px] truncate">{employeeName}</span>
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-[13px] italic leading-5 text-muted-foreground">
                      {t('adminAreasPage.card.emptyMembers')}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3 text-xs"
                    onClick={() => handleOpenEdit(area)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('adminAreasPage.actions.edit')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="rounded-full px-3 text-xs"
                    onClick={() => setDeleteTarget(area)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('adminAreasPage.actions.delete')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <PageContainer className="space-y-6 py-5 sm:py-6">
      <AppTopBar
        icon={<Building2 className="h-5 w-5" />}
        eyebrow={t('sidebar.sections.admin')}
        title={t('adminAreasPage.title')}
        subtitle={t('adminAreasPage.subtitle')}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-border bg-background/80 px-3 text-sm"
              onClick={reloadAll}
              disabled={loading || employeesLoading}
            >
              <RefreshCcw
                className={cn(
                  'h-4 w-4 text-primary',
                  (loading || employeesLoading) && 'animate-spin',
                )}
              />
              {t('adminAreasPage.actions.refresh')}
            </Button>
            <Button
              type="button"
              className="rounded-full px-4 text-sm"
              onClick={handleOpenCreate}
              disabled={!hasManagementAccess}
            >
              <Plus className="h-4 w-4" />
              {t('adminAreasPage.actions.create')}
            </Button>
          </>
        }
      />

      {renderContent()}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setFormMode('create')
            setInitialEmployeeIds([])
            setEmployeeSearch('')
            setFormState(buildAreaForm())
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'edit'
                ? t('adminAreasPage.dialog.editTitle')
                : t('adminAreasPage.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('adminAreasPage.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="area-name">{t('adminAreasPage.form.nameLabel')}</Label>
              <Input
                id="area-name"
                name="name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={t('adminAreasPage.form.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="area-employees">{t('adminAreasPage.form.employeesLabel')}</Label>
                <span className="text-xs text-muted-foreground">
                  {t('adminAreasPage.form.selectedCount', {
                    count: formState.employeeIds.length,
                  })}
                </span>
              </div>
              <Input
                id="area-employees-search"
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder={t('adminAreasPage.form.employeesSearchPlaceholder')}
                disabled={employeesLoading || saving}
                className="h-10 rounded-lg px-3 text-sm"
              />
              <div
                id="area-employees"
                className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background/70 p-1.5 shadow-sm"
              >
                {filteredEmployeeOptions.length > 0 ? (
                  filteredEmployeeOptions.map((employee) => {
                    const employeeId = String(employee.id)
                    const isSelected = formState.employeeIds.includes(employeeId)

                    return (
                      <button
                        key={employeeId}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition',
                          isSelected
                            ? 'border-primary/40 bg-primary/10 text-foreground'
                            : 'border-transparent bg-muted/40 text-foreground hover:border-border hover:bg-muted/70',
                        )}
                        onClick={() => handleEmployeeToggle(employeeId)}
                        disabled={employeesLoading || saving}
                      >
                        <span className="truncate">
                          {employee.name || t('adminAreasPage.form.employeeFallback')}
                        </span>
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-transparent',
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                    {t('adminAreasPage.form.emptySearch')}
                  </div>
                )}
              </div>
            </div>

            {selectedEmployees.length > 0 ? (
              <div className="rounded-2xl border border-border/70 bg-muted/35 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t('adminAreasPage.form.linkedPreviewLabel')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedEmployees.map((employee) => (
                    <button
                      key={`selected-${employee.id}`}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] text-foreground transition hover:border-primary/30 hover:bg-background"
                      onClick={() => handleEmployeeToggle(employee.id)}
                    >
                      {employee.name || t('adminAreasPage.form.employeeFallback')}
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving} className="min-w-[140px]">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('common.actions.submit')
                )}
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
            <DialogTitle>{t('adminAreasPage.dialog.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('adminAreasPage.dialog.deleteDescription', {
                name: deleteTarget?.name || t('adminAreasPage.states.cardFallback'),
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
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? t('common.loading') : t('adminAreasPage.actions.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
