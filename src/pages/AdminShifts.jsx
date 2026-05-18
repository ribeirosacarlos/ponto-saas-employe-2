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
import { AppTopBar } from '../components/ui/AppTopBar'
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

const toHHmm = (value) => {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  if (!str) return null
  const [hours = '', minutes = '00'] = str.split(':')
  if (hours === '' && minutes === '') return null
  const hNum = Number.parseInt(hours, 10)
  const mNum = Number.parseInt(minutes, 10)
  if (!Number.isFinite(hNum) || !Number.isFinite(mNum)) return null
  const h = String(hNum).padStart(2, '0').slice(-2)
  const m = String(mNum).padStart(2, '0').slice(0, 2)
  return `${h}:${m}`
}

const timeToMinutes = (value) => {
  const normalized = toHHmm(value)
  if (!normalized) return null
  const [hours = '0', minutes = '0'] = normalized.split(':')
  const total = Number(hours) * 60 + Number(minutes)
  return Number.isFinite(total) ? total : null
}

const computeWindowMinutes = (start, end) => {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null
  return endMinutes - startMinutes
}

const formatMinutesToHHmm = (minutes) => {
  if (minutes === null || minutes === undefined || minutes === '') return ''
  const total = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = String(Math.floor(total / 60)).padStart(2, '0')
  const mins = String(total % 60).padStart(2, '0')
  return `${hours}:${mins}`
}

const syncScheduledMinutes = (currentScheduled, previousStart, previousEnd, nextStart, nextEnd) => {
  const nextWindow = computeWindowMinutes(nextStart, nextEnd)
  if (nextWindow === null) return currentScheduled
  if (currentScheduled === null || currentScheduled === undefined || currentScheduled === '') {
    return nextWindow
  }
  const numericScheduled = Number(currentScheduled)
  if (!Number.isFinite(numericScheduled)) return nextWindow
  return Math.min(Math.max(0, numericScheduled), nextWindow)
}

const clampScheduledMinutesToWindow = (scheduledMinutes, start, end) => {
  if (scheduledMinutes === null || scheduledMinutes === undefined || scheduledMinutes === '') return null
  const windowMinutes = computeWindowMinutes(start, end)
  const numericScheduled = Number(scheduledMinutes)
  if (!Number.isFinite(numericScheduled)) return windowMinutes
  if (windowMinutes === null) return Math.max(0, numericScheduled)
  return Math.min(Math.max(0, numericScheduled), windowMinutes)
}

const buildDefaultDay = (weekday, useWorkingDefaults = true) => {
  const working = useWorkingDefaults && weekday <= 5
  return {
    weekday,
    is_working_day: working,
    start_time: working ? '09:00' : '',
    end_time: working ? '18:00' : '',
    scheduled_minutes: working ? computeWindowMinutes('09:00', '18:00') : null,
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

  const start_time = toHHmm(source.start_time ?? source.startTime ?? '') || ''
  const end_time = toHHmm(source.end_time ?? source.endTime ?? '') || ''
  const scheduled_minutes =
    source.scheduled_minutes ?? source.scheduledMinutes ?? source.planned_minutes ?? null
  const break_start_time = toHHmm(source.break_start_time ?? source.breakStartTime ?? '') || ''
  const break_end_time = toHHmm(source.break_end_time ?? source.breakEndTime ?? '') || ''
  const break_minutes = source.break_minutes ?? source.breakMinutes ?? null

  return {
    weekday,
    is_working_day: Boolean(working),
    start_time,
    end_time,
    scheduled_minutes:
      scheduled_minutes === null || scheduled_minutes === undefined || scheduled_minutes === ''
        ? null
        : Number(scheduled_minutes),
    break_start_time,
    break_end_time,
    break_minutes,
  }
}

const buildShiftForm = (shift = null) => {
  const sourceDays = shift?.shift_days ?? shift?.days ?? []
  const mergedDays = WEEK_DAYS.map((day) => {
    const match = sourceDays.find((item) => Number(item.weekday ?? item.day) === day.value)
    if (match) return normalizeDayFromSource(match, day.value)
    return shift
      ? buildDefaultDay(day.value, false) // edição: não ativar dia sem horário salvo
      : buildDefaultDay(day.value)
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
    const formatTime = (value) => {
      const normalized = toHHmm(value)
      return normalized || null
    }

    return {
      weekday,
      is_working_day: working,
      start_time: working ? formatTime(day.start_time) : null,
      end_time: working ? formatTime(day.end_time) : null,
      scheduled_minutes: working ? toNumber(day.scheduled_minutes) : null,
      break_start_time: working ? formatTime(day.break_start_time) : null,
      break_end_time: working ? formatTime(day.break_end_time) : null,
      break_minutes: working ? toNumber(day.break_minutes) : null,
    }
  }),
})

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

const formatScheduledLabel = (scheduledMinutes, start, end) => {
  if (scheduledMinutes !== null && scheduledMinutes !== undefined) {
    return formatMinutesToHHmm(scheduledMinutes)
  }
  const automaticMinutes = computeWindowMinutes(start, end)
  if (automaticMinutes === null) return 'Automático'
  return `Automático (${formatMinutesToHHmm(automaticMinutes)})`
}

const buildTemplateFromDays = (days = []) => {
  const firstWorking = days.find((day) => day.is_working_day) || buildDefaultDay(1)
  return {
    start_time: firstWorking.start_time || '09:00',
    end_time: firstWorking.end_time || '18:00',
    scheduled_minutes:
      firstWorking.scheduled_minutes ?? computeWindowMinutes(firstWorking.start_time, firstWorking.end_time),
    break_start_time: firstWorking.break_start_time || '12:00',
    break_end_time: firstWorking.break_end_time || '13:00',
    break_minutes: firstWorking.break_minutes ?? 60,
  }
}

const areWorkingDaysUniform = (days = []) => {
  const workingDays = days.filter((day) => day.is_working_day)
  if (workingDays.length <= 1) return true
  const [firstDay] = workingDays
  return workingDays.every(
    (day) =>
      day.start_time === firstDay.start_time &&
      day.end_time === firstDay.end_time &&
      (day.scheduled_minutes ?? null) === (firstDay.scheduled_minutes ?? null) &&
      day.break_start_time === firstDay.break_start_time &&
      day.break_end_time === firstDay.break_end_time &&
      (day.break_minutes ?? null) === (firstDay.break_minutes ?? null),
  )
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
  const [useWeeklyTemplate, setUseWeeklyTemplate] = useState(true)
  const [weeklyTemplate, setWeeklyTemplate] = useState(() => buildTemplateFromDays(buildShiftForm().days))
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
    const nextForm = buildShiftForm()
    setFormMode('create')
    setFormState(nextForm)
    setUseWeeklyTemplate(true)
    setWeeklyTemplate(buildTemplateFromDays(nextForm.days))
    setDialogOpen(true)
  }

  const handleOpenEdit = (shift) => {
    const nextForm = buildShiftForm(shift)
    setFormMode('edit')
    setFormState(nextForm)
    setUseWeeklyTemplate(areWorkingDaysUniform(nextForm.days))
    setWeeklyTemplate(buildTemplateFromDays(nextForm.days))
    setDialogOpen(true)
  }

  const applyTemplateToDays = useCallback((days, template) => {
    return days.map((day) => {
      if (!day.is_working_day) return day
      return {
        ...day,
        start_time: template.start_time,
        end_time: template.end_time,
        scheduled_minutes: clampScheduledMinutesToWindow(
          template.scheduled_minutes,
          template.start_time,
          template.end_time,
        ),
        break_start_time: template.break_start_time,
        break_end_time: template.break_end_time,
        break_minutes: template.break_minutes,
      }
    })
  }, [])

  const handleWeeklyTemplateToggle = (enabled) => {
    setUseWeeklyTemplate(enabled)
    if (!enabled) return
    setFormState((prev) => ({
      ...prev,
      days: applyTemplateToDays(prev.days, weeklyTemplate),
    }))
  }

  const handleWeeklyTemplateChange = (field, value) => {
    let nextTemplate = weeklyTemplate
    if (field === 'break_minutes') {
      nextTemplate = { ...weeklyTemplate, break_minutes: value.replace(/\D/g, '') }
    } else if (field === 'scheduled_minutes') {
      nextTemplate = {
        ...weeklyTemplate,
        scheduled_minutes: clampScheduledMinutesToWindow(
          value ? timeToMinutes(value) : null,
          weeklyTemplate.start_time,
          weeklyTemplate.end_time,
        ),
      }
    } else if (field === 'start_time' || field === 'end_time') {
      const nextStart = field === 'start_time' ? value : weeklyTemplate.start_time
      const nextEnd = field === 'end_time' ? value : weeklyTemplate.end_time
      nextTemplate = {
        ...weeklyTemplate,
        [field]: value,
        scheduled_minutes: syncScheduledMinutes(
          weeklyTemplate.scheduled_minutes,
          weeklyTemplate.start_time,
          weeklyTemplate.end_time,
          nextStart,
          nextEnd,
        ),
      }
    } else {
      nextTemplate = { ...weeklyTemplate, [field]: value }
    }

    setWeeklyTemplate(nextTemplate)
    if (!useWeeklyTemplate) return

    setFormState((prev) => ({
      ...prev,
      days: applyTemplateToDays(prev.days, nextTemplate),
    }))
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
            scheduled_minutes: null,
            break_start_time: '',
            break_end_time: '',
            break_minutes: null,
          }
        }
        const nextStart = useWeeklyTemplate ? weeklyTemplate.start_time : day.start_time || '09:00'
        const nextEnd = useWeeklyTemplate ? weeklyTemplate.end_time : day.end_time || '18:00'
        return {
          ...day,
          is_working_day: true,
          start_time: nextStart,
          end_time: nextEnd,
          scheduled_minutes: useWeeklyTemplate
            ? weeklyTemplate.scheduled_minutes
            : day.scheduled_minutes ?? computeWindowMinutes(nextStart, nextEnd),
          break_start_time: useWeeklyTemplate
            ? weeklyTemplate.break_start_time
            : day.break_start_time || '12:00',
          break_end_time: useWeeklyTemplate
            ? weeklyTemplate.break_end_time
            : day.break_end_time || '13:00',
          break_minutes: useWeeklyTemplate
            ? weeklyTemplate.break_minutes
            : day.break_minutes ?? 60,
        }
      }),
    }))
  }

  const handleDayChange = (weekday, field, value) => {
    setFormState((prev) => ({
      ...prev,
      days: prev.days.map((day) => {
        if (day.weekday !== weekday) return day
        if (field === 'break_minutes') {
          return {
            ...day,
            break_minutes: value.replace(/\D/g, ''),
          }
        }
        if (field === 'scheduled_minutes') {
          return {
            ...day,
            scheduled_minutes: clampScheduledMinutesToWindow(
              value ? timeToMinutes(value) : null,
              day.start_time,
              day.end_time,
            ),
          }
        }
        if (field === 'start_time' || field === 'end_time') {
          const nextStart = field === 'start_time' ? value : day.start_time
          const nextEnd = field === 'end_time' ? value : day.end_time
          return {
            ...day,
            [field]: value,
            scheduled_minutes: syncScheduledMinutes(
              day.scheduled_minutes,
              day.start_time,
              day.end_time,
              nextStart,
              nextEnd,
            ),
          }
        }
        return {
          ...day,
          [field]: value,
        }
      }),
    }))
  }

  const validateForm = useCallback(() => {
    const errors = []
    const weekdaySet = new Set()

    if (!formState.name.trim()) {
      errors.push({
        label: t('adminShiftsPage.form.name', { defaultValue: 'Nome da jornada' }),
        value: t('adminShiftsPage.toasts.nameRequired.description'),
      })
    }

    if (!Array.isArray(formState.days) || formState.days.length !== 7) {
      errors.push({
        label: t('adminShiftsPage.form.daysHelper', { defaultValue: 'Dias da semana' }),
        value: t('adminShiftsPage.form.validation.daysCount', {
          defaultValue: 'Envie os 7 dias completos da semana.',
        }),
      })
      return errors
    }

    formState.days.forEach((day) => {
      const weekday = Number(day.weekday)
      const dayLabel = WEEK_DAYS.find((item) => item.value === weekday)?.label || `Dia ${weekday}`

      if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
        errors.push({
          label: dayLabel,
          value: t('adminShiftsPage.form.validation.invalidWeekday', {
            defaultValue: 'O identificador do dia precisa estar entre 1 e 7.',
          }),
        })
        return
      }

      if (weekdaySet.has(weekday)) {
        errors.push({
          label: dayLabel,
          value: t('adminShiftsPage.form.validation.duplicateWeekday', {
            defaultValue: 'Cada dia da semana deve aparecer apenas uma vez.',
          }),
        })
      }
      weekdaySet.add(weekday)

      if (!day.is_working_day) return

      const startMinutes = timeToMinutes(day.start_time)
      const endMinutes = timeToMinutes(day.end_time)
      const hasBreakStart = Boolean(toHHmm(day.break_start_time))
      const hasBreakEnd = Boolean(toHHmm(day.break_end_time))
      const breakStartMinutes = timeToMinutes(day.break_start_time)
      const breakEndMinutes = timeToMinutes(day.break_end_time)
      const scheduledMinutes =
        day.scheduled_minutes === null || day.scheduled_minutes === undefined || day.scheduled_minutes === ''
          ? null
          : Number(day.scheduled_minutes)

      if (startMinutes === null || endMinutes === null) {
        errors.push({
          label: dayLabel,
          value: t('adminShiftsPage.form.validation.startEndRequired', {
            defaultValue: 'Informe início e fim da jornada para dias ativos.',
          }),
        })
        return
      }

      if (endMinutes <= startMinutes) {
        errors.push({
          label: dayLabel,
          value: t('adminShiftsPage.form.validation.invalidWindow', {
            defaultValue: 'O horário de início precisa ser menor que o horário de fim.',
          }),
        })
      }

      if (hasBreakStart !== hasBreakEnd) {
        errors.push({
          label: dayLabel,
          value: t('adminShiftsPage.form.validation.breakPair', {
            defaultValue: 'Preencha início e fim do intervalo juntos.',
          }),
        })
      }

      if (hasBreakStart && hasBreakEnd) {
        if (breakStartMinutes === null || breakEndMinutes === null || breakEndMinutes <= breakStartMinutes) {
          errors.push({
            label: dayLabel,
            value: t('adminShiftsPage.form.validation.breakOrder', {
              defaultValue: 'O intervalo precisa começar antes de terminar.',
            }),
          })
        } else if (breakStartMinutes < startMinutes || breakEndMinutes > endMinutes) {
          errors.push({
            label: dayLabel,
            value: t('adminShiftsPage.form.validation.breakInsideWindow', {
              defaultValue: 'O intervalo precisa estar dentro da janela da jornada.',
            }),
          })
        }
      }

      const windowMinutes = endMinutes - startMinutes
      if (scheduledMinutes !== null && (!Number.isFinite(scheduledMinutes) || scheduledMinutes < 0)) {
        errors.push({
          label: dayLabel,
          value: t('adminShiftsPage.form.validation.invalidWorkload', {
            defaultValue: 'A carga diária precisa ser um valor válido em HH:MM.',
          }),
        })
      } else if (scheduledMinutes !== null && scheduledMinutes > windowMinutes) {
        errors.push({
          label: dayLabel,
          value: t('adminShiftsPage.form.validation.workloadExceedsWindow', {
            defaultValue: 'A carga diária não pode ser maior que a janela da jornada.',
          }),
        })
      }
    })

    return errors
  }, [formState, t])

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

    const validationErrors = validateForm()
    if (validationErrors.length) {
      toast({
        title: t('adminShiftsPage.toasts.validation.title', {
          defaultValue: 'Revise os dados da jornada',
        }),
        description: t('adminShiftsPage.toasts.validation.description', {
          defaultValue: 'Encontramos campos inválidos antes de salvar.',
        }),
        details: validationErrors.slice(0, 6),
        variant: 'destructive',
        duration: 7000,
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
    const workingEntries = (shift?.shift_days ?? []).filter((day) => day.is_working_day)
    const workingDays = workingEntries.length
    const firstWorking = workingEntries[0]
    const isUniform = areWorkingDaysUniform(workingEntries)
    const startLabel = isUniform ? shift.start_time || firstWorking?.start_time || '' : ''
    const endLabel = isUniform ? shift.end_time || firstWorking?.end_time || '' : ''
    const breakLabel = isUniform ? formatBreakLabel(firstWorking?.break_minutes) : 'Intervalos por dia'
    const scheduledValues = workingEntries
      .map((day) => day.scheduled_minutes ?? computeWindowMinutes(day.start_time, day.end_time))
      .filter((value) => value !== null && value !== undefined)
    const firstScheduled = scheduledValues[0]
    const sameScheduled =
      scheduledValues.length > 0 && scheduledValues.every((value) => value === firstScheduled)
    const workloadLabel =
      workingEntries.length === 0
        ? ''
        : sameScheduled
          ? `Carga ${formatMinutesToHHmm(firstScheduled)}/dia`
          : 'Carga configurada por dia'
    const summaryParts = [
      isUniform ? formatRange(startLabel, endLabel) : 'Horários configurados por dia',
      workloadLabel,
      workingDays ? `${workingDays} dia(s) ativo(s)` : 'Sem dias ativos',
      breakLabel,
    ].filter(Boolean)
    const workingDayNames = workingEntries
      .map((day) => {
        const weekday = Number(day.weekday ?? day.day)
        return WEEK_DAYS.find((item) => item.value === weekday)?.short
      })
      .filter(Boolean)

    return (
      <div
        key={shift.id}
        className="rounded-lg border border-border/70 bg-card/75 px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold leading-tight">{shift.name || 'Jornada'}</p>
              {shift.is_default ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                  <ShieldCheck className="h-3 w-3" />
                  Padrão
                </span>
              ) : null}
              {shift.is_flexible ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200/80 bg-sky-500/10 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
                  Flexível
                </span>
              ) : null}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 truncate">{summaryParts.join(' • ')}</span>
            </p>
            {workingDayNames.length ? (
              <p className="text-[11px] text-muted-foreground">
                {workingDayNames.join(' • ')}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => handleOpenEdit(shift)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Detalhes
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => setDeleteTarget(shift)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (!hasManagementAccess) {
      return (
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground">
          <p className="text-base font-semibold text-foreground">
            {t('adminShiftsPage.states.noPermission')}
          </p>
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
      <AppTopBar
        icon={<CalendarClock className="h-5 w-5" />}
        eyebrow={t('sidebar.sections.admin')}
        title={t('adminShiftsPage.title')}
        subtitle={t('adminShiftsPage.subtitle')}
        actions={
          <>
            {hasManagementAccess ? (
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                {t('adminShiftsPage.actions.create')}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={loadShifts}
              disabled={loading}
              className="border-border bg-background/80"
            >
              <RefreshCcw className={cn('h-4 w-4 text-primary', loading && 'animate-spin')} />
              {t('adminShiftsPage.actions.refresh')}
            </Button>
          </>
        }
      />

      {renderContent()}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-6xl">
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

          <form
            className="dialog-scrollbar space-y-5 max-h-[70vh] overflow-y-auto pr-3 pb-4"
            onSubmit={handleSubmit}
          >
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Dias e horários</p>
                <span className="text-xs text-muted-foreground">
                  {t('adminShiftsPage.form.daysHelper')}
                </span>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t('adminShiftsPage.form.templateTitle', {
                          defaultValue: 'Mesmo horário para todos os dias ativos',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('adminShiftsPage.form.templateDescription', {
                          defaultValue:
                            'Ative para definir um único padrão. Desative para editar cada dia separadamente.',
                        })}
                      </p>
                    </div>
                    <Switch checked={useWeeklyTemplate} onCheckedChange={handleWeeklyTemplateToggle} />
                  </div>
                  {useWeeklyTemplate ? (
                    <>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
                        {formState.days.map((day) => {
                          const dayMeta = WEEK_DAYS.find((item) => item.value === day.weekday)
                          const working = Boolean(day.is_working_day)
                          return (
                            <label
                              key={`weekly-day-${day.weekday}`}
                              className={cn(
                                'flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors',
                                working
                                  ? 'border-primary/30 bg-background text-foreground'
                                  : 'border-border/70 bg-muted/30 text-muted-foreground',
                              )}
                            >
                              <span className="font-medium">{dayMeta?.short || day.weekday}</span>
                              <Switch
                                checked={working}
                                onCheckedChange={(checked) => handleToggleDay(day.weekday, checked)}
                              />
                            </label>
                          )
                        })}
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">
                          {t('adminShiftsPage.form.startLabel')}
                        </Label>
                        <Input
                          type="time"
                          value={weeklyTemplate.start_time || ''}
                          onChange={(event) =>
                            handleWeeklyTemplateChange('start_time', event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">
                          {t('adminShiftsPage.form.endLabel')}
                        </Label>
                        <Input
                          type="time"
                          value={weeklyTemplate.end_time || ''}
                          onChange={(event) =>
                            handleWeeklyTemplateChange('end_time', event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">
                          {t('adminShiftsPage.form.scheduledMinutesLabel', {
                            defaultValue: 'Carga diária',
                          })}
                        </Label>
                        <Input
                          type="time"
                          step="60"
                          value={formatMinutesToHHmm(weeklyTemplate.scheduled_minutes)}
                          onChange={(event) =>
                            handleWeeklyTemplateChange('scheduled_minutes', event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">
                          {t('adminShiftsPage.form.breakStartLabel')}
                        </Label>
                        <Input
                          type="time"
                          value={weeklyTemplate.break_start_time || ''}
                          onChange={(event) =>
                            handleWeeklyTemplateChange('break_start_time', event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">
                          {t('adminShiftsPage.form.breakEndLabel')}
                        </Label>
                        <Input
                          type="time"
                          value={weeklyTemplate.break_end_time || ''}
                          onChange={(event) =>
                            handleWeeklyTemplateChange('break_end_time', event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">
                          {t('adminShiftsPage.form.breakMinutesLabel')}
                        </Label>
                        <Input
                          inputMode="numeric"
                          placeholder="60"
                          value={weeklyTemplate.break_minutes ?? ''}
                          onChange={(event) =>
                            handleWeeklyTemplateChange('break_minutes', event.target.value)
                          }
                        />
                      </div>
                      </div>
                    </>
                  ) : null}
                </div>

                {!useWeeklyTemplate ? (
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80">
                    <div className="overflow-x-auto">
                      <div className="min-w-[1040px]">
                        <div className="grid grid-cols-[190px_110px_repeat(6,minmax(110px,1fr))] gap-3 border-b border-border/70 bg-muted/40 px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Dia
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('adminShiftsPage.form.dayActive')}
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('adminShiftsPage.form.startLabel')}
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('adminShiftsPage.form.endLabel')}
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('adminShiftsPage.form.scheduledMinutesLabel', {
                              defaultValue: 'Carga diária',
                            })}
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('adminShiftsPage.form.breakStartLabel')}
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('adminShiftsPage.form.breakEndLabel')}
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('adminShiftsPage.form.breakMinutesLabel')}
                          </div>
                        </div>

                        {formState.days.map((day, index) => {
                          const working = Boolean(day.is_working_day)
                          const dayLabel = WEEK_DAYS.find((item) => item.value === day.weekday)?.label

                          return (
                            <div
                              key={`day-${day.weekday}`}
                              className={cn(
                                'grid grid-cols-[190px_110px_repeat(6,minmax(110px,1fr))] gap-3 px-4 py-3',
                                index < formState.days.length - 1 && 'border-b border-border/60',
                                !working && 'bg-muted/20',
                              )}
                            >
                              <div className="flex min-h-11 flex-col justify-center">
                                <p className="text-sm font-semibold text-foreground">{dayLabel}</p>
                                <p className="text-xs text-muted-foreground">
                                  {working
                                    ? t('adminShiftsPage.form.dayWorking')
                                    : t('adminShiftsPage.form.dayOff')}
                                </p>
                              </div>

                              <div className="flex min-h-11 items-center">
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={working}
                                    onCheckedChange={(checked) =>
                                      handleToggleDay(day.weekday, checked)
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {working ? 'Ativo' : 'Folga'}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label className="sr-only">
                                  {dayLabel} {t('adminShiftsPage.form.startLabel')}
                                </Label>
                                <Input
                                  type="time"
                                  value={day.start_time || ''}
                                  disabled={!working}
                                  onChange={(event) =>
                                    handleDayChange(day.weekday, 'start_time', event.target.value)
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="sr-only">
                                  {dayLabel} {t('adminShiftsPage.form.endLabel')}
                                </Label>
                                <Input
                                  type="time"
                                  value={day.end_time || ''}
                                  disabled={!working}
                                  onChange={(event) =>
                                    handleDayChange(day.weekday, 'end_time', event.target.value)
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="sr-only">
                                  {dayLabel}{' '}
                                  {t('adminShiftsPage.form.scheduledMinutesLabel', {
                                    defaultValue: 'Carga diária',
                                  })}
                                </Label>
                                <Input
                                  type="time"
                                  step="60"
                                  value={formatMinutesToHHmm(day.scheduled_minutes)}
                                  disabled={!working}
                                  onChange={(event) =>
                                    handleDayChange(
                                      day.weekday,
                                      'scheduled_minutes',
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="sr-only">
                                  {dayLabel} {t('adminShiftsPage.form.breakStartLabel')}
                                </Label>
                                <Input
                                  type="time"
                                  value={day.break_start_time || ''}
                                  disabled={!working}
                                  onChange={(event) =>
                                    handleDayChange(
                                      day.weekday,
                                      'break_start_time',
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="sr-only">
                                  {dayLabel} {t('adminShiftsPage.form.breakEndLabel')}
                                </Label>
                                <Input
                                  type="time"
                                  value={day.break_end_time || ''}
                                  disabled={!working}
                                  onChange={(event) =>
                                    handleDayChange(
                                      day.weekday,
                                      'break_end_time',
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="sr-only">
                                  {dayLabel} {t('adminShiftsPage.form.breakMinutesLabel')}
                                </Label>
                                <Input
                                  inputMode="numeric"
                                  placeholder="60"
                                  value={day.break_minutes ?? ''}
                                  disabled={!working}
                                  onChange={(event) =>
                                    handleDayChange(day.weekday, 'break_minutes', event.target.value)
                                  }
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
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





