import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Menu,
  Plane,
  PlusCircle,
  UserCheck,
  X,
} from 'lucide-react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { EmployeeVacationStatusPills } from '../components/EmployeeVacationStatusPills'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useAuthStore } from '../store/useAuth'
import { useAdminVacations } from '../features/adminVacations/useAdminVacations'
import {
  approveAdminVacation,
  createAdminVacationEntry,
  rejectAdminVacation,
} from '../services/adminVacationsService'
import { createAbsence, hasEmployeePresenceOnDate } from '../services/absencesService'

const MANAGEMENT_REQUIRES = { anyOf: ['area_manager', 'admin', 'super_admin'] }

const STATUS_STYLES = {
  approved: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  pending: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  rejected: 'border-rose-200/70 bg-rose-500/10 text-rose-600',
  canceled: 'border-slate-200/70 bg-slate-100 text-slate-600',
  completed: 'border-indigo-200/70 bg-indigo-500/10 text-indigo-700',
}

const STATUS_LABELS = {
  approved: 'Aprovado',
  pending: 'Pendente',
  rejected: 'Rejeitado',
  canceled: 'Cancelado',
  completed: 'Concluido',
}

const ABSENCE_TYPES = [
  { value: 'ATESTADO_MEDICO', label: 'Atestado medico' },
  { value: 'AUSENCIA_SEM_JUSTIFICATIVA', label: 'Ausencia sem justificativa' },
  { value: 'ASSUNTOS_PESSOAIS', label: 'Assuntos pessoais' },
  { value: 'OUTROS', label: 'Outros' },
]

const buildAbsenceForm = () => ({
  type: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  comment: '',
})

const buildVacationForm = () => ({
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
})

const formatDateLabel = (value, locale) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const normalizeAbsence = (absence = {}, index = 0) => ({
  id: absence.id ?? absence.uuid ?? `absence-${index}`,
  type: absence.type ?? absence.category ?? absence.kind ?? absence.absence_type ?? '',
  comment: absence.comment ?? absence.notes ?? absence.justification ?? absence.description ?? '',
  date:
    absence.date ??
    absence.day ??
    absence.start_date ??
    absence.startDate ??
    absence.created_at ??
    '',
})

const pickBalanceValue = (balance, keys) => {
  if (!balance) return '--'
  for (const key of keys) {
    const value = balance?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return '--'
}

const pickBalanceMetric = (balance, keys) => {
  if (!balance) return null
  for (const key of keys) {
    const value = balance?.[key]
    if (value === undefined || value === null || value === '') continue
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return null
    return numeric
  }
  return null
}

const getVacationMeta = (vacations = []) => {
  const today = new Date()
  let hasFutureApproved = false
  let isOnVacation = false
  let hasRejectedRequest = false

  vacations.forEach((vacation) => {
    const status = (vacation.status || '').toLowerCase()
    if (status === 'rejected') {
      hasRejectedRequest = true
    }

    if (['in_progress', 'ongoing', 'inprogress'].includes(status)) {
      isOnVacation = true
    }

    if (status === 'approved') {
      const start = vacation.startDate ? parseISO(vacation.startDate) : null
      const end = vacation.endDate ? parseISO(vacation.endDate) : null
      if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        if (start <= today && end >= today) {
          isOnVacation = true
        } else if (start > today) {
          hasFutureApproved = true
        }
      }
    }
  })

  const vacationStatus = isOnVacation ? 'on_vacation' : hasFutureApproved ? 'scheduled' : 'none'
  return { vacationStatus, isOnVacation, hasRejectedRequest }
}

export default function AdminVacations({ sidebarOpen = false, onToggleSidebar = () => {} }) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(
    () => canRenderCard(capabilities, MANAGEMENT_REQUIRES),
    [capabilities],
  )

  const {
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
  } = useAdminVacations({ enabled: hasAccess })

  const [actionLoading, setActionLoading] = useState({})
  const [approvalTarget, setApprovalTarget] = useState(null)
  const [approvalNote, setApprovalNote] = useState('')
  const [rejectionTarget, setRejectionTarget] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionError, setRejectionError] = useState('')

  const [absenceTarget, setAbsenceTarget] = useState(null)
  const [absenceForm, setAbsenceForm] = useState(buildAbsenceForm)
  const [absenceError, setAbsenceError] = useState('')
  const [absenceSaving, setAbsenceSaving] = useState(false)
  const [presenceConflict, setPresenceConflict] = useState(null)

  const [vacationTarget, setVacationTarget] = useState(null)
  const [vacationForm, setVacationForm] = useState(buildVacationForm)
  const [vacationError, setVacationError] = useState('')
  const [vacationSaving, setVacationSaving] = useState(false)

  const [openCards, setOpenCards] = useState({})

  const pendingByUser = useMemo(() => {
    const map = {}
    pendingRequests.forEach((request) => {
      const userId =
        request.userId ?? request.user?.id ?? request.employee_id ?? request.employeeId
      if (!userId) return
      if (!map[userId]) map[userId] = []
      map[userId].push(request)
    })
    return map
  }, [pendingRequests])

  const vacationDays = useMemo(() => {
    if (!vacationForm.startDate || !vacationForm.endDate) return 0
    const start = parseISO(vacationForm.startDate)
    const end = parseISO(vacationForm.endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    if (end < start) return 0
    return differenceInCalendarDays(end, start) + 1
  }, [vacationForm.endDate, vacationForm.startDate])

  const employeesToRender = useMemo(() => {
    const map = new Map()
    employees.forEach((employee) => {
      if (!employee?.id) return
      map.set(String(employee.id), employee)
    })
    pendingRequests.forEach((request) => {
      const user = request.user || {}
      const userId =
        request.userId ?? user?.id ?? request.employee_id ?? request.employeeId
      if (!userId) return
      const key = String(userId)
      if (map.has(key)) return
      map.set(key, {
        id: userId,
        name: user?.name ?? user?.full_name ?? user?.fullName ?? 'Colaborador',
        email: user?.email ?? '',
      })
    })
    return Array.from(map.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', i18n.language),
    )
  }, [employees, pendingRequests, i18n.language])

  const renderStatusPill = (status) => {
    const normalized = (status || '').toLowerCase()
    const label = STATUS_LABELS[normalized] || status || t('vacationsPage.status.unknown', 'Desconhecido')
    const style = STATUS_STYLES[normalized] || 'border-border/60 bg-muted/70 text-muted-foreground'
    return (
      <span
        className={cn(
          'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
          style,
        )}
      >
        {label}
      </span>
    )
  }

  const handleApprove = async () => {
    if (!approvalTarget?.id) return
    const requestId = approvalTarget.id
    const userId =
      approvalTarget.userId ?? approvalTarget.user?.id ?? approvalTarget.employee_id
    setActionLoading((prev) => ({ ...prev, [requestId]: 'approve' }))
    try {
      await approveAdminVacation(requestId, approvalNote.trim() || undefined)
      toast({
        title: t('vacationsPage.actions.approveSuccessTitle', 'Solicitacao aprovada'),
        description: t(
          'vacationsPage.actions.approveSuccessDescription',
          'O periodo foi aprovado e o colaborador foi notificado.',
        ),
        variant: 'success',
      })
      removePendingRequest(requestId)
      if (userId) {
        await refreshBalanceForUser(userId)
      }
      setApprovalTarget(null)
      setApprovalNote('')
    } catch (err) {
      toast({
        title: t('vacationsPage.actions.approveErrorTitle', 'Nao foi possivel aprovar'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('vacationsPage.actions.genericError', 'Tente novamente em instantes.'),
        variant: 'error',
      })
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: '' }))
    }
  }

  const handleReject = async () => {
    if (!rejectionTarget?.id) return
    const requestId = rejectionTarget.id
    const userId =
      rejectionTarget.userId ?? rejectionTarget.user?.id ?? rejectionTarget.employee_id
    if (!rejectionReason.trim()) {
      setRejectionError(
        t('vacationsPage.actions.rejectionRequired', 'Informe a justificativa para recusar.'),
      )
      return
    }
    setRejectionError('')
    setActionLoading((prev) => ({ ...prev, [requestId]: 'reject' }))
    try {
      await rejectAdminVacation(requestId, rejectionReason.trim())
      toast({
        title: t('vacationsPage.actions.rejectSuccessTitle', 'Solicitacao recusada'),
        description: t(
          'vacationsPage.actions.rejectSuccessDescription',
          'A recusa foi registrada com a justificativa informada.',
        ),
        variant: 'success',
      })
      removePendingRequest(requestId)
      if (userId) {
        await refreshBalanceForUser(userId)
      }
      setRejectionTarget(null)
      setRejectionReason('')
    } catch (err) {
      toast({
        title: t('vacationsPage.actions.rejectErrorTitle', 'Nao foi possivel recusar'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('vacationsPage.actions.genericError', 'Tente novamente em instantes.'),
        variant: 'error',
      })
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: '' }))
    }
  }

  const handleAbsenceOpen = (employee) => {
    setAbsenceTarget(employee)
    setAbsenceForm(buildAbsenceForm())
    setAbsenceError('')
    setPresenceConflict(null)
  }

  const handleVacationOpen = (employee) => {
    setVacationTarget(employee)
    setVacationForm(buildVacationForm())
    setVacationError('')
  }

  const commitAbsence = useCallback(
    async (employee, form) => {
      if (!employee?.id) return
      setAbsenceSaving(true)
      setAbsenceError('')
      try {
        const payload = {
          user_id: employee.id,
          type: form.type,
          date: form.date,
          comment: form.comment || undefined,
        }
        // TODO: wire real absence creation once backend is available.
        const response = await createAbsence(payload)
        const normalized = normalizeAbsence({ ...payload, ...response })
        addAbsenceForUser(employee.id, normalized)
        toast({
          title: t('vacationsPage.absences.createSuccessTitle', 'Ausencia registrada'),
          description: t(
            'vacationsPage.absences.createSuccessDescription',
            'O registro foi adicionado ao historico do colaborador.',
          ),
          variant: 'success',
        })
        setAbsenceTarget(null)
        setAbsenceForm(buildAbsenceForm())
      } catch (err) {
        setAbsenceError(
          err?.response?.data?.message ||
            err?.message ||
            t('vacationsPage.absences.createError', 'Nao foi possivel registrar a ausencia.'),
        )
      } finally {
        setAbsenceSaving(false)
      }
    },
    [addAbsenceForUser, t, toast],
  )

  const handleAbsenceSubmit = async (event) => {
    event.preventDefault()
    if (!absenceTarget?.id) return
    if (!absenceForm.type || !absenceForm.date) {
      setAbsenceError(
        t('vacationsPage.absences.formError', 'Selecione o tipo e a data da ausencia.'),
      )
      return
    }

    try {
      const hasPresence = await hasEmployeePresenceOnDate({
        userId: absenceTarget.id,
        date: absenceForm.date,
      })
      if (hasPresence) {
        setPresenceConflict({ employee: absenceTarget, form: { ...absenceForm } })
        return
      }
      await commitAbsence(absenceTarget, absenceForm)
    } catch (err) {
      setAbsenceError(
        err?.response?.data?.message ||
          err?.message ||
          t('vacationsPage.absences.presenceError', 'Nao foi possivel validar a presenca.'),
      )
    }
  }

  const handleVacationSubmit = async (event) => {
    event.preventDefault()
    if (!vacationTarget?.id) return
    if (!vacationForm.startDate || !vacationForm.endDate) {
      setVacationError(
        t('vacationsPage.actions.vacationFormError', 'Selecione o periodo das ferias.'),
      )
      return
    }
    if (vacationDays <= 0) {
      setVacationError(
        t('vacationsPage.actions.vacationFormInvalid', 'Periodo informado invalido.'),
      )
      return
    }

    setVacationSaving(true)
    setVacationError('')
    try {
      const payload = {
        user_id: vacationTarget.id,
        start_date: vacationForm.startDate,
        end_date: vacationForm.endDate,
      }
      if (vacationForm.notes) {
        payload.notes = vacationForm.notes
      }
      await createAdminVacationEntry(payload)
      toast({
        title: t('vacationsPage.actions.vacationCreateSuccessTitle', 'Ferias registradas'),
        description: t(
          'vacationsPage.actions.vacationCreateSuccessDescription',
          'O periodo foi registrado para o colaborador.',
        ),
        variant: 'success',
      })
      setVacationTarget(null)
      setVacationForm(buildVacationForm())
      await refreshAll()
    } catch (err) {
      setVacationError(
        err?.response?.data?.message ||
          err?.message ||
          t('vacationsPage.actions.vacationCreateError', 'Nao foi possivel registrar as ferias.'),
      )
    } finally {
      setVacationSaving(false)
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
        <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-6 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {t('equipoPage.states.noPermissionTitle')}
            </p>
            <p className="mt-1">
              {t('equipoPage.states.noPermissionDescription', 'Voce nao tem permissao para acessar.')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border/80 bg-card/90 px-5 py-5 shadow-[0_10px_45px_-30px_rgba(62,82,152,0.35)] backdrop-blur-lg sm:px-7 sm:py-6 lg:px-8 lg:py-5">
          <div className="flex-1 min-w-[240px] max-w-full sm:max-w-xl flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80 md:h-10 md:w-10"
                onClick={onToggleSidebar}
                aria-label={t('dashboardPage.header.toggleMenu')}
                type="button"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Plane className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {t('vacationsPage.tag', 'Time off')}
                </p>
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                  {t('vacationsPage.adminTitle', 'Gestao de ferias e ausencias')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'vacationsPage.adminSubtitle',
                    'Acompanhe solicitacoes, saldos e registros por colaborador.',
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full px-4"
              onClick={refreshAll}
            >
              {t('vacationsPage.actions.refresh', 'Atualizar')}
            </Button>
          </div>
        </header>

        {(employeesError || pendingError) && !employeesLoading ? (
          <section className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 shadow-[0_18px_50px_-38px_rgba(255,82,82,0.25)] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            <p className="font-semibold">{t('vacationsPage.states.errorTitle', 'Algo deu errado')}</p>
            <p className="mt-1">{employeesError || pendingError}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 rounded-full px-3 text-xs"
              onClick={refreshAll}
            >
              {t('vacationsPage.actions.retry', 'Tentar novamente')}
            </Button>
          </section>
        ) : null}

        {employeesLoading ? (
          <section className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
              />
            ))}
          </section>
        ) : null}

        {!employeesLoading && employeesToRender.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground shadow-[0_18px_50px_-40px_rgba(62,82,152,0.35)]">
            <p className="font-semibold text-foreground">
              {t('vacationsPage.adminEmptyTitle', 'Nenhum colaborador encontrado')}
            </p>
            <p className="mt-1">
              {t(
                'vacationsPage.adminEmptyDescription',
                'Cadastre colaboradores ou verifique filtros da administracao.',
              )}
            </p>
          </section>
        ) : null}

        {!employeesLoading && employeesToRender.length > 0 ? (
          <section className="space-y-6">
            {employeesToRender.map((employee) => {
              const pendingList = pendingByUser[employee.id] || []
              const balanceState = balancesByUserId[employee.id]
              const balance = balanceState?.data || null
              const vacations = vacationsByUserId[employee.id] || []
              const vacationMeta = getVacationMeta(vacations)
              const absences = (absencesByUserId[employee.id] || [])
                .map(normalizeAbsence)
                .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
              const isOpen = openCards[employee.id] ?? false
              const daysUsed = pickBalanceMetric(balance, [
                'used',
                'used_days',
                'taken',
                'taken_days',
                'enjoyed',
                'enjoyed_days',
              ])
              const daysRemaining = pickBalanceMetric(balance, [
                'pending',
                'pending_days',
                'available',
                'available_days',
                'remaining',
                'remaining_days',
              ])
              return (
                <div
                  key={employee.id}
                  className="rounded-[28px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <UserCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {employee.name || t('equipoPage.table.emptyName', 'Colaborador')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {employee.email || employee.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full"
                        aria-expanded={isOpen}
                        aria-controls={`admin-vacations-card-${employee.id}`}
                        aria-label={
                          isOpen
                            ? t('vacationsPage.actions.collapseCard', 'Recolher')
                            : t('vacationsPage.actions.expandCard', 'Expandir')
                        }
                        onClick={() =>
                          setOpenCards((prev) => ({ ...prev, [employee.id]: !isOpen }))
                        }
                      >
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full px-4"
                        onClick={() => handleVacationOpen(employee)}
                      >
                        <CalendarRange className="h-4 w-4" />
                        {t('vacationsPage.actions.registerVacation', 'Registrar ferias')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full px-4"
                        onClick={() => handleAbsenceOpen(employee)}
                      >
                        <PlusCircle className="h-4 w-4" />
                        {t('vacationsPage.actions.registerAbsence', 'Registrar ausencia')}
                      </Button>
                      {pendingList.length > 0 ? (
                        <span className="rounded-full border border-amber-200/70 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                          {t('vacationsPage.pendingCount', '{{count}} pendentes', {
                            count: pendingList.length,
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <EmployeeVacationStatusPills
                    className="mt-3"
                    vacationStatus={vacationMeta.vacationStatus}
                    daysUsed={daysUsed}
                    daysRemaining={daysRemaining}
                    hasPendingRequest={pendingList.length > 0}
                    hasRejectedRequest={vacationMeta.hasRejectedRequest}
                    isOnVacation={vacationMeta.isOnVacation}
                  />

                  {isOpen ? (
                    <div id={`admin-vacations-card-${employee.id}`}>
                      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4">
                          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <CalendarRange className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                  {t('vacationsPage.adminRequests.tag', 'Solicitacoes')}
                                </p>
                                <h3 className="text-sm font-semibold">
                                  {t('vacationsPage.adminRequests.title', 'Solicitacoes pendentes')}
                                </h3>
                              </div>
                            </div>
                            {pendingLoading ? (
                              <span className="rounded-full border border-border/60 bg-muted/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                                {t('vacationsPage.history.loading', 'Carregando')}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 space-y-3">
                            {pendingList.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-4 py-5 text-sm text-muted-foreground">
                                <p className="font-semibold text-foreground">
                                  {t('vacationsPage.adminRequests.emptyTitle', 'Nenhuma solicitacao pendente')}
                                </p>
                                <p className="mt-1">
                                  {t(
                                    'vacationsPage.adminRequests.emptyDescription',
                                    'Quando houver pedidos, eles aparecerao aqui.',
                                  )}
                                </p>
                              </div>
                            ) : (
                              pendingList.map((request) => {
                                const startLabel = formatDateLabel(request.startDate, i18n.language)
                                const endLabel = formatDateLabel(request.endDate, i18n.language)
                                const days =
                                  request.requestedDays ||
                                  (request.startDate && request.endDate
                                    ? differenceInCalendarDays(
                                        parseISO(request.endDate),
                                        parseISO(request.startDate),
                                      ) + 1
                                    : null)
                                const isApproving = actionLoading[request.id] === 'approve'
                                const isRejecting = actionLoading[request.id] === 'reject'
                                return (
                                  <div
                                    key={request.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/90 px-4 py-4 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.2)]"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold">
                                          {startLabel && endLabel
                                            ? `${startLabel} - ${endLabel}`
                                            : t('vacationsPage.history.periodFallback', 'Periodo nao informado')}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {days
                                            ? t('vacationsPage.history.days', '{{count}} dias', { count: days })
                                            : t('vacationsPage.history.daysEmpty', 'Dias nao informados')}
                                        </p>
                                      </div>
                                      {renderStatusPill(request.status || 'pending')}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="rounded-full px-3 text-xs"
                                        disabled={isApproving || isRejecting}
                                        onClick={() => {
                                          setApprovalTarget(request)
                                          setApprovalNote('')
                                        }}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        {isApproving
                                          ? t('vacationsPage.actions.approving', 'Aprovando')
                                          : t('vacationsPage.actions.approve', 'Aprovar')}
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        className="rounded-full px-3 text-xs"
                                        disabled={isApproving || isRejecting}
                                        onClick={() => {
                                          setRejectionTarget(request)
                                          setRejectionReason('')
                                          setRejectionError('')
                                        }}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        {isRejecting
                                          ? t('vacationsPage.actions.rejecting', 'Recusando')
                                          : t('vacationsPage.actions.reject', 'Recusar')}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4">
                          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <ClipboardList className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                  {t('vacationsPage.absences.tag', 'Ausencias')}
                                </p>
                                <h3 className="text-sm font-semibold">
                                  {t('vacationsPage.absences.title', 'Ultimos 3 meses')}
                                </h3>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 space-y-3">
                            {absences.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-4 py-5 text-sm text-muted-foreground">
                                <p className="font-semibold text-foreground">
                                  {t('vacationsPage.absences.emptyTitle', 'Nenhuma ausencia registrada')}
                                </p>
                                <p className="mt-1">
                                  {t(
                                    'vacationsPage.absences.emptyDescription',
                                    'Use o botao de registro para adicionar uma ausencia.',
                                  )}
                                </p>
                              </div>
                            ) : (
                              absences.map((absence) => (
                                <div
                                  key={absence.id}
                                  className="rounded-2xl border border-border/70 bg-card/90 px-4 py-4 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.2)]"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold">
                                        {absence.type || t('vacationsPage.absences.typeFallback', 'Ausencia')}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {absence.date
                                          ? formatDateLabel(absence.date, i18n.language)
                                          : t('vacationsPage.absences.dateFallback', 'Data nao informada')}
                                      </p>
                                    </div>
                                  </div>
                                  {absence.comment ? (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {absence.comment}
                                    </p>
                                  ) : null}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </section>
        ) : null}
      </div>

      <Dialog
        open={Boolean(approvalTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setApprovalTarget(null)
            setApprovalNote('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('vacationsPage.actions.approveTitle', 'Aprovar solicitacao')}</DialogTitle>
            <DialogDescription>
              {t(
                'vacationsPage.actions.approveDescription',
                'A justificativa e opcional e sera registrada no historico.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-border/70 bg-muted/70 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">
                {approvalTarget?.startDate
                  ? `${formatDateLabel(approvalTarget.startDate, i18n.language)} - ${formatDateLabel(
                      approvalTarget.endDate,
                      i18n.language,
                    )}`
                  : t('vacationsPage.history.periodFallback', 'Periodo nao informado')}
              </p>
              {approvalTarget?.requestedDays ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('vacationsPage.history.days', '{{count}} dias', { count: approvalTarget.requestedDays })}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-note">
                {t('vacationsPage.actions.approveNoteLabel', 'Justificativa (opcional)')}
              </Label>
              <Textarea
                id="approval-note"
                value={approvalNote}
                onChange={(event) => setApprovalNote(event.target.value)}
                placeholder={t('vacationsPage.actions.approveNotePlaceholder', 'Detalhes adicionais')}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleApprove}>
                {t('vacationsPage.actions.approve', 'Aprovar')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectionTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectionTarget(null)
            setRejectionReason('')
            setRejectionError('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('vacationsPage.actions.rejectTitle', 'Recusar solicitacao')}</DialogTitle>
            <DialogDescription>
              {t(
                'vacationsPage.actions.rejectDescription',
                'Informe o motivo para manter o historico atualizado.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                {t('vacationsPage.actions.rejectReasonLabel', 'Justificativa obrigatoria')}
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder={t(
                  'vacationsPage.actions.rejectReasonPlaceholder',
                  'Descreva o motivo da recusa',
                )}
              />
              {rejectionError ? (
                <p className="text-xs font-semibold text-rose-500">{rejectionError}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="button" variant="destructive" onClick={handleReject}>
                {t('vacationsPage.actions.reject', 'Recusar')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(vacationTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setVacationTarget(null)
            setVacationForm(buildVacationForm())
            setVacationError('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('vacationsPage.actions.vacationCreateTitle', 'Registrar ferias')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'vacationsPage.actions.vacationCreateDescription',
                'Defina o periodo que sera registrado para o colaborador.',
              )}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 pt-2" onSubmit={handleVacationSubmit}>
            <div className="rounded-2xl border border-border/70 bg-muted/70 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">
                {vacationTarget?.name || t('equipoPage.table.emptyName', 'Colaborador')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {vacationTarget?.email || vacationTarget?.id}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-vacation-start">
                  {t('vacationsPage.request.start', 'Data inicio')}
                </Label>
                <Input
                  id="admin-vacation-start"
                  type="date"
                  value={vacationForm.startDate}
                  onChange={(event) =>
                    setVacationForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-vacation-end">
                  {t('vacationsPage.request.end', 'Data fim')}
                </Label>
                <Input
                  id="admin-vacation-end"
                  type="date"
                  value={vacationForm.endDate}
                  onChange={(event) =>
                    setVacationForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-vacation-notes">
                {t('vacationsPage.request.notes', 'Observacoes')}
              </Label>
              <Textarea
                id="admin-vacation-notes"
                value={vacationForm.notes}
                onChange={(event) =>
                  setVacationForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder={t('vacationsPage.request.notesPlaceholder', 'Opcional')}
              />
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/70 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">
                {t('vacationsPage.request.summary', 'Resumo da solicitacao')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {vacationDays
                  ? t('vacationsPage.request.days', '{{count}} dias solicitados', { count: vacationDays })
                  : t('vacationsPage.request.daysEmpty', 'Selecione o periodo para calcular.')}
              </p>
            </div>
            {vacationError ? (
              <p className="text-xs font-semibold text-rose-500">{vacationError}</p>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={vacationSaving} className="min-w-[160px]">
                {vacationSaving
                  ? t('vacationsPage.actions.saving', 'Salvando')
                  : t('vacationsPage.actions.registerVacation', 'Registrar ferias')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(absenceTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAbsenceTarget(null)
            setAbsenceForm(buildAbsenceForm())
            setAbsenceError('')
            setPresenceConflict(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('vacationsPage.absences.createTitle', 'Registrar ausencia')}</DialogTitle>
            <DialogDescription>
              {t(
                'vacationsPage.absences.createDescription',
                'Registre uma ausencia manualmente para este colaborador.',
              )}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 pt-2" onSubmit={handleAbsenceSubmit}>
            <div className="space-y-2">
              <Label htmlFor="absence-type">{t('vacationsPage.absences.typeLabel', 'Tipo')}</Label>
              <select
                id="absence-type"
                value={absenceForm.type}
                onChange={(event) =>
                  setAbsenceForm((prev) => ({ ...prev, type: event.target.value }))
                }
                className="h-12 w-full rounded-xl border border-border/80 bg-background/80 px-4 text-sm text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">{t('vacationsPage.absences.typePlaceholder', 'Selecione o tipo')}</option>
                {ABSENCE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="absence-date">{t('vacationsPage.absences.dateLabel', 'Data')}</Label>
              <input
                id="absence-date"
                type="date"
                value={absenceForm.date}
                onChange={(event) =>
                  setAbsenceForm((prev) => ({ ...prev, date: event.target.value }))
                }
                className="flex h-12 w-full rounded-xl border border-border/80 bg-background/80 px-4 py-2 text-sm text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="absence-comment">
                {t('vacationsPage.absences.commentLabel', 'Comentario')}
              </Label>
              <Textarea
                id="absence-comment"
                value={absenceForm.comment}
                onChange={(event) =>
                  setAbsenceForm((prev) => ({ ...prev, comment: event.target.value }))
                }
                placeholder={t('vacationsPage.absences.commentPlaceholder', 'Opcional')}
              />
            </div>
            {absenceError ? (
              <p className="text-xs font-semibold text-rose-500">{absenceError}</p>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={absenceSaving} className="min-w-[160px]">
                {absenceSaving
                  ? t('vacationsPage.absences.saving', 'Salvando')
                  : t('vacationsPage.absences.save', 'Registrar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(presenceConflict)}
        onOpenChange={(open) => {
          if (!open) setPresenceConflict(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('vacationsPage.absences.alertTitle', 'Atencao')}</DialogTitle>
            <DialogDescription>
              {t(
                'vacationsPage.absences.alertDescription',
                'Este colaborador possui registro de presenca nesta data. Deseja continuar mesmo assim?',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-500/10 px-4 py-4 text-sm text-amber-700">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {t('vacationsPage.absences.alertCopy', 'Registro de presenca encontrado')}
                </p>
                <p className="mt-1 text-xs text-amber-700/80">
                  {presenceConflict?.form?.date
                    ? formatDateLabel(presenceConflict.form.date, i18n.language)
                    : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.actions.cancel', 'Cancelar')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={async () => {
                if (!presenceConflict?.employee || !presenceConflict?.form) return
                await commitAbsence(presenceConflict.employee, presenceConflict.form)
                setPresenceConflict(null)
              }}
            >
              {t('vacationsPage.absences.confirmAnyway', 'Confirmar mesmo assim')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
