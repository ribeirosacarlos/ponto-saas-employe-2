import { useCallback, useEffect, useMemo, useState } from 'react'
import { addYears, differenceInCalendarDays, format, parseISO, subMonths } from 'date-fns'
import { CalendarDays, CalendarRange, Loader2, Plane } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
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
import { PageContainer } from '../components/ui/PageContainer'
import {
  cancelEmployeeVacation,
  getEmployeeVacationBalance,
  listEmployeeVacations,
  requestEmployeeVacation,
} from '../services/vacationsService'
import { listEmployeeAbsences } from '../services/absencesService'

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
  status: absence.status ?? absence.state ?? '',
  startDate: absence.start_date ?? absence.startDate ?? absence.date ?? absence.day ?? '',
  endDate: absence.end_date ?? absence.endDate ?? absence.date ?? absence.day ?? '',
})

export default function Vacations() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()

  const [balance, setBalance] = useState(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [vacations, setVacations] = useState([])
  const [vacationsLoading, setVacationsLoading] = useState(false)
  const [absences, setAbsences] = useState([])
  const [absencesLoading, setAbsencesLoading] = useState(false)
  const [error, setError] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [cancelingId, setCancelingId] = useState('')
  const [requestForm, setRequestForm] = useState({
    startDate: '',
    endDate: '',
    notes: '',
  })

  const minDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const maxDate = useMemo(() => format(addYears(new Date(), 1), 'yyyy-MM-dd'), [])

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true)
    setError('')
    try {
      const data = await getEmployeeVacationBalance()
      setBalance(data || null)
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t('vacationsPage.states.balanceError', 'Nao foi possivel carregar o saldo.'),
      )
    } finally {
      setBalanceLoading(false)
    }
  }, [t])

  const loadVacations = useCallback(async () => {
    setVacationsLoading(true)
    setError('')
    try {
      const response = await listEmployeeVacations({ page: 1 })
      setVacations(response.data || [])
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t('vacationsPage.states.listError', 'Nao foi possivel carregar as ferias.'),
      )
    } finally {
      setVacationsLoading(false)
    }
  }, [t])

  const loadAbsences = useCallback(async () => {
    setAbsencesLoading(true)
    try {
      const today = new Date()
      const from = format(subMonths(today, 3), 'yyyy-MM-dd')
      const to = format(today, 'yyyy-MM-dd')
      const response = await listEmployeeAbsences({ from, to, page: 1, perPage: 20 })
      const normalized = (response.data || []).map(normalizeAbsence)
      setAbsences(
        normalized.sort((a, b) => {
          const left = new Date(a.startDate || 0).getTime()
          const right = new Date(b.startDate || 0).getTime()
          return right - left
        }),
      )
    } catch (err) {
      setAbsences([])
    } finally {
      setAbsencesLoading(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadBalance(), loadVacations(), loadAbsences()])
  }, [loadBalance, loadVacations, loadAbsences])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const upcomingVacation = useMemo(() => {
    const today = new Date()
    return vacations
      .filter((vacation) => {
        if (!vacation.startDate) return false
        const startDate = parseISO(vacation.startDate)
        if (Number.isNaN(startDate.getTime())) return false
        if (startDate < today) return false
        return ['approved', 'pending'].includes(vacation.status)
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]
  }, [vacations])

  const requestedDays = useMemo(() => {
    if (!requestForm.startDate || !requestForm.endDate) return 0
    const start = parseISO(requestForm.startDate)
    const end = parseISO(requestForm.endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    if (end < start) return 0
    return differenceInCalendarDays(end, start) + 1
  }, [requestForm.endDate, requestForm.startDate])

  const validateRequest = () => {
    if (!requestForm.startDate || !requestForm.endDate) {
      return t('vacationsPage.request.errors.missing', 'Selecione o periodo desejado.')
    }
    const start = parseISO(requestForm.startDate)
    const end = parseISO(requestForm.endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return t('vacationsPage.request.errors.invalid', 'Periodo invalido.')
    }
    const today = parseISO(minDate)
    const limit = parseISO(maxDate)
    if (start < today || end < today) {
      return t('vacationsPage.request.errors.past', 'Nao e permitido selecionar datas passadas.')
    }
    if (start > limit || end > limit) {
      return t(
        'vacationsPage.request.errors.limit',
        'Nao e permitido selecionar datas alem de 1 ano.',
      )
    }
    if (start > end) {
      return t('vacationsPage.request.errors.range', 'Data inicial maior que data final.')
    }
    return ''
  }

  const handleRequestSubmit = async (event) => {
    event.preventDefault()
    const validation = validateRequest()
    if (validation) {
      setRequestError(validation)
      return
    }
    const available = Number(balance?.available ?? balance?.available_days ?? balance?.days ?? 0)
    if (available && requestedDays > available) {
      setRequestError(
        t('vacationsPage.request.errors.balance', 'Saldo insuficiente para este periodo.'),
      )
      return
    }

    setRequesting(true)
    setRequestError('')
    try {
      await requestEmployeeVacation({
        start_date: requestForm.startDate,
        end_date: requestForm.endDate,
        notes: requestForm.notes || undefined,
      })
      toast({
        title: t('vacationsPage.request.successTitle', 'Solicitacao enviada'),
        description: t(
          'vacationsPage.request.successDescription',
          'Sua solicitacao de ferias foi enviada.',
        ),
        variant: 'success',
      })
      setRequestOpen(false)
      setRequestForm({ startDate: '', endDate: '', notes: '' })
      await refreshAll()
    } catch (err) {
      setRequestError(
        err?.response?.data?.message ||
          err?.message ||
          t('vacationsPage.request.errors.send', 'Nao foi possivel enviar a solicitacao.'),
      )
    } finally {
      setRequesting(false)
    }
  }

  const handleCancel = async (vacationId) => {
    if (!vacationId) return
    setCancelingId(vacationId)
    try {
      await cancelEmployeeVacation(vacationId)
      toast({
        title: t('vacationsPage.cancel.successTitle', 'Solicitacao cancelada'),
        description: t(
          'vacationsPage.cancel.successDescription',
          'A solicitacao pendente foi cancelada.',
        ),
        variant: 'success',
      })
      await loadVacations()
      await loadBalance()
    } catch (err) {
      toast({
        title: t('vacationsPage.cancel.errorTitle', 'Nao foi possivel cancelar'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('vacationsPage.cancel.errorDescription', 'Tente novamente em instantes.'),
        variant: 'error',
      })
    } finally {
      setCancelingId('')
    }
  }

  const renderStatusPill = (status) => {
    const normalized = (status || '').toLowerCase()
    const label = STATUS_LABELS[normalized] || status || t('vacationsPage.status.unknown', 'Desconhecido')
    const style = STATUS_STYLES[normalized] || 'border-border/60 bg-muted/70 text-muted-foreground'
    return (
      <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]', style)}>
        {label}
      </span>
    )
  }

  return (
    <div className="relative min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="relative z-10 flex flex-col gap-6 py-6">
          <header className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-6 shadow-[0_18px_90px_-60px_rgba(62,82,152,0.55)] backdrop-blur-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Plane className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      {t('vacationsPage.tag', 'Time off')}
                    </p>
                    <h1 className="text-2xl font-semibold leading-tight">
                      {t('vacationsPage.title', 'Ferias e ausencias')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {t('vacationsPage.subtitle', 'Acompanhe saldo, solicitacoes e ausencias recentes.')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  className="rounded-full px-5"
                  onClick={() => setRequestOpen(true)}
                >
                  <CalendarRange className="h-4 w-4" />
                  {t('vacationsPage.actions.request', 'Solicitar ferias')}
                </Button>
              </div>
            </div>
          </header>

          {error ? (
            <section className="rounded-2xl border border-rose-200/70 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 shadow-[0_18px_50px_-38px_rgba(255,82,82,0.25)] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              <p className="font-semibold">{t('vacationsPage.states.errorTitle', 'Algo deu errado')}</p>
              <p className="mt-1">{error}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 rounded-full px-4"
                onClick={refreshAll}
              >
                {t('vacationsPage.actions.retry', 'Tentar novamente')}
              </Button>
            </section>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[28px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    {t('vacationsPage.balance.tag', 'Saldo')}
                  </p>
                  <h2 className="text-lg font-semibold">
                    {t('vacationsPage.balance.title', 'Saldo disponivel')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('vacationsPage.balance.subtitle', 'Atualizado conforme politica da empresa.')}
                  </p>
                </div>
                {balanceLoading ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('vacationsPage.balance.loading', 'Carregando')}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[120px_1fr] md:items-center">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[10px] border-border/40" />
                  <div className="absolute inset-0 rotate-[135deg] rounded-full border-[10px] border-primary border-b-transparent border-l-transparent border-r-transparent" />
                  <div className="relative flex h-12 w-12 flex-col items-center justify-center rounded-full bg-background text-foreground shadow-sm">
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      {t('vacationsPage.balance.days', 'Dias')}
                    </span>
                    <span className="text-sm font-semibold">
                      {balance?.available ?? balance?.available_days ?? '--'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/70 px-3 py-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t('vacationsPage.balance.available', 'Saldo disponivel')}
                    </span>
                    <span className="text-sm font-semibold">
                      {balance?.available ?? balance?.available_days ?? '--'} {t('vacationsPage.balance.suffix', 'dias')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/70 px-3 py-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t('vacationsPage.balance.used', 'Usados')}
                    </span>
                    <span className="text-sm font-semibold">{balance?.used ?? '--'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/70 px-3 py-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t('vacationsPage.balance.accrued', 'Adquiridos')}
                    </span>
                    <span className="text-sm font-semibold">{balance?.accrued ?? '--'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    {t('vacationsPage.next.tag', 'Proximas ferias')}
                  </p>
                  <h2 className="text-lg font-semibold">
                    {t('vacationsPage.next.title', 'Proximo periodo')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('vacationsPage.next.subtitle', 'Solicitacao mais proxima encontrada.')}
                  </p>
                </div>
                {upcomingVacation
                  ? renderStatusPill(upcomingVacation.status)
                  : (
                    <span className="rounded-full border border-border/60 bg-muted/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t('vacationsPage.next.statusEmpty', 'Sem solicitacao')}
                    </span>
                  )}
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/70 px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {upcomingVacation?.startDate
                        ? `${formatDateLabel(upcomingVacation.startDate, i18n.language)} - ${formatDateLabel(
                            upcomingVacation.endDate,
                            i18n.language,
                          )}`
                        : t('vacationsPage.next.empty', 'Nenhuma ferias agendada')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {upcomingVacation?.requestedDays
                        ? t('vacationsPage.next.days', '{{count}} dias solicitados', {
                            count: upcomingVacation.requestedDays,
                          })
                        : t('vacationsPage.next.daysEmpty', 'Sem periodo definido')}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full border-border bg-background/80"
                  onClick={() => setRequestOpen(true)}
                >
                  {t('vacationsPage.actions.request', 'Solicitar ferias')}
                </Button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[28px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    {t('vacationsPage.history.tag', 'Historico')}
                  </p>
                  <h2 className="text-lg font-semibold">
                    {t('vacationsPage.history.title', 'Solicitacoes de ferias')}
                  </h2>
                </div>
                {vacationsLoading ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('vacationsPage.history.loading', 'Carregando')}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {vacationsLoading ? (
                  [1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                    />
                  ))
                ) : vacations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-4 py-6 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {t('vacationsPage.history.emptyTitle', 'Nenhuma solicitacao encontrada')}
                    </p>
                    <p className="mt-1">
                      {t(
                        'vacationsPage.history.emptyDescription',
                        'Quando enviar uma solicitacao, ela aparecera aqui.',
                      )}
                    </p>
                  </div>
                ) : (
                  vacations.map((vacation) => {
                    const startLabel = formatDateLabel(vacation.startDate, i18n.language)
                    const endLabel = formatDateLabel(vacation.endDate, i18n.language)
                    const days =
                      vacation.requestedDays ||
                      (vacation.startDate && vacation.endDate
                        ? differenceInCalendarDays(
                            parseISO(vacation.endDate),
                            parseISO(vacation.startDate),
                          ) + 1
                        : null)
                    return (
                      <div
                        key={vacation.id}
                        className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-4 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.2)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {startLabel && endLabel
                              ? `${startLabel} - ${endLabel}`
                              : t('vacationsPage.history.periodFallback', 'Periodo nao informado')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {days
                              ? t('vacationsPage.history.days', '{{count}} dias', { count: days })
                              : t('vacationsPage.history.daysEmpty', 'Dias nao informados')}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {renderStatusPill(vacation.status)}
                          {vacation.status === 'pending' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full px-3 text-xs"
                              disabled={cancelingId === vacation.id}
                              onClick={() => handleCancel(vacation.id)}
                            >
                              {cancelingId === vacation.id
                                ? t('vacationsPage.history.canceling', 'Cancelando')
                                : t('vacationsPage.history.cancel', 'Cancelar')}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    {t('vacationsPage.absences.tag', 'Ausencias')}
                  </p>
                  <h2 className="text-lg font-semibold">
                    {t('vacationsPage.absences.title', 'Ausencias recentes')}
                  </h2>
                </div>
                {absencesLoading ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('vacationsPage.absences.loading', 'Carregando')}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {absencesLoading ? (
                  [1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                    />
                  ))
                ) : absences.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-4 py-6 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {t('vacationsPage.absences.emptyTitle', 'Nenhuma ausencia recente')}
                    </p>
                    <p className="mt-1">
                      {t(
                        'vacationsPage.absences.emptyDescription',
                        'Integracao de ausencias pendente ou sem registros.',
                      )}
                    </p>
                  </div>
                ) : (
                  absences.map((absence) => (
                    <div
                      key={absence.id}
                      className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.2)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {absence.type || t('vacationsPage.absences.typeFallback', 'Ausencia')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {absence.startDate
                              ? formatDateLabel(absence.startDate, i18n.language)
                              : t('vacationsPage.absences.dateFallback', 'Data nao informada')}
                          </p>
                        </div>
                        {absence.status ? renderStatusPill(absence.status) : null}
                      </div>
                      {absence.comment ? (
                        <p className="mt-2 text-xs text-muted-foreground">{absence.comment}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
      </PageContainer>

      <Dialog
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open)
          if (!open) {
            setRequestForm({ startDate: '', endDate: '', notes: '' })
            setRequestError('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('vacationsPage.request.title', 'Solicitar ferias')}</DialogTitle>
            <DialogDescription>
              {t(
                'vacationsPage.request.description',
                'Selecione o periodo desejado para enviar a solicitacao.',
              )}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleRequestSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vacation-start">{t('vacationsPage.request.start', 'Data inicio')}</Label>
                <Input
                  id="vacation-start"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={requestForm.startDate}
                  onChange={(event) =>
                    setRequestForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vacation-end">{t('vacationsPage.request.end', 'Data fim')}</Label>
                <Input
                  id="vacation-end"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={requestForm.endDate}
                  onChange={(event) =>
                    setRequestForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vacation-notes">{t('vacationsPage.request.notes', 'Observacoes')}</Label>
              <Textarea
                id="vacation-notes"
                value={requestForm.notes}
                onChange={(event) =>
                  setRequestForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder={t('vacationsPage.request.notesPlaceholder', 'Opcional')}
              />
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/70 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">
                {t('vacationsPage.request.summary', 'Resumo da solicitacao')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {requestedDays
                  ? t('vacationsPage.request.days', '{{count}} dias solicitados', { count: requestedDays })
                  : t('vacationsPage.request.daysEmpty', 'Selecione o periodo para calcular.')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('vacationsPage.request.balance', 'Saldo disponivel')}: {balance?.available ?? '--'}{' '}
                {t('vacationsPage.balance.suffix', 'dias')}
              </p>
            </div>

            {requestError ? (
              <p className="text-xs font-semibold text-rose-500">{requestError}</p>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={requesting} className="min-w-[160px]">
                {requesting
                  ? t('vacationsPage.request.sending', 'Enviando')
                  : t('vacationsPage.request.submit', 'Enviar solicitacao')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
