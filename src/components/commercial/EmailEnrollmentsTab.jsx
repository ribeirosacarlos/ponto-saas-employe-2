import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '../ui/button'
import { formControlClass } from '../ui/form-controls'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import { EmailStatusBadge, EXIT_REASON_LABELS } from './EmailStatusBadge'
import { listAllEmailEnrollments } from '../../services/modules/commercialEmails'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

const fmtDateTime = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

const COLUMNS = ['E-mail', 'Empresa', 'Sequência', 'Status', 'Motivo saída', 'Etapa atual', 'Próxima etapa', 'Próximo envio']

export function EmailEnrollmentsTab() {
  const { toast } = useToast()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const [status, setStatus] = useState('')
  const [emailSearch, setEmailSearch] = useState('')

  const load = useCallback(async (pg = page, st = status, em = emailSearch) => {
    setLoading(true)
    try {
      const result = await listAllEmailEnrollments({ page: pg, status: st || undefined, email: em || undefined })
      setEnrollments(result.data)
      setMeta(result.meta)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar as inscrições.', variant: 'error' })
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
            placeholder="Buscar por e-mail do lead..."
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
      {!loading && enrollments.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">Nenhuma inscrição encontrada.</p>
      )}

      {!loading && enrollments.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-border/70 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {COLUMNS.map((col) => (
                    <th key={col} className="px-3 py-2.5 font-medium">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="border-b border-border/40 text-[12px] last:border-b-0 hover:bg-muted/40">
                    <td className="px-3 py-2.5">{enrollment.lead?.email ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-medium">{enrollment.lead?.company_name ?? '—'}</span>
                        {enrollment.lead?.contact_name && <span className="text-[10px] text-muted-foreground">{enrollment.lead.contact_name}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{enrollment.sequence?.name ?? '—'}</td>
                    <td className="px-3 py-2.5"><EmailStatusBadge status={enrollment.status} kind="enrollment" /></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{enrollment.exit_reason ? (EXIT_REASON_LABELS[enrollment.exit_reason] ?? enrollment.exit_reason) : '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{enrollment.current_step?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{enrollment.next_step?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{fmtDateTime(enrollment.next_send_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p) }}>Anterior</Button>
          <span className="text-[11px] text-muted-foreground">{page} / {meta.lastPage} — {meta.total} inscrições</span>
          <Button variant="outline" size="sm" disabled={page >= meta.lastPage} onClick={() => { const p = page + 1; setPage(p); load(p) }}>Próximo</Button>
        </div>
      )}
    </div>
  )
}
