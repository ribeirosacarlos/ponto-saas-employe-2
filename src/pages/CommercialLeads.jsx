import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  KanbanSquare,
  List,
  MessageSquarePlus,
  MoveRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { formControlClass } from '../components/ui/form-controls'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { cn } from '../lib/utils'
import {
  addLeadNote,
  assignLead,
  createLead,
  deleteLead,
  getLead,
  listLeads,
  listSteps,
  markLeadLost,
  markLeadWon,
  moveLeadStep,
  setLeadNextAction,
  updateLead,
} from '../services/modules/commercial'
import { LeadKanban } from '../components/commercial/LeadKanban'

const ACCESS_REQUIRES = { anyOf: ['super_admin', 'commercial_manager', 'commercial_agent'] }
const MANAGE_REQUIRES = { anyOf: ['super_admin', 'commercial_manager'] }

const STATUS_OPTIONS = ['new', 'in_progress', 'demo_scheduled', 'proposal_sent', 'won', 'lost', 'nurturing']
const STATUS_LABELS = {
  new: 'Novo',
  in_progress: 'Em andamento',
  demo_scheduled: 'Demo agendada',
  proposal_sent: 'Proposta enviada',
  won: 'Ganho',
  lost: 'Perdido',
  nurturing: 'Nutrição',
}
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'very_high']
const PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', very_high: 'Muito alta' }
const NEXT_ACTION_TYPES = ['ligacao', 'whatsapp', 'email', 'reuniao', 'demonstracao', 'outro']

const statusColor = (status) => {
  if (status === 'won') return 'bg-emerald-500/15 text-emerald-600'
  if (status === 'lost') return 'bg-destructive/15 text-destructive'
  if (status === 'new') return 'bg-sky-500/15 text-sky-600'
  if (status === 'demo_scheduled') return 'bg-violet-500/15 text-violet-600'
  if (status === 'proposal_sent') return 'bg-blue-500/15 text-blue-600'
  if (status === 'nurturing') return 'bg-amber-500/15 text-amber-600'
  return 'bg-muted text-muted-foreground'
}

const priorityColor = (priority) => {
  if (priority === 'very_high') return 'text-destructive'
  if (priority === 'high') return 'text-amber-500'
  if (priority === 'medium') return 'text-primary'
  return 'text-muted-foreground'
}

const buildLeadForm = (lead = null) => ({
  id: lead?.id ?? '',
  company_name: lead?.company_name ?? '',
  contact_name: lead?.contact_name ?? '',
  email: lead?.email ?? '',
  phone: lead?.phone ?? '',
  whatsapp: lead?.whatsapp ?? '',
  website: lead?.website ?? '',
  country: lead?.country ?? '',
  city: lead?.city ?? '',
  segment: lead?.segment ?? '',
  employees_count: lead?.employees_count ?? '',
  source: lead?.source ?? '',
  priority: lead?.priority ?? 'medium',
  general_notes: lead?.general_notes ?? '',
  assigned_to_user_id: lead?.assigned_to_user_id ?? '',
})

export default function CommercialLeads() {
  const { toast } = useToast()
  const roles = useAuthStore((s) => s.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])
  const hasManage = useMemo(() => canRenderCard(capabilities, MANAGE_REQUIRES), [capabilities])

  const [viewMode, setViewMode] = useState('kanban')

  const [leads, setLeads] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const [steps, setSteps] = useState([])

  // Lead form dialog
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [form, setForm] = useState(() => buildLeadForm())
  const [saving, setSaving] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  // Detail dialog
  const [detailLead, setDetailLead] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  // Move step dialog
  const [moveStepOpen, setMoveStepOpen] = useState(false)
  const [moveTarget, setMoveTarget] = useState(null)
  const [moveStepId, setMoveStepId] = useState('')
  const [moveNote, setMoveNote] = useState('')
  const [moving, setMoving] = useState(false)

  // Note dialog
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteTarget, setNoteTarget] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Mark won/lost
  const [wonOpen, setWonOpen] = useState(false)
  const [wonTarget, setWonTarget] = useState(null)
  const [wonBaseAmount, setWonBaseAmount] = useState('')
  const [actioning, setActioning] = useState(null)
  const [lostOpen, setLostOpen] = useState(false)
  const [lostTarget, setLostTarget] = useState(null)
  const [lostReason, setLostReason] = useState('')

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (pg = page, q = search, st = statusFilter) => {
    if (!hasAccess) return
    setLoading(true)
    try {
      const result = await listLeads({ page: pg, search: q || undefined, status: st || undefined })
      setLeads(result.data)
      setMeta(result.meta)
    } catch (err) {
      console.error('[CommercialLeads]', err)
      toast({ title: 'Erro', description: 'Não foi possível carregar os leads.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [hasAccess, page, search, statusFilter, toast])

  useEffect(() => {
    if (!hasAccess) return
    listSteps().then(setSteps).catch(() => {})
  }, [hasAccess])

  const handleOpenCreate = () => {
    setFormMode('create')
    setForm(buildLeadForm())
    setDuplicateWarning(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (lead) => {
    setFormMode('edit')
    setForm(buildLeadForm(lead))
    setDuplicateWarning(null)
    setFormOpen(true)
  }

  const handleOpenDetail = async (lead) => {
    setDetailLead(null)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const full = await getLead(lead.id)
      setDetailLead(full)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar o lead.', variant: 'error' })
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSaveLead = async () => {
    if (!form.company_name.trim()) return
    setSaving(true)
    setDuplicateWarning(null)
    try {
      const payload = {
        company_name: form.company_name.trim(),
        ...(form.contact_name && { contact_name: form.contact_name.trim() }),
        ...(form.email && { email: form.email.trim() }),
        ...(form.phone && { phone: form.phone.trim() }),
        ...(form.whatsapp && { whatsapp: form.whatsapp.trim() }),
        ...(form.website && { website: form.website.trim() }),
        ...(form.country && { country: form.country.trim() }),
        ...(form.city && { city: form.city.trim() }),
        ...(form.segment && { segment: form.segment.trim() }),
        ...(form.employees_count !== '' && { employees_count: Number(form.employees_count) }),
        ...(form.source && { source: form.source.trim() }),
        priority: form.priority,
        ...(form.general_notes && { general_notes: form.general_notes.trim() }),
        ...(form.assigned_to_user_id && { assigned_to_user_id: form.assigned_to_user_id }),
      }

      if (formMode === 'create') {
        const result = await createLead(payload)
        if (result.duplicate_warning && result.possible_duplicates?.length) {
          setDuplicateWarning(result.possible_duplicates)
        }
        toast({ title: 'Lead criado', description: `"${form.company_name}" adicionado ao pipeline.` })
        setFormOpen(false)
      } else {
        await updateLead(form.id, payload)
        toast({ title: 'Lead atualizado' })
        setFormOpen(false)
      }
      await refreshCurrentView()
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Falha ao salvar lead.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleMoveStep = async () => {
    if (!moveTarget || !moveStepId) return
    setMoving(true)
    try {
      await moveLeadStep(moveTarget.id, {
        step_id: moveStepId,
        ...(moveNote && { note: moveNote }),
      })
      toast({ title: 'Etapa atualizada' })
      setMoveStepOpen(false)
      setMoveTarget(null)
      await refreshCurrentView()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao mover etapa.', variant: 'error' })
    } finally {
      setMoving(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteTarget || !noteText.trim()) return
    setAddingNote(true)
    try {
      await addLeadNote(noteTarget.id, noteText.trim())
      toast({ title: 'Nota adicionada' })
      setNoteOpen(false)
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
    setActioning(wonTarget.id)
    try {
      await markLeadWon(wonTarget.id, {
        ...(wonBaseAmount && { base_amount: Number(wonBaseAmount) }),
      })
      toast({ title: 'Lead marcado como ganho!' })
      setWonOpen(false)
      setWonTarget(null)
      setWonBaseAmount('')
      await refreshCurrentView()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao marcar como ganho.', variant: 'error' })
    } finally {
      setActioning(null)
    }
  }

  const handleMarkLost = async () => {
    if (!lostTarget) return
    setActioning(lostTarget.id)
    try {
      await markLeadLost(lostTarget.id, {
        ...(lostReason && { lost_reason: lostReason }),
      })
      toast({ title: 'Lead marcado como perdido.' })
      setLostOpen(false)
      setLostTarget(null)
      setLostReason('')
      await refreshCurrentView()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao marcar como perdido.', variant: 'error' })
    } finally {
      setActioning(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteLead(deleteTarget.id)
      toast({ title: 'Lead removido' })
      setDeleteTarget(null)
      await refreshCurrentView()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao remover lead.', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  // ── Kanban API adapters ────────────────────────────────────────────────────

  const loadKanban = useCallback(async () => {
    if (!hasAccess) return
    setLoading(true)
    try {
      const [stepsResult, leadsResult] = await Promise.all([
        listSteps(),
        listLeads({ per_page: 200, page: 1, search: search || undefined, status: statusFilter || undefined }),
      ])
      setSteps(stepsResult ?? [])
      setLeads(leadsResult.data ?? [])
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar o pipeline.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [hasAccess, search, statusFilter, toast])

  const refreshCurrentView = useCallback(async () => {
    if (viewMode === 'kanban') {
      await loadKanban()
      return
    }

    await load()
  }, [load, loadKanban, viewMode])

  useEffect(() => {
    if (viewMode === 'kanban') {
      loadKanban()
      return
    }

    load()
  }, [load, loadKanban, viewMode])

  // search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewMode === 'kanban') {
        loadKanban()
        return
      }

      load(1, search, statusFilter)
    }, 400)
    return () => clearTimeout(timer)
  }, [load, loadKanban, search, statusFilter, viewMode])

  const handleKanbanMoveStep = async (leadId, stepId, note) => {
    try {
      await moveLeadStep(leadId, { step_id: stepId, ...(note && { note }) })
      toast({ title: 'Etapa atualizada' })
    } catch {
      toast({ title: 'Erro', description: 'Falha ao mover etapa.', variant: 'error' })
      throw new Error('move-step failed')
    }
  }

  const handleKanbanAddNote = async (leadId, note) => {
    try {
      await addLeadNote(leadId, note)
      toast({ title: 'Nota adicionada' })
    } catch {
      toast({ title: 'Erro', description: 'Falha ao adicionar nota.', variant: 'error' })
      throw new Error('note failed')
    }
  }

  const handleKanbanMarkWon = async (leadId, payload) => {
    try {
      await markLeadWon(leadId, payload)
      toast({ title: 'Lead marcado como ganho!' })
    } catch {
      toast({ title: 'Erro', description: 'Falha ao marcar como ganho.', variant: 'error' })
      throw new Error('won failed')
    }
  }

  const handleKanbanMarkLost = async (leadId, reason) => {
    try {
      await markLeadLost(leadId, reason ? { lost_reason: reason } : {})
      toast({ title: 'Lead marcado como perdido.' })
    } catch {
      toast({ title: 'Erro', description: 'Falha ao marcar como perdido.', variant: 'error' })
      throw new Error('lost failed')
    }
  }

  const handleKanbanNextAction = async (leadId, payload) => {
    try {
      await setLeadNextAction(leadId, payload)
      toast({ title: 'Próxima ação salva.' })
    } catch {
      toast({ title: 'Erro', description: 'Falha ao salvar próxima ação.', variant: 'error' })
      throw new Error('next-action failed')
    }
  }

  const handleKanbanCreate = async (payload) => {
    try {
      const result = await createLead(payload)
      if (result.duplicate_warning && result.possible_duplicates?.length) {
        toast({ title: 'Lead criado', description: `Possível duplicata: ${result.possible_duplicates.map((d) => d.company_name).join(', ')}` })
      } else {
        toast({ title: 'Lead criado' })
      }
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Falha ao criar lead.', variant: 'error' })
      throw err
    }
  }

  if (!hasAccess) {
    return (
      <PageContainer>
        <p className="mt-10 text-center text-sm text-muted-foreground">Acesso negado.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-5">
        <AppTopBar
          icon={<UserCheck className="h-3.5 w-3.5" />}
          eyebrow="Comercial"
          title="Leads"
          subtitle="Gerencie o pipeline de leads comerciais"
          actions={
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => { if (viewMode !== 'list') { setViewMode('list'); load(1, search, statusFilter) } }}
                  className={cn(
                    'flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium transition-colors',
                    viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <List className="h-3 w-3" />
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => { if (viewMode !== 'kanban') { setViewMode('kanban'); loadKanban() } }}
                  className={cn(
                    'flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium transition-colors',
                    viewMode === 'kanban' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <KanbanSquare className="h-3 w-3" />
                  Kanban
                </button>
              </div>
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo lead
              </Button>
            </div>
          }
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={cn(formControlClass, 'pl-7 w-52')}
                  placeholder="Buscar empresa, contato..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={cn(formControlClass, 'w-44')}
                value={statusFilter}
                onChange={(e) => {
                  const nextStatus = e.target.value
                  setStatusFilter(nextStatus)

                  if (viewMode === 'kanban') {
                    return
                  }

                  load(1, search, nextStatus)
                }}
              >
                <option value="">Todos os status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          }
        />

        {/* Kanban view */}
        {viewMode === 'kanban' && (
          <LeadKanban
            steps={steps}
            leads={leads}
            loading={loading}
            onMoveStep={handleKanbanMoveStep}
            onAddNote={handleKanbanAddNote}
            onMarkWon={handleKanbanMarkWon}
            onMarkLost={handleKanbanMarkLost}
            onSetNextAction={handleKanbanNextAction}
            onCreateLead={handleKanbanCreate}
            onRefresh={loadKanban}
          />
        )}

        {/* List view */}
        {viewMode === 'list' && loading && (
          <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>
        )}

        {viewMode === 'list' && !loading && leads.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhum lead encontrado.</p>
        )}

        {viewMode === 'list' && !loading && leads.length > 0 && (
          <div className="flex flex-col gap-2">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="flex flex-col gap-2 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="text-left text-[13px] font-semibold hover:text-primary transition-colors"
                        onClick={() => handleOpenDetail(lead)}
                      >
                        {lead.company_name}
                      </button>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusColor(lead.status)}`}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                      <span className={`text-[10px] font-medium ${priorityColor(lead.priority)}`}>
                        ▲ {PRIORITY_LABELS[lead.priority] ?? lead.priority}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                      {lead.contact_name && <span>{lead.contact_name}</span>}
                      {lead.email && <span>{lead.email}</span>}
                      {lead.phone && <span>{lead.phone}</span>}
                      {lead.current_step && (
                        <span className="text-primary/80">📍 {lead.current_step.name}</span>
                      )}
                      {lead.assigned_to_user && (
                        <span>👤 {lead.assigned_to_user.name}</span>
                      )}
                    </div>
                    {lead.next_action_at && (
                      <p className="text-[10px] text-amber-600">
                        ⏰ Próxima ação: {lead.next_action_type} em{' '}
                        {new Date(lead.next_action_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Mover etapa"
                      onClick={() => { setMoveTarget(lead); setMoveStepId(lead.current_step_id ?? ''); setMoveNote(''); setMoveStepOpen(true) }}
                    >
                      <MoveRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Adicionar nota"
                      onClick={() => { setNoteTarget(lead); setNoteText(''); setNoteOpen(true) }}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                    </Button>
                    {lead.status !== 'won' && lead.status !== 'lost' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600 hover:text-emerald-600"
                          title="Marcar como ganho"
                          onClick={() => { setWonTarget(lead); setWonBaseAmount(''); setWonOpen(true) }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Marcar como perdido"
                          onClick={() => { setLostTarget(lead); setLostReason(''); setLostOpen(true) }}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Editar"
                      onClick={() => handleOpenEdit(lead)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {hasManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Remover"
                        onClick={() => setDeleteTarget(lead)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'list' && meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage((p) => p - 1); load(page - 1) }}>Anterior</Button>
            <span className="text-[11px] text-muted-foreground">{page} / {meta.lastPage} — {meta.total} leads</span>
            <Button variant="outline" size="sm" disabled={page >= meta.lastPage} onClick={() => { setPage((p) => p + 1); load(page + 1) }}>Próximo</Button>
          </div>
        )}
      </div>

      {/* Create / Edit Lead Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Novo lead' : 'Editar lead'}</DialogTitle>
          </DialogHeader>
          {duplicateWarning && (
            <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700">
              ⚠️ Possíveis duplicatas detectadas:{' '}
              {duplicateWarning.map((d) => d.company_name).join(', ')}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Empresa *</label>
              <input className={formControlClass} value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Acme Ltda" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Contato</label>
              <input className={formControlClass} value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} placeholder="João Silva" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">E-mail</label>
              <input type="email" className={formControlClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="joao@acme.com" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Telefone</label>
              <input className={formControlClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+351900000000" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">WhatsApp</label>
              <input className={formControlClass} value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="+351900000000" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Website</label>
              <input className={formControlClass} value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Segmento</label>
              <input className={formControlClass} value={form.segment} onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))} placeholder="Varejo" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">País</label>
              <input className={formControlClass} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="PT" maxLength={2} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Cidade</label>
              <input className={formControlClass} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Lisboa" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Funcionários</label>
              <input type="number" className={formControlClass} value={form.employees_count} onChange={(e) => setForm((f) => ({ ...f, employees_count: e.target.value }))} placeholder="10" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Origem</label>
              <input className={formControlClass} value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="indicacao, google, etc." />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Prioridade</label>
              <select className={formControlClass} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Notas gerais</label>
              <textarea className={cn(formControlClass, 'h-20 resize-none')} value={form.general_notes} onChange={(e) => setForm((f) => ({ ...f, general_notes: e.target.value }))} placeholder="Observações sobre o lead..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveLead} disabled={saving || !form.company_name.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{detailLead?.company_name ?? 'Lead'}</DialogTitle>
          </DialogHeader>
          {detailLoading && <p className="text-center text-sm text-muted-foreground py-4">Carregando...</p>}
          {!detailLoading && detailLead && (
            <div className="flex flex-col gap-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  ['Contato', detailLead.contact_name],
                  ['E-mail', detailLead.email],
                  ['Telefone', detailLead.phone],
                  ['WhatsApp', detailLead.whatsapp],
                  ['País', detailLead.country],
                  ['Cidade', detailLead.city],
                  ['Segmento', detailLead.segment],
                  ['Funcionários', detailLead.employees_count],
                  ['Origem', detailLead.source],
                  ['Pontuação', detailLead.score],
                ]
                  .filter(([, v]) => v !== null && v !== undefined && v !== '')
                  .map(([label, value]) => (
                    <div key={label}>
                      <p className="text-muted-foreground">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
              </div>
              {detailLead.general_notes && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Notas gerais</p>
                  <p className="text-[12px] rounded-lg bg-muted/50 px-3 py-2">{detailLead.general_notes}</p>
                </div>
              )}
              {detailLead.notes?.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Notas ({detailLead.notes.length})</p>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {detailLead.notes.map((n) => (
                      <div key={n.id} className="rounded-lg bg-muted/50 px-3 py-2 text-[11px]">
                        <p>{n.note}</p>
                        <p className="text-muted-foreground mt-0.5">{n.user?.name} · {n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR') : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailLead.step_logs?.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Histórico de etapas ({detailLead.step_logs.length})</p>
                  <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                    {detailLead.step_logs.map((log, idx) => (
                      <p key={log.id ?? idx} className="text-[10px] text-muted-foreground">{log.step?.name ?? log.step_id} — {log.status}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Step Dialog */}
      <Dialog open={moveStepOpen} onOpenChange={setMoveStepOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover etapa — {moveTarget?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Etapa *</label>
              <select className={formControlClass} value={moveStepId} onChange={(e) => setMoveStepId(e.target.value)}>
                <option value="">Selecione...</option>
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>{s.position}. {s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Nota (opcional)</label>
              <input className={formControlClass} value={moveNote} onChange={(e) => setMoveNote(e.target.value)} placeholder="Observação sobre a mudança..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoveStepOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleMoveStep} disabled={moving || !moveStepId}>
              {moving ? 'Movendo...' : 'Mover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova nota — {noteTarget?.company_name}</DialogTitle>
          </DialogHeader>
          <textarea
            className={cn(formControlClass, 'h-24 resize-none')}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Escreva a nota..."
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNoteOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddNote} disabled={addingNote || !noteText.trim()}>
              {addingNote ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Won Dialog */}
      <Dialog open={wonOpen} onOpenChange={setWonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como ganho — {wonTarget?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Valor base (€, opcional)</label>
              <input type="number" step="0.01" className={formControlClass} value={wonBaseAmount} onChange={(e) => setWonBaseAmount(e.target.value)} placeholder="100.00" />
              <p className="text-[10px] text-muted-foreground">Se o lead tiver afiliado e valor informado, as comissões serão geradas automaticamente.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setWonOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleMarkWon} disabled={actioning === wonTarget?.id}>
              {actioning === wonTarget?.id ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Lost Dialog */}
      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como perdido — {lostTarget?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 py-2">
            <label className="text-[11px] font-medium text-muted-foreground">Motivo (opcional)</label>
            <input className={formControlClass} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Preço, concorrente, etc." />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLostOpen(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleMarkLost} disabled={actioning === lostTarget?.id}>
              {actioning === lostTarget?.id ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover lead</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteTarget?.company_name}</strong>? (soft delete)
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
