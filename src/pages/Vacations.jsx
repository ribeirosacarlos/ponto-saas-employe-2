import { useCallback, useEffect, useMemo, useState } from 'react'
import { addYears, differenceInCalendarDays, format, parseISO, subMonths } from 'date-fns'
import { FilePlus2, Loader2, Plane } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
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
import { AppTopBar } from '../components/ui/AppTopBar'
import {
  cancelEmployeeVacation,
  getEmployeeVacationBalance,
  listEmployeeVacations,
  requestEmployeeVacation,
} from '../services/vacationsService'
import { listEmployeeAbsences } from '../services/absencesService'
import {
  cancelEmployeeMedicalCertificate,
  createEmployeeMedicalCertificate,
  listEmployeeMedicalCertificates,
} from '../services/medicalCertificatesService'

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

const buildVacationForm = () => ({
  startDate: '',
  endDate: '',
  notes: '',
})

const buildMedicalCertificateForm = () => ({
  coverageType: 'full_day',
  startDate: '',
  endDate: '',
  date: '',
  startTime: '',
  endTime: '',
  comment: '',
  files: [],
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
  status: absence.status ?? absence.state ?? '',
  startDate: absence.start_date ?? absence.startDate ?? absence.date ?? absence.day ?? '',
  endDate: absence.end_date ?? absence.endDate ?? absence.date ?? absence.day ?? '',
  source: 'absence',
})

const normalizeMedicalCertificateRecord = (certificate = {}, index = 0) => ({
  id: certificate.id ?? certificate.uuid ?? `medical-certificate-${index}`,
  type: certificate.type ?? 'sick_leave',
  comment: certificate.comment ?? certificate.notes ?? certificate.description ?? '',
  status: certificate.status ?? certificate.state ?? '',
  startDate: certificate.startDate ?? certificate.start_date ?? certificate.date ?? '',
  endDate: certificate.endDate ?? certificate.end_date ?? certificate.date ?? '',
  date: certificate.date ?? certificate.startDate ?? certificate.start_date ?? '',
  startTime: certificate.startTime ?? certificate.start_time ?? '',
  endTime: certificate.endTime ?? certificate.end_time ?? '',
  coverageType: certificate.coverageType ?? certificate.coverage_type ?? 'full_day',
  documents: Array.isArray(certificate.documents) ? certificate.documents : [],
  source: 'medical-certificate',
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
  const [requestForm, setRequestForm] = useState(buildVacationForm)
  const [cancelingId, setCancelingId] = useState('')

  const [medicalRequestOpen, setMedicalRequestOpen] = useState(false)
  const [medicalRequesting, setMedicalRequesting] = useState(false)
  const [medicalRequestError, setMedicalRequestError] = useState('')
  const [medicalForm, setMedicalForm] = useState(buildMedicalCertificateForm)
  const [medicalCancelingId, setMedicalCancelingId] = useState('')

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

      const [absenceResponse, medicalResponse] = await Promise.allSettled([
        listEmployeeAbsences({ from, to, page: 1, perPage: 20 }),
        listEmployeeMedicalCertificates({ from, to, page: 1, perPage: 20 }),
      ])

      const normalizedAbsences =
        absenceResponse.status === 'fulfilled'
          ? (absenceResponse.value.data || []).map(normalizeAbsence)
          : []

      const normalizedMedicalCertificates =
        medicalResponse.status === 'fulfilled'
          ? (medicalResponse.value.data || []).map(normalizeMedicalCertificateRecord)
          : []

      const timeline = [...normalizedMedicalCertificates, ...normalizedAbsences].sort((left, right) => {
        const leftTime = new Date(left.startDate || left.date || 0).getTime()
        const rightTime = new Date(right.startDate || right.date || 0).getTime()
        return rightTime - leftTime
      })

      setAbsences(timeline)
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

  const requestedDays = useMemo(() => {
    if (!requestForm.startDate || !requestForm.endDate) return 0
    const start = parseISO(requestForm.startDate)
    const end = parseISO(requestForm.endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    if (end < start) return 0
    return differenceInCalendarDays(end, start) + 1
  }, [requestForm.endDate, requestForm.startDate])

  const validateVacationRequest = () => {
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

  const validateMedicalRequest = () => {
    if (medicalForm.coverageType === 'full_day') {
      if (!medicalForm.startDate) {
        return t(
          'vacationsPage.medicalCertificates.errors.startDateRequired',
          'Informe a data inicial do atestado.',
        )
      }
      if (medicalForm.endDate && medicalForm.endDate < medicalForm.startDate) {
        return t(
          'vacationsPage.medicalCertificates.errors.invalidRange',
          'A data final nao pode ser anterior a inicial.',
        )
      }
      return ''
    }

    if (!medicalForm.date || !medicalForm.startTime || !medicalForm.endTime) {
      return t(
        'vacationsPage.medicalCertificates.errors.hoursRequired',
        'Preencha data, hora inicial e hora final.',
      )
    }
    if (medicalForm.endTime <= medicalForm.startTime) {
      return t(
        'vacationsPage.medicalCertificates.errors.invalidHours',
        'A hora final deve ser maior que a hora inicial.',
      )
    }

    return ''
  }

  const handleVacationSubmit = async (event) => {
    event.preventDefault()

    const validation = validateVacationRequest()
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
      setRequestForm(buildVacationForm())
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

  const handleMedicalSubmit = async (event) => {
    event.preventDefault()

    const validation = validateMedicalRequest()
    if (validation) {
      setMedicalRequestError(validation)
      return
    }

    const payload =
      medicalForm.coverageType === 'hours'
        ? {
            coverage_type: 'hours',
            date: medicalForm.date,
            start_time: medicalForm.startTime,
            end_time: medicalForm.endTime,
            comment: medicalForm.comment || undefined,
            files: medicalForm.files,
          }
        : {
            coverage_type: 'full_day',
            start_date: medicalForm.startDate,
            end_date: medicalForm.endDate || undefined,
            comment: medicalForm.comment || undefined,
            files: medicalForm.files,
          }

    setMedicalRequesting(true)
    setMedicalRequestError('')
    try {
      await createEmployeeMedicalCertificate(payload)
      toast({
        title: t('vacationsPage.medicalCertificates.successTitle', 'Atestado enviado'),
        description: t(
          'vacationsPage.medicalCertificates.successDescription',
          'Seu atestado foi enviado para analise.',
        ),
        variant: 'success',
      })
      setMedicalRequestOpen(false)
      setMedicalForm(buildMedicalCertificateForm())
      await loadAbsences()
    } catch (err) {
      setMedicalRequestError(
        err?.response?.data?.message ||
          err?.message ||
          t(
            'vacationsPage.medicalCertificates.errors.submit',
            'Nao foi possivel enviar o atestado.',
          ),
      )
    } finally {
      setMedicalRequesting(false)
    }
  }

  const handleVacationCancel = async (vacationId) => {
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

  const handleMedicalCancel = async (certificateId) => {
    if (!certificateId) return
    setMedicalCancelingId(certificateId)
    try {
      await cancelEmployeeMedicalCertificate(certificateId)
      toast({
        title: t('vacationsPage.medicalCertificates.cancelSuccessTitle', 'Atestado cancelado'),
        description: t(
          'vacationsPage.medicalCertificates.cancelSuccessDescription',
          'A solicitacao pendente foi cancelada.',
        ),
        variant: 'success',
      })
      await loadAbsences()
    } catch (err) {
      toast({
        title: t('vacationsPage.medicalCertificates.cancelErrorTitle', 'Nao foi possivel cancelar'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t(
            'vacationsPage.medicalCertificates.cancelErrorDescription',
            'Tente novamente em instantes.',
          ),
        variant: 'error',
      })
    } finally {
      setMedicalCancelingId('')
    }
  }

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

  const getRecordTitle = (record) => {
    if (record.source === 'medical-certificate') {
      return record.coverageType === 'hours'
        ? t('vacationsPage.medicalCertificates.types.partialDay', 'Atestado por horas')
        : t('vacationsPage.medicalCertificates.types.fullDay', 'Atestado medico')
    }

    return record.type || t('vacationsPage.absences.typeFallback', 'Ausencia')
  }

  const getRecordPeriodLabel = (record) => {
    if (record.source === 'medical-certificate' && record.coverageType === 'hours') {
      const dateLabel = record.date
        ? formatDateLabel(record.date, i18n.language)
        : t('vacationsPage.absences.dateFallback', 'Data nao informada')
      const timeLabel =
        record.startTime && record.endTime ? `${record.startTime} - ${record.endTime}` : ''
      return timeLabel ? `${dateLabel} - ${timeLabel}` : dateLabel
    }

    if (record.startDate && record.endDate && record.endDate !== record.startDate) {
      return `${formatDateLabel(record.startDate, i18n.language)} - ${formatDateLabel(
        record.endDate,
        i18n.language,
      )}`
    }

    const singleDate = record.startDate || record.date
    return singleDate
      ? formatDateLabel(singleDate, i18n.language)
      : t('vacationsPage.absences.dateFallback', 'Data nao informada')
  }

  return (
    <div className="relative min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="relative z-10 flex flex-col gap-6 py-6">
        <AppTopBar
          icon={<Plane className="h-5 w-5" />}
          eyebrow={t('vacationsPage.tag', 'Time off')}
          title={t('vacationsPage.title', 'Ferias e ausencias')}
          subtitle={t(
            'vacationsPage.subtitle',
            'Acompanhe saldo, solicitacoes e ausencias recentes.',
          )}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-3 text-sm"
                onClick={() => setMedicalRequestOpen(true)}
              >
                <FilePlus2 className="h-4 w-4" />
                {t('vacationsPage.medicalCertificates.openAction', 'Enviar atestado')}
              </Button>
              <Button
                type="button"
                className="rounded-full px-3 text-sm"
                onClick={() => setRequestOpen(true)}
              >
                {t('vacationsPage.request.openAction', 'Solicitar ferias')}
              </Button>
            </div>
          }
        />

        {error ? (
          <section className="rounded-2xl border border-rose-200/70 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 shadow-[0_18px_50px_-38px_rgba(255,82,82,0.25)] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            <p className="font-semibold">{t('vacationsPage.states.errorTitle', 'Algo deu errado')}</p>
            <p className="mt-1">{error}</p>
          </section>
        ) : null}

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
                            onClick={() => handleVacationCancel(vacation.id)}
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
                  {t('vacationsPage.absences.title', 'Ausencias e atestados recentes')}
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
                      'Nenhum registro de ausencia ou atestado foi encontrado.',
                    )}
                  </p>
                </div>
              ) : (
                absences.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.2)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{getRecordTitle(record)}</p>
                        <p className="text-xs text-muted-foreground">{getRecordPeriodLabel(record)}</p>
                      </div>
                      {record.status ? renderStatusPill(record.status) : null}
                    </div>

                    {record.comment ? (
                      <p className="mt-2 text-xs text-muted-foreground">{record.comment}</p>
                    ) : null}

                    {record.source === 'medical-certificate' && record.status === 'pending' ? (
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full px-3 text-xs"
                          disabled={medicalCancelingId === record.id}
                          onClick={() => handleMedicalCancel(record.id)}
                        >
                          {medicalCancelingId === record.id
                            ? t('vacationsPage.medicalCertificates.canceling', 'Cancelando atestado')
                            : t(
                                'vacationsPage.medicalCertificates.cancelAction',
                                'Cancelar atestado',
                              )}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </PageContainer>

      <Dialog
        open={medicalRequestOpen}
        onOpenChange={(open) => {
          setMedicalRequestOpen(open)
          if (!open) {
            setMedicalForm(buildMedicalCertificateForm())
            setMedicalRequestError('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('vacationsPage.medicalCertificates.title', 'Enviar atestado medico')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'vacationsPage.medicalCertificates.description',
                'Informe o periodo coberto e, se quiser, anexe o documento.',
              )}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleMedicalSubmit}>
            <div className="space-y-2">
              <Label htmlFor="medical-coverage-type">
                {t('vacationsPage.medicalCertificates.coverageTypeLabel', 'Cobertura')}
              </Label>
              <Select
                id="medical-coverage-type"
                value={medicalForm.coverageType}
                onChange={(event) =>
                  setMedicalForm((prev) => ({
                    ...buildMedicalCertificateForm(),
                    coverageType: event.target.value,
                    comment: prev.comment,
                    files: prev.files,
                  }))
                }
              >
                <option value="full_day">
                  {t('vacationsPage.medicalCertificates.coverageOptions.fullDay', 'Dia inteiro')}
                </option>
                <option value="hours">
                  {t('vacationsPage.medicalCertificates.coverageOptions.hours', 'Por horas')}
                </option>
              </Select>
            </div>

            {medicalForm.coverageType === 'hours' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="medical-date">
                    {t('vacationsPage.medicalCertificates.dateLabel', 'Data')}
                  </Label>
                  <Input
                    id="medical-date"
                    type="date"
                    value={medicalForm.date}
                    onChange={(event) =>
                      setMedicalForm((prev) => ({ ...prev, date: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medical-start-time">
                    {t('vacationsPage.medicalCertificates.startTimeLabel', 'Hora inicial')}
                  </Label>
                  <Input
                    id="medical-start-time"
                    type="time"
                    value={medicalForm.startTime}
                    onChange={(event) =>
                      setMedicalForm((prev) => ({ ...prev, startTime: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medical-end-time">
                    {t('vacationsPage.medicalCertificates.endTimeLabel', 'Hora final')}
                  </Label>
                  <Input
                    id="medical-end-time"
                    type="time"
                    value={medicalForm.endTime}
                    onChange={(event) =>
                      setMedicalForm((prev) => ({ ...prev, endTime: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="medical-start-date">
                    {t('vacationsPage.medicalCertificates.startDateLabel', 'Data inicial')}
                  </Label>
                  <Input
                    id="medical-start-date"
                    type="date"
                    value={medicalForm.startDate}
                    onChange={(event) =>
                      setMedicalForm((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medical-end-date">
                    {t('vacationsPage.medicalCertificates.endDateLabel', 'Data final')}
                  </Label>
                  <Input
                    id="medical-end-date"
                    type="date"
                    value={medicalForm.endDate}
                    onChange={(event) =>
                      setMedicalForm((prev) => ({ ...prev, endDate: event.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="medical-comment">
                {t('vacationsPage.medicalCertificates.commentLabel', 'Observacoes')}
              </Label>
              <Textarea
                id="medical-comment"
                value={medicalForm.comment}
                onChange={(event) =>
                  setMedicalForm((prev) => ({ ...prev, comment: event.target.value }))
                }
                placeholder={t(
                  'vacationsPage.medicalCertificates.commentPlaceholder',
                  'Descreva rapidamente o contexto, se necessario.',
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medical-files">
                {t('vacationsPage.medicalCertificates.filesLabel', 'Anexos')}
              </Label>
              <Input
                id="medical-files"
                type="file"
                multiple
                onChange={(event) =>
                  setMedicalForm((prev) => ({
                    ...prev,
                    files: Array.from(event.target.files || []),
                  }))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                {medicalForm.files.length > 0
                  ? medicalForm.files.map((file) => file.name).join(', ')
                  : t(
                      'vacationsPage.medicalCertificates.filesHint',
                      'Anexo opcional. Voce pode enviar um ou mais arquivos.',
                    )}
              </p>
            </div>

            {medicalRequestError ? (
              <p className="text-xs font-semibold text-rose-500">{medicalRequestError}</p>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel', 'Cancelar')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={medicalRequesting} className="min-w-[180px]">
                {medicalRequesting
                  ? t('vacationsPage.medicalCertificates.submitting', 'Enviando atestado')
                  : t('vacationsPage.medicalCertificates.submit', 'Enviar atestado')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open)
          if (!open) {
            setRequestForm(buildVacationForm())
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

          <form className="space-y-4 pt-2" onSubmit={handleVacationSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vacation-start">
                  {t('vacationsPage.request.start', 'Data inicio')}
                </Label>
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
                  ? t('vacationsPage.request.days', '{{count}} dias solicitados', {
                      count: requestedDays,
                    })
                  : t('vacationsPage.request.daysEmpty', 'Selecione o periodo para calcular.')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('vacationsPage.request.balance', 'Saldo disponivel')}:{' '}
                {balanceLoading ? '...' : balance?.available ?? '--'}{' '}
                {t('vacationsPage.balance.suffix', 'dias')}
              </p>
            </div>

            {requestError ? <p className="text-xs font-semibold text-rose-500">{requestError}</p> : null}

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
