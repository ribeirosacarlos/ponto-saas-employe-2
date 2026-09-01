import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '../ui/button'
import { formControlClass } from '../ui/form-controls'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import { EmailStatusBadge } from './EmailStatusBadge'
import { listAllEmailSends } from '../../services/modules/commercialEmails'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'queued', label: 'Na fila' },
  { value: 'sent', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'opened', label: 'Aberto' },
  { value: 'clicked', label: 'Clicado' },
  { value: 'bounced', label: 'Bounce' },
  { value: 'complained', label: 'Reclamação' },
  { value: 'failed', label: 'Falhou' },
  { value: 'cancelled', label: 'Cancelado' },
]

const fmtDateTime = (iso) => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return null
  }
}

export function EmailSendsTab() {
  const { toast } = useToast()
  const [sends, setSends] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const [status, setStatus] = useState('')
  const [emailSearch, setEmailSearch] = useState('')

  const load = useCallback(async (pg = page, st = status, em = emailSearch) => {
    setLoading(true)
    try {
      const result = await listAllEmailSends({ page: pg, status: st || undefined, email: em || undefined })
      setSends(result.data)
      setMeta(result.meta)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar os e-mails enviados.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page, status, emailSearch, toast])

  useEffect(() => { load(1, status, emailSearch) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    load(1, status, emailSearch)
  }

  const handleStatusChange = (value) => {
    setStatus(value)
    setPage(1)
    load(1, value, emailSearch)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(formControlClass, 'pl-7 w-56')}
            placeholder="Buscar por e-mail do destinatário..."
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
          />
        </form>
        <select className={cn(formControlClass, 'w-44')} value={status} onChange={(e) => handleStatusChange(e.target.value)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>}
      {!loading && sends.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">Nenhum e-mail encontrado.</p>
      )}

      {!loading && sends.length > 0 && (
        <div className="flex flex-col gap-2">
          {sends.map((send) => (
            <div key={send.id} className="flex flex-col gap-1.5 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold">{send.lead?.company_name ?? 'Lead removido'}</span>
                  <EmailStatusBadge status={send.status} kind="send" />
                  {send.sequence_step?.sequence?.name && (
                    <span className="text-[10px] text-muted-foreground">{send.sequence_step.sequence.name}</span>
                  )}
                </div>
                {send.sent_at && <span className="shrink-0 text-[10px] text-muted-foreground">{fmtDateTime(send.sent_at)}</span>}
              </div>
              <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                {send.lead?.contact_name && <span>{send.lead.contact_name}</span>}
                <span>{send.to_email}</span>
              </div>
              {send.rendered_subject && (
                <p className="truncate text-[11px] text-foreground/80">{send.rendered_subject}</p>
              )}
              {send.status === 'failed' && send.failure_reason && (
                <p className="text-[10px] text-destructive">{send.failure_reason}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p) }}>Anterior</Button>
          <span className="text-[11px] text-muted-foreground">{page} / {meta.lastPage} — {meta.total} e-mails</span>
          <Button variant="outline" size="sm" disabled={page >= meta.lastPage} onClick={() => { const p = page + 1; setPage(p); load(p) }}>Próximo</Button>
        </div>
      )}
    </div>
  )
}
