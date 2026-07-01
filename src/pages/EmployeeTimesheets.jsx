import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileText,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '../components/ui/button'
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
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { SignTimesheetDialog } from '../components/SignTimesheetDialog'
import {
  listMyTimesheets,
  signMyTimesheet,
  disputeMyTimesheet,
  fetchMyTimesheetPdf,
} from '../services/employeeTimesheetsService'
import { downloadBlob } from '../utils/pdf/downloadBlob'
import { useDateTime } from '../hooks/useDateTime'

const TIMESHEET_STATUS_STYLES = {
  pending_employee:
    'border-amber-200/70 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:text-amber-300',
  disputed:
    'border-rose-200/70 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:text-rose-300',
  pending_manager:
    'border-sky-200/70 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:text-sky-300',
  completed:
    'border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300',
}

const TIMESHEET_STATUS_LABELS = {
  pending_employee: 'Aguardando sua assinatura',
  disputed: 'Contestado',
  pending_manager: 'Aguardando gestor',
  completed: 'Concluído',
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const weekdayFromDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return WEEKDAY_SHORT[d.getDay()] ?? '—'
}


const formatMinutes = (minutes) => {
  const total = Number.isFinite(Number(minutes)) ? Number(minutes) : 0
  const abs = Math.abs(Math.round(total))
  return `${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

const formatBalance = (minutes) => {
  const total = Number.isFinite(Number(minutes)) ? Number(minutes) : 0
  const rounded = Math.round(total)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : ''
  const abs = Math.abs(rounded)
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

const formatDate = (dateStr, locale) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const formatMonthYear = (month, year, locale) => {
  if (!month || !year) return '—'
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long', year: 'numeric',
  })
}

const extractMonthYear = (ts) => {
  // Prefer explicit closure fields, fall back to snapshot.from date string
  const month =
    ts.closure?.reference_month ??
    ts.reference_month ??
    (ts.snapshot?.from ? new Date(ts.snapshot.from + 'T12:00:00').getMonth() + 1 : undefined)
  const year =
    ts.closure?.reference_year ??
    ts.reference_year ??
    (ts.snapshot?.from ? new Date(ts.snapshot.from + 'T12:00:00').getFullYear() : undefined)
  return { month, year }
}

export default function EmployeeTimesheets() {
  const { i18n } = useTranslation()
  const { formatTime } = useDateTime()
  const { toast } = useToast()

  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [expandedId, setExpandedId] = useState(null)

  const [signTarget, setSignTarget] = useState(null)
  const [signing, setSigning] = useState(false)

  const [disputeTarget, setDisputeTarget] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeError, setDisputeError] = useState('')
  const [disputing, setDisputing] = useState(false)

  const [pdfLoadingId, setPdfLoadingId] = useState(null)

  const handleViewPdf = async (timesheetId) => {
    setPdfLoadingId(timesheetId)
    try {
      const result = await fetchMyTimesheetPdf(timesheetId)
      if (result.type === 'url') {
        window.open(result.url, '_blank', 'noopener,noreferrer')
      } else {
        downloadBlob({ blob: result.blob, response: result.response, fallbackFilename: 'folha-ponto.pdf' })
      }
    } catch (err) {
      toast({
        title: 'Erro ao abrir PDF',
        description: err?.response?.data?.message || err?.message,
        variant: 'error',
      })
    } finally {
      setPdfLoadingId(null)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { items } = await listMyTimesheets({ perPage: 50 })
      setTimesheets(items)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao carregar folhas de ponto.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSignConfirm = async ({ signatureImage, acceptedTerms, password }) => {
    if (!signTarget) return
    setSigning(true)
    try {
      const updated = await signMyTimesheet(signTarget.id, { signatureImage, acceptedTerms, password })
      setTimesheets((prev) =>
        prev.map((ts) => (ts.id === signTarget.id ? { ...ts, ...updated } : ts)),
      )
      toast({ title: 'Folha assinada', description: 'Sua assinatura foi registrada com sucesso.', variant: 'success' })
      setSignTarget(null)
    } catch (err) {
      toast({
        title: 'Erro ao assinar',
        description:
          err?.response?.data?.errors?.password?.[0] ||
          err?.response?.data?.errors?.signature_image?.[0] ||
          err?.response?.data?.message ||
          err?.message,
        variant: 'error',
      })
    } finally {
      setSigning(false)
    }
  }

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      setDisputeError('Informe o motivo da contestação.')
      return
    }
    setDisputing(true)
    setDisputeError('')
    try {
      const dispute = await disputeMyTimesheet(disputeTarget.id, disputeReason.trim())
      setTimesheets((prev) =>
        prev.map((ts) =>
          ts.id === disputeTarget.id
            ? { ...ts, status: 'disputed', open_dispute: dispute }
            : ts,
        ),
      )
      toast({ title: 'Contestação registrada', description: 'O gestor será notificado para análise.', variant: 'success' })
      setDisputeTarget(null)
      setDisputeReason('')
    } catch (err) {
      setDisputeError(
        err?.response?.data?.errors?.reason?.[0] ||
          err?.response?.data?.message ||
          err?.message ||
          'Erro ao registrar contestação.',
      )
    } finally {
      setDisputing(false)
    }
  }

  const totalsOf = (ts) => ts?.snapshot?.totals ?? {}

  const balanceClass = (minutes) => {
    if (minutes == null) return 'text-muted-foreground'
    if (Number(minutes) > 0) return 'text-emerald-600 dark:text-emerald-300'
    if (Number(minutes) < 0) return 'text-rose-600 dark:text-rose-300'
    return 'text-foreground'
  }

  const sigCount = (ts) => ts?.signatures?.length ?? 0

  return (
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="py-5 sm:py-6 space-y-6">
        <AppTopBar
          icon={<CalendarCheck className="h-5 w-5" />}
          eyebrow="Folha de ponto"
          title="Meus fechamentos"
          subtitle="Revise, assine ou conteste as folhas de ponto geradas pelo gestor."
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-border bg-background/80 px-3 text-sm"
              onClick={load}
              disabled={loading}
            >
              {loading ? <RefreshCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Atualizar
            </Button>
          }
        />

        {error ? (
          <section className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 dark:border-rose-500/30 dark:text-rose-100">
            <p className="font-semibold">Erro ao carregar</p>
            <p className="mt-1">{error}</p>
            <Button type="button" size="sm" variant="outline" className="mt-3 rounded-full px-3 text-xs" onClick={load}>
              Tentar novamente
            </Button>
          </section>
        ) : null}

        {loading ? (
          <section className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
              />
            ))}
          </section>
        ) : null}

        {!loading && timesheets.length === 0 && !error ? (
          <section className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-8 text-sm text-muted-foreground shadow-[0_18px_50px_-40px_rgba(62,82,152,0.35)]">
            <p className="font-semibold text-foreground">Nenhuma folha disponível</p>
            <p className="mt-1">Quando o gestor fechar um período, sua folha aparecerá aqui para revisão e assinatura.</p>
          </section>
        ) : null}

        {!loading && timesheets.length > 0 ? (
          <section className="space-y-4">
            {timesheets.map((ts) => {
              const isExpanded = expandedId === ts.id
              const totals = totalsOf(ts)
              const dispute = ts.open_dispute
              const statusStyle =
                TIMESHEET_STATUS_STYLES[ts.status] ||
                'border-border/60 bg-muted/70 text-muted-foreground'
              const canSign = ts.status === 'pending_employee' && dispute?.status !== 'open'
              const canDispute = ts.status === 'pending_employee'
              const days = ts?.snapshot?.days ?? []

              return (
                <div
                  key={ts.id}
                  className="rounded-[28px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold capitalize">
                            {(() => { const { month, year } = extractMonthYear(ts); return formatMonthYear(month, year, i18n.language) })()}
                          </p>
                          <span
                            className={cn(
                              'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]',
                              statusStyle,
                            )}
                          >
                            {TIMESHEET_STATUS_LABELS[ts.status] ?? ts.status}
                          </span>
                          {dispute?.status === 'open' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/70 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-500/30 dark:text-rose-300">
                              <AlertCircle className="h-3 w-3" />
                              Contestação em aberto
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          {totals.worked_minutes != null ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {formatMinutes(totals.worked_minutes)}h trabalhadas
                            </span>
                          ) : null}
                          {totals.balance_minutes != null ? (
                            <span className={cn('font-semibold', balanceClass(totals.balance_minutes))}>
                              {formatBalance(totals.balance_minutes)} saldo
                            </span>
                          ) : null}
                          {sigCount(ts) > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              {sigCount(ts)} {sigCount(ts) === 1 ? 'assinatura' : 'assinaturas'}
                            </span>
                          ) : null}
                        </div>
                        {dispute?.reason ? (
                          <p className="mt-1 line-clamp-1 text-[11px] text-rose-600 dark:text-rose-300">
                            <span className="font-semibold">Motivo:</span> {dispute.reason}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ts.pdf_path ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full px-3 text-xs"
                          disabled={pdfLoadingId === ts.id}
                          onClick={() => handleViewPdf(ts.id)}
                        >
                          {pdfLoadingId === ts.id ? (
                            <RefreshCcw className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="mr-1 h-3.5 w-3.5" />
                          )}
                          Ver PDF
                        </Button>
                      ) : null}
                      {canSign ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setSignTarget(ts)}
                          className="rounded-full px-4"
                        >
                          Assinar
                        </Button>
                      ) : null}
                      {canDispute ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full border-rose-200/70 px-3 text-xs text-rose-600 hover:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"
                          onClick={() => {
                            setDisputeTarget(ts)
                            setDisputeReason('')
                            setDisputeError('')
                          }}
                        >
                          <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                          Contestar
                        </Button>
                      ) : null}
                      {days.length > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full px-3"
                          onClick={() => setExpandedId(isExpanded ? null : ts.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <><ChevronUp className="mr-1 h-3.5 w-3.5" />Recolher</>
                          ) : (
                            <><ChevronDown className="mr-1 h-3.5 w-3.5" />Ver detalhes</>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {isExpanded && days.length > 0 ? (
                    <div className="mt-5 border-t border-border/70 pt-4">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-[12px]">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="pb-2 font-medium w-[90px]">Data</th>
                              <th className="pb-2 font-medium w-[60px]">Dia</th>
                              <th className="pb-2 font-medium">Batidas</th>
                              <th className="pb-2 font-medium text-right w-[80px]">Trabalhado</th>
                              <th className="pb-2 font-medium text-right w-[80px]">Saldo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {days.map((day) => {
                              const summary = day.summary ?? {}
                              const dayBalance = summary.balance_minutes ?? 0
                              const isHoliday = summary.is_holiday ?? false
                              return (
                                <tr key={day.date} className={cn(isHoliday ? 'opacity-60' : '')}>
                                  <td className="py-2 text-muted-foreground">{day.date}</td>
                                  <td className="py-2 text-muted-foreground">
                                    {weekdayFromDate(day.date)}
                                    {isHoliday ? (
                                      <span className="ml-1 text-[10px] text-amber-600">feriado</span>
                                    ) : null}
                                  </td>
                                  <td className="py-2">
                                    {day.entries?.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {day.entries.map((entry, idx) => (
                                          <span
                                            key={idx}
                                            className={cn(
                                              'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                                              entry.type === 'in'
                                                ? 'border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300'
                                                : 'border-sky-200/60 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:text-sky-300',
                                              entry.is_adjusted ? 'italic' : '',
                                            )}
                                          >
                                            {entry.clocked_at ? formatTime(entry.clocked_at) : '—'}
                                            {entry.is_adjusted ? '*' : ''}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 text-right font-mono">
                                    {summary.worked_hhmm ?? (summary.worked_minutes != null ? `${formatMinutes(summary.worked_minutes)}h` : '—')}
                                  </td>
                                  <td className={cn('py-2 text-right font-mono font-semibold', balanceClass(dayBalance))}>
                                    {summary.balance_hhmm ?? (summary.balance_minutes != null ? formatBalance(dayBalance) : '—')}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {totals.worked_minutes != null ? (
                            <tfoot>
                              <tr className="border-t border-border/70 text-[12px] font-semibold">
                                <td colSpan={3} className="pt-2 text-muted-foreground">Total do período</td>
                                <td className="pt-2 text-right font-mono">{formatMinutes(totals.worked_minutes)}h</td>
                                <td className={cn('pt-2 text-right font-mono', balanceClass(totals.balance_minutes))}>
                                  {totals.balance_minutes != null ? formatBalance(totals.balance_minutes) : '—'}
                                </td>
                              </tr>
                            </tfoot>
                          ) : null}
                        </table>
                      </div>
                      {ts.signatures?.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {ts.signatures.map((sig) => (
                            <span
                              key={sig.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {sig.role === 'employee' ? 'Colaborador' : 'Gestor'} · {formatDate(sig.signed_at, i18n.language)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </section>
        ) : null}
      </PageContainer>

      <SignTimesheetDialog
        open={Boolean(signTarget)}
        onOpenChange={(v) => { if (!v) setSignTarget(null) }}
        onConfirm={handleSignConfirm}
        loading={signing}
      />

      <Dialog
        open={Boolean(disputeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDisputeTarget(null)
            setDisputeReason('')
            setDisputeError('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contestar folha de ponto</DialogTitle>
            <DialogDescription>
              Informe o motivo da contestação. O gestor será notificado para analisar e resolver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="dispute-reason">Motivo</Label>
              <Textarea
                id="dispute-reason"
                value={disputeReason}
                rows={3}
                onChange={(e) => {
                  setDisputeReason(e.target.value)
                  setDisputeError('')
                }}
                placeholder="Ex: Existem batidas incorretas no período de 10 a 15 do mês."
              />
            </div>
            {disputeError ? (
              <p className="text-xs font-semibold text-rose-500">{disputeError}</p>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                disabled={disputing || !disputeReason.trim()}
                onClick={handleDispute}
              >
                {disputing ? 'Enviando...' : 'Contestar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
