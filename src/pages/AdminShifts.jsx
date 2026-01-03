import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  Pencil,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { PageContainer } from '../components/ui/PageContainer'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { createShift, deleteShift, listShifts, updateShift } from '../services/modules/shifts'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'

const WEEK_DAYS = [
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
]

const MANAGEMENT_REQUIRES = { anyOf: ['area_manager', 'admin', 'super_admin'] }

const buildDefaultDay = (weekday) => {
  const working = weekday <= 5
  return {
    weekday,
    is_working_day: working,
    start_time: working ? '09:00' : '',
    end_time: working ? '18:00' : '',
    break_start_time: working ? '12:00' : '',
    break_end_time: working ? '13:00' : '',
    break_minutes: working ? 60 : null,
  }
}

const normalizeDayFromSource = (source = {}, weekday) => {
  const working =
    source.is_working_day ??
    source.isWorkingDay ??
    source.working_day ??
    source.workingDay ??
    source.enabled ??
    false

  const defaults = buildDefaultDay(weekday)

  return {
    weekday,
    is_working_day: Boolean(working),
    start_time: source.start_time ?? source.startTime ?? defaults.start_time,
    end_time: source.end_time ?? source.endTime ?? defaults.end_time,
    break_start_time: source.break_start_time ?? source.breakStartTime ?? defaults.break_start_time,
    break_end_time: source.break_end_time ?? source.breakEndTime ?? defaults.break_end_time,
    break_minutes: source.break_minutes ?? source.breakMinutes ?? defaults.break_minutes,
  }
}

const buildShiftForm = (shift = null) => {
  const sourceDays = shift?.shift_days ?? shift?.days ?? []
  const mergedDays = WEEK_DAYS.map((day) => {
    const match = sourceDays.find((item) => Number(item.weekday ?? item.day) === day.value)
    if (match) return normalizeDayFromSource(match, day.value)
    return buildDefaultDay(day.value)
  })

  return {
    id: shift?.id ?? '',
    name: shift?.name ?? '',
    is_flexible: Boolean(shift?.is_flexible),
    is_default: Boolean(shift?.is_default),
    days: mergedDays,
  }
}

const buildPayload = (form) => ({
  name: form.name?.trim() || '',
  is_flexible: Boolean(form.is_flexible),
  is_default: Boolean(form.is_default),
  days: (form.days || []).map((day, index) => {
    const weekday = Number(day.weekday ?? index + 1)
    const working = Boolean(day.is_working_day)
    const toNumber = (value) => {
      if (value === null || value === undefined || value === '') return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    return {
      weekday,
      is_working_day: working,
      start_time: working ? day.start_time || null : null,
      end_time: working ? day.end_time || null : null,
      break_start_time: working ? day.break_start_time || null : null,
      break_end_time: working ? day.break_end_time || null : null,
      break_minutes: working ? toNumber(day.break_minutes) : null,
    }
  }),
})

const findDay = (shift, weekday) =>
  (shift?.shift_days ?? shift?.days ?? []).find(
    (day) => Number(day.weekday ?? day.day) === weekday,
  )

const formatRange = (start, end) => {
  if (!start && !end) return 'Horário não definido'
  if (!start || !end) return `${start || '--:--'} - ${end || '--:--'}`
  return `${start} - ${end}`
}

const formatBreakLabel = (minutes) => {
  if (minutes === 0) return 'Sem intervalo'
  if (!minutes) return ''
  return `${minutes} min de intervalo`
}

export default function AdminShifts({ sidebarOpen = false, onToggleSidebar = () => {} }) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasManagementAccess = useMemo(
    () => canRenderCard(capabilities, MANAGEMENT_REQUIRES),
    [capabilities],
  )

  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [formState, setFormState] = useState(() => buildShiftForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadShifts = useCallback(async () => {
    if (!hasManagementAccess) return
    setLoading(true)
    setError('')
    try {
      const response = await listShifts()
      const items = Array.isArray(response?.data) ? response.data : response || []
      setShifts(items)
    } catch (err) {
      console.error('[AdminShifts] list error', err)
      setError('Não foi possível carregar as jornadas agora.')
    } finally {
      setLoading(false)
    }
  }, [hasManagementAccess])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  const handleOpenCreate = () => {
    setFormMode('create')
    setFormState(buildShiftForm())
    setDialogOpen(true)
  }

  const handleOpenEdit = (shift) => {
    setFormMode('edit')
    setFormState(buildShiftForm(shift))
    setDialogOpen(true)
  }

  const handleToggleDay = (weekday, enabled) => {
    setFormState((prev) => ({
      ...prev,
      days: prev.days.map((day) => {
        if (day.weekday !== weekday) return day
        if (!enabled) {
          return {
            ...day,
            is_working_day: false,
            start_time: '',
            end_time: '',
            break_start_time: '',
            break_end_time: '',
            break_minutes: null,
          }
        }
        return {
          ...day,
          is_working_day: true,
          start_time: day.start_time || '09:00',
          end_time: day.end_time || '18:00',
          break_start_time: day.break_start_time || '12:00',
          break_end_time: day.break_end_time || '13:00',
          break_minutes: day.break_minutes ?? 60,
        }
      }),
    }))
  }

  const handleDayChange = (weekday, field, value) => {
    setFormState((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.weekday === weekday
          ? {
              ...day,
              [field]: field === 'break_minutes' ? value.replace(/\D/g, '') : value,
            }
          : day,
      ),
    }))
  }

  const handleSubmit = async (event) => {
    event?.preventDefault?.()
    if (!formState.name.trim()) {
      toast({
        title: t('adminShiftsPage.toasts.nameRequired.title'),
        description: t('adminShiftsPage.toasts.nameRequired.description'),
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = buildPayload(formState)
      const saved =
        formMode === 'edit' && formState.id
          ? await updateShift(formState.id, payload)
          : await createShift(payload)

      setShifts((prev) => {
        if (formMode === 'edit') {
          return prev.map((item) => (item.id === saved.id ? saved : item))
        }
        return [saved, ...prev]
      })

      toast({
        title:
          formMode === 'edit'
            ? t('adminShiftsPage.toasts.updated.title')
            : t('adminShiftsPage.toasts.created.title'),
        description:
          formMode === 'edit'
            ? t('adminShiftsPage.toasts.updated.description')
            : t('adminShiftsPage.toasts.created.description'),
      })
      setDialogOpen(false)
    } catch (err) {
      console.error('[AdminShifts] save error', err)
      toast({
        title: t('adminShiftsPage.toasts.saveError.title'),
        description: t('adminShiftsPage.toasts.saveError.description'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return
    setDeleting(true)
    try {
      await deleteShift(deleteTarget.id)
      setShifts((prev) => prev.filter((shift) => shift.id !== deleteTarget.id))
      toast({
        title: t('adminShiftsPage.toasts.deleted.title'),
        description: t('adminShiftsPage.toasts.deleted.description', {
          name: deleteTarget.name || t('adminShiftsPage.dialog.selectedFallback'),
        }),
      })
    } catch (err) {
      console.error('[AdminShifts] delete error', err)
      toast({
        title: t('adminShiftsPage.toasts.deleteError.title'),
        description: t('adminShiftsPage.toasts.deleteError.description'),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const renderShiftCard = (shift) => {
    const workingDays = (shift?.shift_days ?? []).filter((day) => day.is_working_day).length
    const firstWorking = (shift?.shift_days ?? []).find((day) => day.is_working_day)
    const startLabel = shift.start_time || firstWorking?.start_time || ''
    const endLabel = shift.end_time || firstWorking?.end_time || ''

    return (
      <div
        key={shift.id}
        className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold leading-tight">{shift.name || 'Jornada'}</p>
              {shift.is_default ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Padrão
                </span>
              ) : null}
              {shift.is_flexible ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200/80 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-700">
                  Flexível
                </span>
              ) : null}
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              {formatRange(startLabel, endLabel)}
            </p>
            <p className="text-xs text-muted-foreground">
              {workingDays || 0} dia(s) ativos na semana
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(shift)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(shift)}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {WEEK_DAYS.map((day) => {
            const dayData = findDay(shift, day.value) || {}
            const working = Boolean(dayData?.is_working_day)
            return (
              <div
                key={`${shift.id}-${day.value}`}
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs transition',
                  working
                    ? 'border-emerald-200/70 bg-emerald-500/5 text-emerald-800'
                    : 'border-border/70 bg-muted/40 text-muted-foreground',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{day.short}</span>
                  <span className="text-[11px] font-medium">
                    {working ? 'Ativo' : 'Folga'}
                  </span>
                </div>
                {working ? (
                  <div className="mt-1 text-[11px] leading-relaxed text-foreground">
                    {formatRange(dayData.start_time, dayData.end_time)}
                    {formatBreakLabel(dayData.break_minutes) ? (
                      <span className="block text-[10px] text-emerald-700/90">
                        {formatBreakLabel(dayData.break_minutes)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (!hasManagementAccess) {
      return (
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground">
          {t('adminShiftsPage.states.noPermission')}
        </div>
      )
    }

    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`shift-skeleton-${index}`}
              className="animate-pulse rounded-2xl border border-border/70 bg-card/80 p-4"
            >
              <div className="h-5 w-1/3 rounded-full bg-muted" />
              <div className="mt-3 h-3 w-1/2 rounded-full bg-muted/80" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="h-10 rounded-xl bg-muted/70" />
                <div className="h-10 rounded-xl bg-muted/70" />
                <div className="h-10 rounded-xl bg-muted/70" />
                <div className="h-10 rounded-xl bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="space-y-2">
              <p>{error}</p>
              <Button size="sm" variant="outline" onClick={loadShifts}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      )
    }

    if (!shifts.length) {
      return (
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold text-foreground">
                {t('adminShiftsPage.states.emptyTitle')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('adminShiftsPage.states.emptyDescription')}
              </p>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              {t('adminShiftsPage.actions.create')}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shifts.map((shift) => renderShiftCard(shift))}
      </div>
    )
  }

  return (
    <PageContainer className="py-5 sm:py-6 space-y-6">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-sm">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent" />
          <div className="relative flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <CalendarClock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-tight text-primary">
                  Administração
                </p>
                <h1 className="text-2xl font-bold leading-tight text-foreground">
                  {t('adminShiftsPage.title')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('adminShiftsPage.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadShifts} disabled={loading}>
                <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
                {t('adminShiftsPage.actions.refresh')}
              </Button>
              <Button size="md" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                {t('adminShiftsPage.actions.create')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {renderContent()}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'edit'
                ? t('adminShiftsPage.dialog.editTitle')
                : t('adminShiftsPage.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('adminShiftsPage.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shift-name">{t('adminShiftsPage.form.name')}</Label>
                <Input
                  id="shift-name"
                  placeholder={t('adminShiftsPage.form.namePlaceholder')}
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3 text-sm">
                <label className="flex items-center justify-between gap-2">
                  <span>{t('adminShiftsPage.form.default')}</span>
                  <Switch
                    checked={formState.is_default}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({ ...prev, is_default: checked }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span>{t('adminShiftsPage.form.flexible')}</span>
                  <Switch
                    checked={formState.is_flexible}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({ ...prev, is_flexible: checked }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Dias e horários</p>
                <span className="text-xs text-muted-foreground">
                  {t('adminShiftsPage.form.daysHelper')}
                </span>
              </div>
              <div className="space-y-3">
                {formState.days.map((day) => {
                  const working = Boolean(day.is_working_day)
                  const dayLabel = WEEK_DAYS.find((item) => item.value === day.weekday)?.label
                  return (
                    <div
                      key={`day-${day.weekday}`}
                      className="rounded-2xl border border-border/70 bg-card/80 p-3 sm:p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{dayLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {working
                              ? t('adminShiftsPage.form.dayWorking')
                              : t('adminShiftsPage.form.dayOff')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {t('adminShiftsPage.form.dayActive')}
                          </span>
                          <Switch
                            checked={working}
                            onCheckedChange={(checked) => handleToggleDay(day.weekday, checked)}
                          />
                        </div>
                      </div>
                      {working ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              {t('adminShiftsPage.form.startLabel')}
                            </Label>
                            <Input
                              type="time"
                              value={day.start_time || ''}
                              onChange={(event) =>
                                handleDayChange(day.weekday, 'start_time', event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              {t('adminShiftsPage.form.endLabel')}
                            </Label>
                            <Input
                              type="time"
                              value={day.end_time || ''}
                              onChange={(event) =>
                                handleDayChange(day.weekday, 'end_time', event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              {t('adminShiftsPage.form.breakStartLabel')}
                            </Label>
                            <Input
                              type="time"
                              value={day.break_start_time || ''}
                              onChange={(event) =>
                                handleDayChange(day.weekday, 'break_start_time', event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              {t('adminShiftsPage.form.breakEndLabel')}
                            </Label>
                            <Input
                              type="time"
                              value={day.break_end_time || ''}
                              onChange={(event) =>
                                handleDayChange(day.weekday, 'break_end_time', event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              {t('adminShiftsPage.form.breakMinutesLabel')}
                            </Label>
                            <Input
                              inputMode="numeric"
                              placeholder="60"
                              value={day.break_minutes ?? ''}
                              onChange={(event) =>
                                handleDayChange(day.weekday, 'break_minutes', event.target.value)
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t('common.actions.cancel', { defaultValue: 'Cancelar' })}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving
                  ? t('common.actions.saving', { defaultValue: 'Salvando...' })
                  : formMode === 'edit'
                    ? t('common.actions.saveChanges', { defaultValue: 'Salvar alterações' })
                    : t('adminShiftsPage.actions.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover jornada</DialogTitle>
            <DialogDescription>
              {t('adminShiftsPage.dialog.deleteDescription', {
                name: deleteTarget?.name || t('adminShiftsPage.dialog.selectedFallback'),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">
                {t('common.actions.cancel', { defaultValue: 'Cancelar' })}
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting
                ? t('common.actions.removing', { defaultValue: 'Removendo...' })
                : t('adminShiftsPage.dialog.deleteConfirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
