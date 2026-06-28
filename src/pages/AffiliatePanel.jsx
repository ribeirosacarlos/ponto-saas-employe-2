import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Gift,
  LogOut,
  MousePointerClick,
  Plus,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { ThemeToggle } from '../components/ThemeToggle'
import { BrandSignature } from '../components/BrandSignature'
import { useToast } from '../components/ui/use-toast'
import { useAffiliateAuth } from '../store/useAffiliateAuth'
import {
  affiliateLogout,
  getAffiliateMe,
  listAffiliateLeads,
  createAffiliateLead,
  addAffiliateLeadNote,
  markAffiliateLeadWon,
  markAffiliateLeadLost,
  listAffiliateCommissions,
  listAffiliateBonuses,
} from '../services/modules/affiliateAuth'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { formControlClass } from '../components/ui/form-controls'
import { cn } from '../lib/utils'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const STATUS_LEAD_LABELS = {
  new: 'Novo',
  in_progress: 'Em progresso',
  demo_scheduled: 'Demo agendada',
  proposal_sent: 'Proposta enviada',
  won: 'Ganho',
  lost: 'Perdido',
  nurturing: 'Nutrição',
}

const STATUS_LEAD_BADGE = {
  new: 'bg-sky-500/15 text-sky-600',
  in_progress: 'bg-violet-500/15 text-violet-600',
  demo_scheduled: 'bg-amber-500/15 text-amber-600',
  proposal_sent: 'bg-blue-500/15 text-blue-600',
  won: 'bg-emerald-500/15 text-emerald-600',
  lost: 'bg-destructive/15 text-destructive',
  nurturing: 'bg-muted text-muted-foreground',
}

const STATUS_COMMISSION_LABELS = {
  pending: 'Pendente',
  approved: 'Aprovada',
  cancelled: 'Cancelada',
  paid: 'Paga',
}

const PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', very_high: 'Muito alta' }

function StatCard({ label, value, icon: Icon, color = 'text-primary' }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-border/70 bg-card/80 px-4 py-4 shadow-[0_18px_60px_-35px_rgba(92,134,255,0.15)] backdrop-blur-xl">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight">{value ?? '—'}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ displayAffiliate, metrics }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div className="rounded-[22px] border border-border/70 bg-card/80 px-6 py-5 backdrop-blur-xl">
        <p className="text-[11px] font-medium text-muted-foreground">Bem-vindo de volta</p>
        <h1 className="text-[22px] font-semibold leading-tight">
          {displayAffiliate.name ?? 'Afiliado'}
        </h1>
        {displayAffiliate.email && (
          <p className="text-sm text-muted-foreground">{displayAffiliate.email}</p>
        )}
        {displayAffiliate.referral_url && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-[12px]">
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Seu link de indicação:</span>
            <a
              href={displayAffiliate.referral_url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-semibold text-primary hover:underline"
            >
              {displayAffiliate.referral_url}
            </a>
          </div>
        )}
        {!displayAffiliate.referral_url && displayAffiliate.slug && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-[12px]">
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Seu slug:</span>
            <span className="font-semibold text-primary">/{displayAffiliate.slug}</span>
          </div>
        )}
        {displayAffiliate.status && (
          <span
            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              displayAffiliate.status === 'active'
                ? 'bg-emerald-500/15 text-emerald-600'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {displayAffiliate.status === 'active' ? 'Ativo' : 'Inativo'}
          </span>
        )}
      </div>

      {/* Metrics */}
      {Object.keys(metrics).length > 0 && (
        <>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Suas métricas
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Cliques totais" value={metrics.total_clicks} icon={MousePointerClick} color="text-sky-500" />
            <StatCard label="Leads gerados" value={metrics.total_leads} icon={Users} color="text-violet-500" />
            <StatCard label="Leads ganhos" value={metrics.won_leads} icon={CheckCircle2} color="text-emerald-500" />
            <StatCard
              label="Comissões pendentes"
              value={metrics.pending_commissions != null ? `€${Number(metrics.pending_commissions).toFixed(2)}` : null}
              icon={TrendingUp}
              color="text-amber-500"
            />
            <StatCard
              label="Comissões pagas"
              value={metrics.paid_commissions != null ? `€${Number(metrics.paid_commissions).toFixed(2)}` : null}
              icon={BarChart3}
              color="text-primary"
            />
            <StatCard
              label="Bônus pendente"
              value={metrics.pending_bonus != null ? `€${Number(metrics.pending_bonus).toFixed(2)}` : null}
              icon={Gift}
              color="text-orange-500"
            />
          </div>

          {metrics.conversion_rate_click_to_lead != null && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-[10px] text-muted-foreground">Conversão clique → lead</p>
                <p className="text-lg font-semibold">{Number(metrics.conversion_rate_click_to_lead).toFixed(1)}%</p>
              </div>
              <div className="rounded-[14px] border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-[10px] text-muted-foreground">Conversão lead → cliente</p>
                <p className="text-lg font-semibold">{Number(metrics.conversion_rate_lead_to_customer ?? 0).toFixed(1)}%</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Plano de comissão */}
      {displayAffiliate.commission_plan && (
        <div className="rounded-[18px] border border-border/70 bg-card/80 px-5 py-4 backdrop-blur-xl">
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Seu plano de comissão
          </h2>
          <p className="text-[14px] font-semibold">{displayAffiliate.commission_plan.name}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
            <span>
              <strong className="text-foreground">{displayAffiliate.commission_plan.commission_percentage}%</strong>{' '}
              por conversão
            </span>
            <span>
              Por{' '}
              <strong className="text-foreground">{displayAffiliate.commission_plan.recurrence_months}</strong>{' '}
              meses
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leads tab
// ---------------------------------------------------------------------------

const LEAD_STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'new', label: 'Novo' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'demo_scheduled', label: 'Demo agendada' },
  { value: 'proposal_sent', label: 'Proposta enviada' },
  { value: 'won', label: 'Ganho' },
  { value: 'lost', label: 'Perdido' },
  { value: 'nurturing', label: 'Nutrição' },
]

const buildLeadForm = () => ({
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  whatsapp: '',
  priority: 'medium',
  general_notes: '',
})

function LeadsTab({ token, toast }) {
  const [leads, setLeads] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(buildLeadForm)
  const [saving, setSaving] = useState(false)

  const [noteTarget, setNoteTarget] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const [wonTarget, setWonTarget] = useState(null)
  const [wonAmount, setWonAmount] = useState('')
  const [markingWon, setMarkingWon] = useState(false)

  const [lostTarget, setLostTarget] = useState(null)
  const [lostReason, setLostReason] = useState('')
  const [markingLost, setMarkingLost] = useState(false)

  const load = useCallback(async (nextPage = page, q = search, st = statusFilter) => {
    setLoading(true)
    try {
      const result = await listAffiliateLeads(token, {
        page: nextPage,
        ...(q && { search: q }),
        ...(st && { status: st }),
      })
      setLeads(result.data)
      setMeta(result.meta)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar os leads.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, page, search, statusFilter, toast])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.company_name.trim()) return
    setSaving(true)
    try {
      const payload = {
        company_name: form.company_name.trim(),
        ...(form.contact_name && { contact_name: form.contact_name.trim() }),
        ...(form.email && { email: form.email.trim() }),
        ...(form.phone && { phone: form.phone.trim() }),
        ...(form.whatsapp && { whatsapp: form.whatsapp.trim() }),
        priority: form.priority,
        ...(form.general_notes && { general_notes: form.general_notes.trim() }),
      }
      const { duplicate_warning } = await createAffiliateLead(token, payload)
      toast({
        title: 'Lead criado',
        description: duplicate_warning ? 'Possível duplicata detectada.' : undefined,
      })
      setCreateOpen(false)
      setForm(buildLeadForm())
      await load(1, search, statusFilter)
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Falha ao criar lead.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteTarget || !noteText.trim()) return
    setAddingNote(true)
    try {
      await addAffiliateLeadNote(token, noteTarget.id, noteText.trim())
      toast({ title: 'Nota adicionada' })
      setNoteTarget(null)
      setNoteText('')
    } catch {
      toast({ title: 'Erro', description: 'Falha ao adicionar nota.', variant: 'error' })
    } finally {
      setAddingNote(false)
    }
  }

  const handleMarkWon = async () => {
    if (!wonTarget) return
    setMarkingWon(true)
    try {
      await markAffiliateLeadWon(token, wonTarget.id, wonAmount ? { base_amount: Number(wonAmount) } : {})
      toast({ title: 'Lead marcado como ganho' })
      setWonTarget(null)
      setWonAmount('')
      await load(page, search, statusFilter)
    } catch {
      toast({ title: 'Erro', description: 'Falha ao marcar como ganho.', variant: 'error' })
    } finally {
      setMarkingWon(false)
    }
  }

  const handleMarkLost = async () => {
    if (!lostTarget) return
    setMarkingLost(true)
    try {
      await markAffiliateLeadLost(token, lostTarget.id, lostReason ? { lost_reason: lostReason.trim() } : {})
      toast({ title: 'Lead marcado como perdido' })
      setLostTarget(null)
      setLostReason('')
      await load(page, search, statusFilter)
    } catch {
      toast({ title: 'Erro', description: 'Falha ao marcar como perdido.', variant: 'error' })
    } finally {
      setMarkingLost(false)
    }
  }

  const handleSearch = (q) => {
    setSearch(q)
    setPage(1)
    load(1, q, statusFilter)
  }

  const handleStatusFilter = (st) => {
    setStatusFilter(st)
    setPage(1)
    load(1, search, st)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(formControlClass, 'pl-8 w-full')}
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          className={cn(formControlClass, 'w-full sm:w-48')}
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
        >
          {LEAD_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Novo lead
        </Button>
      </div>

      {loading && <p className="py-8 text-center text-[12px] text-muted-foreground">Carregando...</p>}

      {!loading && leads.length === 0 && (
        <p className="py-8 text-center text-[12px] text-muted-foreground">Nenhum lead encontrado.</p>
      )}

      {!loading && leads.length > 0 && (
        <div className="flex flex-col gap-2">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[12px] font-semibold">{lead.company_name}</p>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase', STATUS_LEAD_BADGE[lead.status] ?? 'bg-muted text-muted-foreground')}>
                      {STATUS_LEAD_LABELS[lead.status] ?? lead.status}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {PRIORITY_LABELS[lead.priority] ?? lead.priority}
                    </span>
                  </div>
                  {lead.contact_name && (
                    <p className="text-[11px] text-muted-foreground">{lead.contact_name}</p>
                  )}
                  {lead.email && (
                    <p className="text-[10px] text-muted-foreground">{lead.email}</p>
                  )}
                  {lead.current_step && (
                    <p className="text-[10px] text-muted-foreground">Etapa: {lead.current_step.name}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => { setNoteTarget(lead); setNoteText('') }}>
                    Nota
                  </Button>
                  {lead.status !== 'won' && lead.status !== 'lost' && (
                    <>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] text-emerald-600 hover:text-emerald-700" onClick={() => { setWonTarget(lead); setWonAmount('') }}>
                        Ganho
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] text-destructive hover:text-destructive" onClick={() => { setLostTarget(lead); setLostReason('') }}>
                        Perdido
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage((p) => p - 1); load(page - 1, search, statusFilter) }}>Anterior</Button>
          <span className="text-[11px] text-muted-foreground">{page} / {meta.lastPage}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.lastPage} onClick={() => { setPage((p) => p + 1); load(page + 1, search, statusFilter) }}>Próximo</Button>
        </div>
      )}

      {/* Create lead dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Empresa *</label>
              <input className={formControlClass} value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Nome da empresa" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Contato</label>
              <input className={formControlClass} value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} placeholder="Nome do contato" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">E-mail</label>
                <input type="email" className={formControlClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Telefone</label>
                <input className={formControlClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+351900000000" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Prioridade</label>
              <select className={formControlClass} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="very_high">Muito alta</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Notas gerais</label>
              <textarea className={formControlClass} rows={2} value={form.general_notes} onChange={(e) => setForm((f) => ({ ...f, general_notes: e.target.value }))} placeholder="Observações..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving || !form.company_name.trim()}>
              {saving ? 'Criando...' : 'Criar lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={!!noteTarget} onOpenChange={() => setNoteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar nota — {noteTarget?.company_name}</DialogTitle></DialogHeader>
          <textarea className={cn(formControlClass, 'min-h-[80px]')} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Escreva a nota..." />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNoteTarget(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddNote} disabled={addingNote || !noteText.trim()}>
              {addingNote ? 'Salvando...' : 'Adicionar nota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark won dialog */}
      <Dialog open={!!wonTarget} onOpenChange={() => setWonTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como ganho — {wonTarget?.company_name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <label className="text-[11px] font-medium text-muted-foreground">Valor base (opcional, para cálculo de comissão)</label>
            <input type="number" min="0" step="0.01" className={formControlClass} value={wonAmount} onChange={(e) => setWonAmount(e.target.value)} placeholder="0.00" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setWonTarget(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleMarkWon} disabled={markingWon}>
              {markingWon ? 'Salvando...' : 'Confirmar ganho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark lost dialog */}
      <Dialog open={!!lostTarget} onOpenChange={() => setLostTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como perdido — {lostTarget?.company_name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <label className="text-[11px] font-medium text-muted-foreground">Motivo (opcional)</label>
            <input className={formControlClass} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Ex: preço, concorrência..." />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLostTarget(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleMarkLost} disabled={markingLost}>
              {markingLost ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Commissions tab
// ---------------------------------------------------------------------------

const COMMISSION_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'approved', label: 'Aprovada' },
  { value: 'paid', label: 'Paga' },
  { value: 'cancelled', label: 'Cancelada' },
]

const COMMISSION_STATUS_BADGE = {
  pending: 'bg-amber-500/15 text-amber-600',
  approved: 'bg-sky-500/15 text-sky-600',
  paid: 'bg-emerald-500/15 text-emerald-600',
  cancelled: 'bg-muted text-muted-foreground',
}

function CommissionsTab({ token, toast }) {
  const [commissions, setCommissions] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async (nextPage = page, st = statusFilter) => {
    setLoading(true)
    try {
      const result = await listAffiliateCommissions(token, { page: nextPage, ...(st && { status: st }) })
      setCommissions(result.data)
      setMeta(result.meta)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar as comissões.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, page, statusFilter, toast])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <select
          className={cn(formControlClass, 'w-48')}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); load(1, e.target.value) }}
        >
          {COMMISSION_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading && <p className="py-8 text-center text-[12px] text-muted-foreground">Carregando...</p>}

      {!loading && commissions.length === 0 && (
        <p className="py-8 text-center text-[12px] text-muted-foreground">Nenhuma comissão encontrada.</p>
      )}

      {!loading && commissions.length > 0 && (
        <div className="flex flex-col gap-2">
          {commissions.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] font-semibold">€{Number(c.commission_amount).toFixed(2)}</p>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase', COMMISSION_STATUS_BADGE[c.status] ?? 'bg-muted text-muted-foreground')}>
                    {STATUS_COMMISSION_LABELS[c.status] ?? c.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Mês {c.month_number} · {c.commission_percentage}% de €{Number(c.base_amount).toFixed(2)}
                </p>
                {c.due_date && (
                  <p className="text-[10px] text-muted-foreground">Vencimento: {c.due_date}</p>
                )}
              </div>
              {c.paid_at && (
                <p className="text-[10px] text-muted-foreground shrink-0">Pago: {c.paid_at.slice(0, 10)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage((p) => p - 1); load(page - 1, statusFilter) }}>Anterior</Button>
          <span className="text-[11px] text-muted-foreground">{page} / {meta.lastPage}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.lastPage} onClick={() => { setPage((p) => p + 1); load(page + 1, statusFilter) }}>Próximo</Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bonuses tab
// ---------------------------------------------------------------------------

const BONUS_STATUS_BADGE = {
  pending: 'bg-amber-500/15 text-amber-600',
  paid: 'bg-emerald-500/15 text-emerald-600',
}

function BonusesTab({ token, toast }) {
  const [bonuses, setBonuses] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const currentYear = new Date().getFullYear()
  const [yearFilter, setYearFilter] = useState(String(currentYear))

  const load = useCallback(async (nextPage = page, year = yearFilter) => {
    setLoading(true)
    try {
      const result = await listAffiliateBonuses(token, { page: nextPage, ...(year && { year: Number(year) }) })
      setBonuses(result.data)
      setMeta(result.meta)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar os bônus.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, page, yearFilter, toast])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <select
          className={cn(formControlClass, 'w-32')}
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setPage(1); load(1, e.target.value) }}
        >
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>

      {loading && <p className="py-8 text-center text-[12px] text-muted-foreground">Carregando...</p>}

      {!loading && bonuses.length === 0 && (
        <p className="py-8 text-center text-[12px] text-muted-foreground">Nenhum bônus encontrado.</p>
      )}

      {!loading && bonuses.length > 0 && (
        <div className="flex flex-col gap-2">
          {bonuses.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] font-semibold">€{Number(b.total_bonus_amount).toFixed(2)}</p>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase', BONUS_STATUS_BADGE[b.status] ?? 'bg-muted text-muted-foreground')}>
                    {b.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {b.month != null ? MONTHS[b.month - 1] : '—'} {b.year} · {b.clients_count} clientes (a cada {b.bonus_every_clients})
                </p>
              </div>
              {b.paid_at && (
                <p className="text-[10px] text-muted-foreground shrink-0">Pago: {b.paid_at.slice(0, 10)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage((p) => p - 1); load(page - 1, yearFilter) }}>Anterior</Button>
          <span className="text-[11px] text-muted-foreground">{page} / {meta.lastPage}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.lastPage} onClick={() => { setPage((p) => p + 1); load(page + 1, yearFilter) }}>Próximo</Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'commissions', label: 'Comissões', icon: TrendingUp },
  { id: 'bonuses', label: 'Bônus', icon: Gift },
]

export default function AffiliatePanel({ onLogout, authToken, authAffiliate, embeddedMode = false, initialTab = 'overview' } = {}) {
  const { token: storedToken, affiliate: storedAffiliate, clearSession } = useAffiliateAuth()
  const token = authToken ?? storedToken
  const affiliate = authAffiliate ?? storedAffiliate
  const { toast } = useToast()

  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (!token) {
      window.location.href = '/affiliate/login'
    }
  }, [token])

  const loadMe = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getAffiliateMe(token)
      setMe(data)
    } catch (err) {
      if (err?.response?.status === 401 && !embeddedMode) {
        clearSession()
        window.location.href = '/affiliate/login'
      } else {
        toast({ title: 'Erro', description: 'Não foi possível carregar seus dados.', variant: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }, [token, clearSession, embeddedMode, toast])

  useEffect(() => { loadMe() }, [loadMe])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      if (token && !onLogout) await affiliateLogout(token)
    } catch {
      // ignore logout errors
    } finally {
      clearSession()
      if (onLogout) {
        await onLogout()
      }
      window.location.href = '/affiliate/login'
    }
  }

  if (!token) return null

  const displayAffiliate = me ?? affiliate ?? {}
  const metrics = me?.metrics ?? {}

  const content = (
    <>
      {loading && (
        <p className="mt-20 text-center text-sm text-muted-foreground">Carregando...</p>
      )}

      {!loading && (
        <div className="flex flex-col gap-5">
          {activeTab === 'overview' && (
            <OverviewTab displayAffiliate={displayAffiliate} metrics={metrics} />
          )}
          {activeTab === 'leads' && (
            <LeadsTab token={token} toast={toast} />
          )}
          {activeTab === 'commissions' && (
            <CommissionsTab token={token} toast={toast} />
          )}
          {activeTab === 'bonuses' && (
            <BonusesTab token={token} toast={toast} />
          )}
        </div>
      )}
    </>
  )

  if (embeddedMode) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-[-10%] top-[-8%] h-64 w-64 rounded-full bg-primary/16 blur-[120px]" />
        <div className="absolute right-[-5%] top-1/4 h-72 w-72 rounded-full bg-sky-300/16 blur-[120px]" />
        <div className="absolute bottom-[-12%] right-[-12%] h-80 w-80 rounded-full bg-indigo-200/14 blur-[130px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border/70 bg-card/90 px-6 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <BrandSignature size="sm" />
            <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary sm:inline">
              Painel do Afiliado
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              {loggingOut ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
          {content}
        </main>
      </div>
    </div>
  )
}
