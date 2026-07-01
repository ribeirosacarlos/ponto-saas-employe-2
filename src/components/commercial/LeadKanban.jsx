import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  CalendarClock,
  CheckCircle2,
  MessageSquarePlus,
  MoveRight,
  Plus,
  XCircle,
} from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { formControlClass } from '../ui/form-controls'
import { cn } from '../../lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NO_STEP_ID = '__no_step__'

const STATUS_BADGE = {
  new: 'bg-sky-500/15 text-sky-600',
  in_progress: 'bg-violet-500/15 text-violet-600',
  demo_scheduled: 'bg-amber-500/15 text-amber-600',
  proposal_sent: 'bg-blue-500/15 text-blue-600',
  won: 'bg-emerald-500/15 text-emerald-600',
  lost: 'bg-destructive/15 text-destructive',
  nurturing: 'bg-muted text-muted-foreground',
}

const STATUS_LABELS = {
  new: 'Novo',
  in_progress: 'Em andamento',
  demo_scheduled: 'Demo agendada',
  proposal_sent: 'Proposta enviada',
  won: 'Ganho',
  lost: 'Perdido',
  nurturing: 'Nutrição',
}

const PRIORITY_DOT = {
  very_high: 'bg-destructive',
  high: 'bg-amber-500',
  medium: 'bg-primary',
  low: 'bg-muted-foreground',
}

const PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', very_high: 'Muito alta' }

const NEXT_ACTION_TYPES = ['ligacao', 'whatsapp', 'email', 'reuniao', 'demonstracao', 'outro']

// ---------------------------------------------------------------------------
// Draggable card
// ---------------------------------------------------------------------------

function DraggableCard({ lead, steps, onNote, onMoveStep, onMarkWon, onMarkLost, onNextAction }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { fromStepId: lead.current_step_id ?? NO_STEP_ID },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-[14px] border border-border/70 bg-card/90 px-3 py-2.5 backdrop-blur-xl cursor-grab active:cursor-grabbing select-none',
        'shadow-[0_4px_20px_-8px_rgba(92,134,255,0.12)] transition-shadow',
        isDragging && 'opacity-40 ring-2 ring-primary/30',
      )}
    >
      <CardContent
        lead={lead}
        steps={steps}
        onNote={onNote}
        onMoveStep={onMoveStep}
        onMarkWon={onMarkWon}
        onMarkLost={onMarkLost}
        onNextAction={onNextAction}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card content (shared between draggable and overlay)
// ---------------------------------------------------------------------------

function CardContent({ lead, steps, onNote, onMoveStep, onMarkWon, onMarkLost, onNextAction, dragHandleProps = {} }) {
  const isFinished = lead.status === 'won' || lead.status === 'lost'

  return (
    <div {...dragHandleProps}>
      {/* Header */}
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-[12px] font-semibold leading-snug">{lead.company_name}</p>
        <div className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT[lead.priority] ?? 'bg-muted-foreground')} title={PRIORITY_LABELS[lead.priority]} />
      </div>

      {lead.contact_name && (
        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{lead.contact_name}</p>
      )}

      {/* Status */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase', STATUS_BADGE[lead.status] ?? 'bg-muted text-muted-foreground')}>
          {STATUS_LABELS[lead.status] ?? lead.status}
        </span>
      </div>

      {/* Next action */}
      {lead.next_action_at && (
        <p className="mt-1 text-[10px] text-amber-600 flex items-center gap-1">
          <CalendarClock className="h-3 w-3 shrink-0" />
          {lead.next_action_type} · {new Date(lead.next_action_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </p>
      )}

      {/* Actions */}
      <div className="mt-2 flex flex-wrap gap-1 border-t border-border/40 pt-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onNote(lead)}
          className="flex h-6 items-center gap-1 rounded-md border border-border/60 bg-background/60 px-1.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          title="Adicionar nota"
        >
          <MessageSquarePlus className="h-3 w-3" />
          Nota
        </button>
        <button
          type="button"
          onClick={() => onMoveStep(lead)}
          className="flex h-6 items-center gap-1 rounded-md border border-border/60 bg-background/60 px-1.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          title="Mover etapa"
        >
          <MoveRight className="h-3 w-3" />
          Mover
        </button>
        <button
          type="button"
          onClick={() => onNextAction(lead)}
          className="flex h-6 items-center gap-1 rounded-md border border-border/60 bg-background/60 px-1.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          title="Próxima ação"
        >
          <CalendarClock className="h-3 w-3" />
          Ação
        </button>
        {!isFinished && (
          <>
            <button
              type="button"
              onClick={() => onMarkWon(lead)}
              className="flex h-6 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[9px] font-medium text-emerald-600 hover:bg-emerald-500/20 transition-colors"
              title="Marcar como ganho"
            >
              <CheckCircle2 className="h-3 w-3" />
              Ganho
            </button>
            <button
              type="button"
              onClick={() => onMarkLost(lead)}
              className="flex h-6 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-1.5 text-[9px] font-medium text-destructive hover:bg-destructive/20 transition-colors"
              title="Marcar como perdido"
            >
              <XCircle className="h-3 w-3" />
              Perdido
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Droppable column
// ---------------------------------------------------------------------------

function KanbanColumn({ step, leads, steps, onNote, onMoveStep, onMarkWon, onMarkLost, onNextAction }) {
  const { setNodeRef, isOver } = useDroppable({ id: step.id })

  return (
    <div className="flex w-[270px] shrink-0 flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center gap-2 rounded-[12px] border border-border/60 bg-card/70 px-3 py-2 backdrop-blur-xl">
        <p className="flex-1 text-[11px] font-semibold leading-tight">{step.name}</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 rounded-[14px] border-2 border-dashed min-h-[120px] p-2 transition-colors',
          isOver ? 'border-primary/50 bg-primary/5' : 'border-border/30 bg-transparent',
        )}
      >
        {leads.map((lead) => (
          <DraggableCard
            key={lead.id}
            lead={lead}
            steps={steps}
            onNote={onNote}
            onMoveStep={onMoveStep}
            onMarkWon={onMarkWon}
            onMarkLost={onMarkLost}
            onNextAction={onNextAction}
          />
        ))}

        {leads.length === 0 && (
          <p className="py-4 text-center text-[10px] text-muted-foreground/50">Arraste aqui</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main LeadKanban
// ---------------------------------------------------------------------------

export function LeadKanban({
  steps = [],
  leads = [],
  loading = false,
  onMoveStep,
  onAddNote,
  onMarkWon,
  onMarkLost,
  onSetNextAction,
  onCreateLead,
  onRefresh,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Optimistic local state — syncs from prop, updated immediately on actions
  const [localLeads, setLocalLeads] = useState(leads)
  useEffect(() => { setLocalLeads(leads) }, [leads])

  const patchLead = (id, updates) =>
    setLocalLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))

  const [activeLead, setActiveLead] = useState(null)

  // Dialogs state
  const [noteTarget, setNoteTarget] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const [moveTarget, setMoveTarget] = useState(null)
  const [moveStepId, setMoveStepId] = useState('')
  const [moveNote, setMoveNote] = useState('')
  const [moving, setMoving] = useState(false)

  const [wonTarget, setWonTarget] = useState(null)
  const [wonAmount, setWonAmount] = useState('')
  const [markingWon, setMarkingWon] = useState(false)

  const [lostTarget, setLostTarget] = useState(null)
  const [lostReason, setLostReason] = useState('')
  const [markingLost, setMarkingLost] = useState(false)

  const [nextActionTarget, setNextActionTarget] = useState(null)
  const [nextActionForm, setNextActionForm] = useState({ type: 'ligacao', at: '', user_id: '' })
  const [settingNextAction, setSettingNextAction] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', priority: 'medium', general_notes: '' })
  const [creating, setCreating] = useState(false)

  // Build columns
  const noStepColumn = useMemo(() => ({ id: NO_STEP_ID, name: 'Sem etapa', position: -1 }), [])
  const allColumns = useMemo(() => [noStepColumn, ...steps], [noStepColumn, steps])

  const leadsByColumn = useMemo(() => {
    const map = {}
    allColumns.forEach((col) => { map[col.id] = [] })
    localLeads.forEach((lead) => {
      const key = lead.current_step_id ?? NO_STEP_ID
      if (map[key]) map[key].push(lead)
      else map[NO_STEP_ID].push(lead)
    })
    return map
  }, [allColumns, localLeads])

  // ── DnD handlers ──────────────────────────────────────────────────────────

  const handleDragStart = ({ active }) => {
    setActiveLead(localLeads.find((l) => l.id === active.id) ?? null)
  }

  const handleDragEnd = async ({ active, over }) => {
    setActiveLead(null)
    if (!over) return
    const lead = localLeads.find((l) => l.id === active.id)
    if (!lead) return
    const fromColId = lead.current_step_id ?? NO_STEP_ID
    const toColId = over.id
    if (fromColId === toColId) return
    const toStepId = toColId === NO_STEP_ID ? null : toColId
    // Optimistic: move card to target column immediately
    patchLead(lead.id, { current_step_id: toStepId })
    try {
      await onMoveStep(lead.id, toStepId, undefined)
    } catch {
      // Revert on failure
      patchLead(lead.id, { current_step_id: lead.current_step_id })
    }
  }

  // ── Card action handlers ───────────────────────────────────────────────────

  const openNote = (lead) => { setNoteTarget(lead); setNoteText('') }
  const openMoveStep = (lead) => { setMoveTarget(lead); setMoveStepId(lead.current_step_id ?? ''); setMoveNote('') }
  const openMarkWon = (lead) => { setWonTarget(lead); setWonAmount('') }
  const openMarkLost = (lead) => { setLostTarget(lead); setLostReason('') }
  const openNextAction = (lead) => {
    setNextActionTarget(lead)
    setNextActionForm({
      type: lead.next_action_type ?? 'ligacao',
      at: lead.next_action_at ? lead.next_action_at.slice(0, 16) : '',
      user_id: lead.next_action_user_id ?? '',
    })
  }

  // Fire-and-forget: close dialog immediately, API runs in background
  const handleAddNote = async () => {
    if (!noteTarget || !noteText.trim()) return
    setAddingNote(true)
    const id = noteTarget.id
    const text = noteText.trim()
    setNoteTarget(null)
    setNoteText('')
    try {
      await onAddNote(id, text)
    } finally {
      setAddingNote(false)
    }
  }

  const handleMoveStep = async () => {
    if (!moveTarget || !moveStepId) return
    setMoving(true)
    const snapshot = { current_step_id: moveTarget.current_step_id }
    const id = moveTarget.id
    // Optimistic update
    patchLead(id, { current_step_id: moveStepId })
    setMoveTarget(null)
    try {
      await onMoveStep(id, moveStepId, moveNote.trim() || undefined)
    } catch {
      patchLead(id, snapshot)
    } finally {
      setMoving(false)
    }
  }

  const handleMarkWon = async () => {
    if (!wonTarget) return
    const id = wonTarget.id
    const snapshot = { status: wonTarget.status }
    setMarkingWon(true)
    patchLead(id, { status: 'won' })
    setWonTarget(null)
    try {
      await onMarkWon(id, wonAmount ? { base_amount: Number(wonAmount) } : {})
    } catch {
      patchLead(id, snapshot)
    } finally {
      setMarkingWon(false)
    }
  }

  const handleMarkLost = async () => {
    if (!lostTarget) return
    const id = lostTarget.id
    const snapshot = { status: lostTarget.status }
    setMarkingLost(true)
    patchLead(id, { status: 'lost' })
    setLostTarget(null)
    try {
      await onMarkLost(id, lostReason.trim() || undefined)
    } catch {
      patchLead(id, snapshot)
    } finally {
      setMarkingLost(false)
    }
  }

  const handleSetNextAction = async () => {
    if (!nextActionTarget || !nextActionForm.at) return
    setSettingNextAction(true)
    const id = nextActionTarget.id
    const snapshot = {
      next_action_type: nextActionTarget.next_action_type,
      next_action_at: nextActionTarget.next_action_at,
    }
    const payload = {
      next_action_type: nextActionForm.type,
      next_action_at: nextActionForm.at,
      ...(nextActionForm.user_id && { next_action_user_id: nextActionForm.user_id }),
    }
    setSettingNextAction(true)
    patchLead(id, { next_action_type: nextActionForm.type, next_action_at: nextActionForm.at })
    setNextActionTarget(null)
    try {
      await onSetNextAction(id, payload)
    } catch {
      patchLead(id, snapshot)
    } finally {
      setSettingNextAction(false)
    }
  }

  const handleCreateLead = async () => {
    if (!createForm.company_name.trim() || !onCreateLead) return
    setCreating(true)
    try {
      const payload = {
        company_name: createForm.company_name.trim(),
        ...(createForm.contact_name && { contact_name: createForm.contact_name.trim() }),
        ...(createForm.email && { email: createForm.email.trim() }),
        ...(createForm.phone && { phone: createForm.phone.trim() }),
        priority: createForm.priority,
        ...(createForm.general_notes && { general_notes: createForm.general_notes.trim() }),
      }
      await onCreateLead(payload)
      setCreateOpen(false)
      setCreateForm({ company_name: '', contact_name: '', email: '', phone: '', priority: 'medium', general_notes: '' })
      // Refresh needed here to get the server-generated ID and data
      onRefresh()
    } finally {
      setCreating(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[12px] text-muted-foreground">Carregando pipeline...</p>
      </div>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {localLeads.length} lead{localLeads.length !== 1 ? 's' : ''} no pipeline
        </p>
        {onCreateLead && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo lead
          </Button>
        )}
      </div>

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {allColumns.map((step) => (
            <KanbanColumn
              key={step.id}
              step={step}
              leads={leadsByColumn[step.id] ?? []}
              steps={steps}
              onNote={openNote}
              onMoveStep={openMoveStep}
              onMarkWon={openMarkWon}
              onMarkLost={openMarkLost}
              onNextAction={openNextAction}
            />
          ))}
        </div>

        {/* Drag overlay — shows floating card while dragging */}
        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div className="w-[270px] rounded-[14px] border border-primary/30 bg-card/95 px-3 py-2.5 shadow-[0_12px_40px_-10px_rgba(92,134,255,0.4)] backdrop-blur-xl ring-1 ring-primary/20">
              <CardContent lead={activeLead} steps={steps} onNote={() => {}} onMoveStep={() => {}} onMarkWon={() => {}} onMarkLost={() => {}} onNextAction={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}

      {/* Note */}
      <Dialog open={!!noteTarget} onOpenChange={() => setNoteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar nota — {noteTarget?.company_name}</DialogTitle></DialogHeader>
          <textarea
            className={cn(formControlClass, 'min-h-[80px]')}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Escreva a nota..."
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNoteTarget(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddNote} disabled={addingNote || !noteText.trim()}>
              {addingNote ? 'Salvando...' : 'Adicionar nota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move step */}
      <Dialog open={!!moveTarget} onOpenChange={() => setMoveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mover etapa — {moveTarget?.company_name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Nova etapa *</label>
              <select className={formControlClass} value={moveStepId} onChange={(e) => setMoveStepId(e.target.value)}>
                <option value="">Selecione a etapa...</option>
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
            <Button variant="outline" size="sm" onClick={() => setMoveTarget(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleMoveStep} disabled={moving || !moveStepId}>
              {moving ? 'Movendo...' : 'Mover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark won */}
      <Dialog open={!!wonTarget} onOpenChange={() => setWonTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como ganho — {wonTarget?.company_name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <label className="text-[11px] font-medium text-muted-foreground">Valor base (€, opcional)</label>
            <input type="number" min="0" step="0.01" className={formControlClass} value={wonAmount} onChange={(e) => setWonAmount(e.target.value)} placeholder="0.00" />
            <p className="text-[10px] text-muted-foreground">Se o lead tiver afiliado e valor informado, as comissões são geradas automaticamente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setWonTarget(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleMarkWon} disabled={markingWon}>
              {markingWon ? 'Salvando...' : 'Confirmar ganho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark lost */}
      <Dialog open={!!lostTarget} onOpenChange={() => setLostTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como perdido — {lostTarget?.company_name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <label className="text-[11px] font-medium text-muted-foreground">Motivo (opcional)</label>
            <input className={formControlClass} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Preço, concorrente..." />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLostTarget(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleMarkLost} disabled={markingLost}>
              {markingLost ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Next action */}
      <Dialog open={!!nextActionTarget} onOpenChange={() => setNextActionTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Próxima ação — {nextActionTarget?.company_name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Tipo *</label>
              <select className={formControlClass} value={nextActionForm.type} onChange={(e) => setNextActionForm((f) => ({ ...f, type: e.target.value }))}>
                {NEXT_ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Data e hora *</label>
              <input type="datetime-local" className={formControlClass} value={nextActionForm.at} onChange={(e) => setNextActionForm((f) => ({ ...f, at: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNextActionTarget(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSetNextAction} disabled={settingNextAction || !nextActionForm.at}>
              {settingNextAction ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create lead */}
      {onCreateLead && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Empresa *</label>
                <input className={formControlClass} value={createForm.company_name} onChange={(e) => setCreateForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Acme Ltda" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Contato</label>
                <input className={formControlClass} value={createForm.contact_name} onChange={(e) => setCreateForm((f) => ({ ...f, contact_name: e.target.value }))} placeholder="João Silva" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">E-mail</label>
                  <input type="email" className={formControlClass} value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@ex.com" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Telefone</label>
                  <input className={formControlClass} value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+351..." />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Prioridade</label>
                <select className={formControlClass} value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="very_high">Muito alta</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Notas</label>
                <textarea className={cn(formControlClass, 'min-h-[60px]')} value={createForm.general_notes} onChange={(e) => setCreateForm((f) => ({ ...f, general_notes: e.target.value }))} placeholder="Observações..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreateLead} disabled={creating || !createForm.company_name.trim()}>
                {creating ? 'Criando...' : 'Criar lead'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
