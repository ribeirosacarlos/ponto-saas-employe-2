import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { formControlClass, textareaControlClass } from '../ui/form-controls'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import { getEmailSettings, updateEmailSettings } from '../../services/modules/commercialEmails'

const DAYS = [
  { value: 'sun', label: 'Dom' },
  { value: 'mon', label: 'Seg' },
  { value: 'tue', label: 'Ter' },
  { value: 'wed', label: 'Qua' },
  { value: 'thu', label: 'Qui' },
  { value: 'fri', label: 'Sex' },
  { value: 'sat', label: 'Sáb' },
]

const buildSettingsForm = (s = null) => ({
  is_globally_paused: s?.is_globally_paused ?? false,
  pause_reason: s?.pause_reason ?? '',
  daily_send_limit: s?.daily_send_limit ?? 80,
  monthly_send_limit: s?.monthly_send_limit ?? 2400,
  sending_window_start_time: (s?.sending_window_start_time ?? '08:00:00').slice(0, 5),
  sending_window_end_time: (s?.sending_window_end_time ?? '18:00:00').slice(0, 5),
  sending_days: s?.sending_days ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
  timezone: s?.timezone ?? '',
  min_gap_seconds_between_sends: s?.min_gap_seconds_between_sends ?? 45,
  max_sends_per_dispatch_run: s?.max_sends_per_dispatch_run ?? 6,
  bounce_soft_threshold: s?.bounce_soft_threshold ?? 2,
})

export function EmailSettingsTab({ onSettingsChange }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(() => buildSettingsForm())
  const [saving, setSaving] = useState(false)
  const [killSwitchConfirmOpen, setKillSwitchConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const settings = await getEmailSettings()
      setForm(buildSettingsForm(settings))
      onSettingsChange?.(settings)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar as configurações.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast, onSettingsChange])

  useEffect(() => { load() }, [load])

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      sending_days: f.sending_days.includes(day) ? f.sending_days.filter((d) => d !== day) : [...f.sending_days, day],
    }))
  }

  const errors = {
    daily_send_limit: Number(form.daily_send_limit) < 1 || Number(form.daily_send_limit) > 100 ? 'Deve ser entre 1 e 100' : null,
    monthly_send_limit: Number(form.monthly_send_limit) < 1 || Number(form.monthly_send_limit) > 3000 ? 'Deve ser entre 1 e 3000' : null,
    window: form.sending_window_end_time <= form.sending_window_start_time ? 'Horário final deve ser depois do inicial' : null,
    max_sends_per_dispatch_run: Number(form.max_sends_per_dispatch_run) < 1 || Number(form.max_sends_per_dispatch_run) > 50 ? 'Deve ser entre 1 e 50' : null,
    min_gap_seconds_between_sends: Number(form.min_gap_seconds_between_sends) < 1 ? 'Deve ser maior que 0' : null,
    bounce_soft_threshold: Number(form.bounce_soft_threshold) < 1 ? 'Deve ser maior que 0' : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const doSave = async (overrides = {}) => {
    setSaving(true)
    try {
      const payload = {
        is_globally_paused: form.is_globally_paused,
        ...(form.pause_reason.trim() && { pause_reason: form.pause_reason.trim() }),
        daily_send_limit: Number(form.daily_send_limit),
        monthly_send_limit: Number(form.monthly_send_limit),
        sending_window_start_time: form.sending_window_start_time,
        sending_window_end_time: form.sending_window_end_time,
        sending_days: form.sending_days,
        ...(form.timezone.trim() && { timezone: form.timezone.trim() }),
        min_gap_seconds_between_sends: Number(form.min_gap_seconds_between_sends),
        max_sends_per_dispatch_run: Number(form.max_sends_per_dispatch_run),
        bounce_soft_threshold: Number(form.bounce_soft_threshold),
        ...overrides,
      }
      const updated = await updateEmailSettings(payload)
      setForm(buildSettingsForm(updated))
      onSettingsChange?.(updated)
      toast({ title: 'Configurações salvas' })
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Falha ao salvar configurações.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (hasErrors) return
    await doSave()
  }

  const handleToggleKillSwitch = (checked) => {
    if (checked) {
      setKillSwitchConfirmOpen(true)
      return
    }
    setForm((f) => ({ ...f, is_globally_paused: false }))
  }

  const confirmKillSwitch = async () => {
    setForm((f) => ({ ...f, is_globally_paused: true }))
    setKillSwitchConfirmOpen(false)
    await doSave({ is_globally_paused: true })
  }

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(
        'flex flex-col gap-2 rounded-[14px] border px-4 py-3',
        form.is_globally_paused ? 'border-destructive/40 bg-destructive/8' : 'border-border/70 bg-card/80',
      )}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold">Kill switch — pausar todos os envios</p>
            <p className="text-[11px] text-muted-foreground">Interrompe imediatamente todos os envios automáticos da automação.</p>
          </div>
          <label className="flex shrink-0 items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_globally_paused}
              onChange={(e) => handleToggleKillSwitch(e.target.checked)}
            />
          </label>
        </div>
        {form.is_globally_paused && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Motivo</label>
            <input className={formControlClass} value={form.pause_reason} onChange={(e) => setForm((f) => ({ ...f, pause_reason: e.target.value }))} placeholder="Motivo da pausa..." />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Limite diário de envios</label>
          <input type="number" min="1" max="100" className={formControlClass} value={form.daily_send_limit} onChange={(e) => setForm((f) => ({ ...f, daily_send_limit: e.target.value }))} />
          {errors.daily_send_limit && <p className="text-[10px] text-destructive">{errors.daily_send_limit}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Limite mensal de envios</label>
          <input type="number" min="1" max="3000" className={formControlClass} value={form.monthly_send_limit} onChange={(e) => setForm((f) => ({ ...f, monthly_send_limit: e.target.value }))} />
          {errors.monthly_send_limit && <p className="text-[10px] text-destructive">{errors.monthly_send_limit}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Janela de envio — início</label>
          <input type="time" className={formControlClass} value={form.sending_window_start_time} onChange={(e) => setForm((f) => ({ ...f, sending_window_start_time: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Janela de envio — fim</label>
          <input type="time" className={formControlClass} value={form.sending_window_end_time} onChange={(e) => setForm((f) => ({ ...f, sending_window_end_time: e.target.value }))} />
          {errors.window && <p className="text-[10px] text-destructive">{errors.window}</p>}
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Dias de envio</label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition',
                  form.sending_days.includes(d.value)
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border/60 bg-muted/40 text-muted-foreground',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Fuso horário</label>
          <input className={formControlClass} value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} placeholder="America/Sao_Paulo" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Espaço mínimo entre envios (s)</label>
          <input type="number" min="1" className={formControlClass} value={form.min_gap_seconds_between_sends} onChange={(e) => setForm((f) => ({ ...f, min_gap_seconds_between_sends: e.target.value }))} />
          {errors.min_gap_seconds_between_sends && <p className="text-[10px] text-destructive">{errors.min_gap_seconds_between_sends}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Máx. e-mails por execução</label>
          <input type="number" min="1" max="50" className={formControlClass} value={form.max_sends_per_dispatch_run} onChange={(e) => setForm((f) => ({ ...f, max_sends_per_dispatch_run: e.target.value }))} />
          {errors.max_sends_per_dispatch_run && <p className="text-[10px] text-destructive">{errors.max_sends_per_dispatch_run}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Limite de bounces leves</label>
          <input type="number" min="1" className={formControlClass} value={form.bounce_soft_threshold} onChange={(e) => setForm((f) => ({ ...f, bounce_soft_threshold: e.target.value }))} />
          {errors.bounce_soft_threshold && <p className="text-[10px] text-destructive">{errors.bounce_soft_threshold}</p>}
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving || hasErrors}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </div>

      <Dialog open={killSwitchConfirmOpen} onOpenChange={setKillSwitchConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Pausar todos os envios?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso interrompe imediatamente todos os envios automáticos de e-mail comercial, para todas as sequências e leads. Tem certeza?
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setKillSwitchConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={confirmKillSwitch} disabled={saving}>
              {saving ? 'Pausando...' : 'Pausar tudo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
