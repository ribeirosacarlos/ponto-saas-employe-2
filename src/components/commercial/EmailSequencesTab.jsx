import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { formControlClass, textareaControlClass } from '../ui/form-controls'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import {
  createEmailSequence,
  createSequenceStep,
  deleteSequenceStep,
  listEmailSequences,
  listEmailTemplates,
  reorderSequenceSteps,
  updateEmailSequence,
  updateSequenceStep,
} from '../../services/modules/commercialEmails'

const STATUS_LABELS = { draft: 'Rascunho', active: 'Ativa', archived: 'Arquivada' }
const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/15 text-emerald-600',
  archived: 'bg-muted/60 text-muted-foreground/70',
}

const buildSequenceForm = (s = null) => ({
  id: s?.id ?? '',
  name: s?.name ?? '',
  description: s?.description ?? '',
  status: s?.status ?? 'draft',
  timezone: s?.timezone ?? '',
})

const buildStepForm = (step = null) => ({
  id: step?.id ?? '',
  template_id: step?.template_id ?? '',
  name: step?.name ?? '',
  delay_days: step?.delay_days ?? 0,
  send_time_override: step?.send_time_override ?? '',
  is_active: step?.is_active ?? true,
})

export function EmailSequencesTab() {
  const { toast } = useToast()
  const [sequences, setSequences] = useState([])
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState([])
  const [expandedId, setExpandedId] = useState(null)

  // Sequence dialog
  const [seqFormOpen, setSeqFormOpen] = useState(false)
  const [seqFormMode, setSeqFormMode] = useState('create')
  const [seqForm, setSeqForm] = useState(() => buildSequenceForm())
  const [seqSaving, setSeqSaving] = useState(false)

  // Step dialog
  const [stepFormOpen, setStepFormOpen] = useState(false)
  const [stepFormMode, setStepFormMode] = useState('create')
  const [stepSequenceId, setStepSequenceId] = useState(null)
  const [stepForm, setStepForm] = useState(() => buildStepForm())
  const [stepSaving, setStepSaving] = useState(false)

  const [deleteStepTarget, setDeleteStepTarget] = useState(null) // { sequenceId, step }
  const [deletingStep, setDeletingStep] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [seqResult, templatesResult] = await Promise.all([listEmailSequences(), listEmailTemplates()])
      setSequences(seqResult)
      setTemplates(templatesResult)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar as sequências.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleOpenCreateSequence = () => {
    setSeqFormMode('create')
    setSeqForm(buildSequenceForm())
    setSeqFormOpen(true)
  }

  const handleOpenEditSequence = (sequence) => {
    setSeqFormMode('edit')
    setSeqForm(buildSequenceForm(sequence))
    setSeqFormOpen(true)
  }

  const handleSaveSequence = async () => {
    if (!seqForm.name.trim()) return
    setSeqSaving(true)
    try {
      const payload = {
        name: seqForm.name.trim(),
        ...(seqForm.description.trim() && { description: seqForm.description.trim() }),
        status: seqForm.status,
        ...(seqForm.timezone.trim() && { timezone: seqForm.timezone.trim() }),
      }
      if (seqFormMode === 'create') {
        await createEmailSequence(payload)
        toast({ title: 'Sequência criada' })
      } else {
        await updateEmailSequence(seqForm.id, payload)
        toast({ title: 'Sequência atualizada' })
      }
      setSeqFormOpen(false)
      await load()
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Falha ao salvar sequência.', variant: 'error' })
    } finally {
      setSeqSaving(false)
    }
  }

  const handleOpenCreateStep = (sequenceId) => {
    setStepFormMode('create')
    setStepSequenceId(sequenceId)
    setStepForm(buildStepForm())
    setStepFormOpen(true)
  }

  const handleOpenEditStep = (sequenceId, step) => {
    setStepFormMode('edit')
    setStepSequenceId(sequenceId)
    setStepForm(buildStepForm(step))
    setStepFormOpen(true)
  }

  const handleSaveStep = async () => {
    if (!stepForm.template_id) return
    setStepSaving(true)
    try {
      const sequence = sequences.find((s) => s.id === stepSequenceId)
      const payload = {
        template_id: stepForm.template_id,
        delay_days: Number(stepForm.delay_days) || 0,
        ...(stepForm.name.trim() && { name: stepForm.name.trim() }),
        ...(stepForm.send_time_override && { send_time_override: stepForm.send_time_override }),
        is_active: stepForm.is_active,
      }
      if (stepFormMode === 'create') {
        await createSequenceStep(stepSequenceId, { ...payload, position: (sequence?.steps.length ?? 0) + 1 })
        toast({ title: 'Passo adicionado' })
      } else {
        await updateSequenceStep(stepSequenceId, stepForm.id, payload)
        toast({ title: 'Passo atualizado' })
      }
      setStepFormOpen(false)
      await load()
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Falha ao salvar passo.', variant: 'error' })
    } finally {
      setStepSaving(false)
    }
  }

  const handleDeleteStep = async () => {
    if (!deleteStepTarget) return
    setDeletingStep(true)
    try {
      await deleteSequenceStep(deleteStepTarget.sequenceId, deleteStepTarget.step.id)
      toast({ title: 'Passo removido' })
      setDeleteStepTarget(null)
      await load()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao remover passo.', variant: 'error' })
    } finally {
      setDeletingStep(false)
    }
  }

  const handleMoveStep = async (sequence, index, direction) => {
    const steps = [...sequence.steps].sort((a, b) => a.position - b.position)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= steps.length) return
    const reordered = [...steps]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    const payload = reordered.map((s, i) => ({ id: s.id, position: i + 1 }))
    try {
      await reorderSequenceSteps(sequence.id, payload)
      await load()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao reordenar passos.', variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Réguas de follow-up compostas por passos. Crie em rascunho, adicione os passos e só então ative.
        </p>
        <Button size="sm" onClick={handleOpenCreateSequence}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nova sequência
        </Button>
      </div>

      {loading && <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>}
      {!loading && sequences.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">Nenhuma sequência criada ainda.</p>
      )}

      {!loading && sequences.length > 0 && (
        <div className="flex flex-col gap-2">
          {sequences.map((sequence) => {
            const isExpanded = expandedId === sequence.id
            const sortedSteps = [...sequence.steps].sort((a, b) => a.position - b.position)
            const hasActiveStep = sequence.steps.some((s) => s.is_active)
            return (
              <div key={sequence.id} className="rounded-[14px] border border-border/70 bg-card/80 backdrop-blur-xl">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : sequence.id)}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span className="text-[13px] font-semibold">{sequence.name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_COLORS[sequence.status]}`}>
                      {STATUS_LABELS[sequence.status] ?? sequence.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{sequence.steps.length} passo(s)</span>
                    {sequence.timezone && <span className="text-[10px] text-muted-foreground">{sequence.timezone}</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Editar" onClick={(e) => { e.stopPropagation(); handleOpenEditSequence(sequence) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </button>

                {isExpanded && (
                  <div className="flex flex-col gap-2 border-t border-border/60 px-4 py-3">
                    {sequence.status === 'active' && !hasActiveStep && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-500/10 px-2.5 py-1.5">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <p className="text-[11px] text-amber-700">
                          Esta sequência está ativa mas não tem nenhum passo ativo — leads não poderão ser inscritos.
                        </p>
                      </div>
                    )}

                    {sortedSteps.length === 0 && (
                      <p className="text-[11px] text-muted-foreground py-2">Nenhum passo adicionado.</p>
                    )}

                    {sortedSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold">{step.position}. {step.name || step.template?.name || 'Passo'}</span>
                            <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide', step.is_active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                              {step.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {step.template?.name ?? 'Template removido'} · {step.delay_days === 0 ? 'no mesmo dia' : `${step.delay_days}d depois`}
                            {step.send_time_override && ` · ${step.send_time_override}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Mover para cima" disabled={index === 0} onClick={() => handleMoveStep(sequence, index, -1)}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Mover para baixo" disabled={index === sortedSteps.length - 1} onClick={() => handleMoveStep(sequence, index, 1)}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => handleOpenEditStep(sequence.id, step)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Remover" onClick={() => setDeleteStepTarget({ sequenceId: sequence.id, step })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {sequence.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCreateStep(sequence.id)}
                        className="flex items-center gap-1.5 self-start text-[11px] text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar passo
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sequence Dialog */}
      <Dialog open={seqFormOpen} onOpenChange={setSeqFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{seqFormMode === 'create' ? 'Nova sequência' : 'Editar sequência'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Nome *</label>
              <input className={formControlClass} value={seqForm.name} onChange={(e) => setSeqForm((f) => ({ ...f, name: e.target.value }))} placeholder="Cold Outbound" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
              <textarea className={cn(textareaControlClass, 'h-16')} value={seqForm.description} onChange={(e) => setSeqForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Status</label>
                <select className={formControlClass} value={seqForm.status} onChange={(e) => setSeqForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="draft">Rascunho</option>
                  <option value="active">Ativa</option>
                  <option value="archived">Arquivada</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Fuso horário</label>
                <input className={formControlClass} value={seqForm.timezone} onChange={(e) => setSeqForm((f) => ({ ...f, timezone: e.target.value }))} placeholder="America/Sao_Paulo" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Crie em rascunho, adicione os passos e só então mude para Ativa.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSeqFormOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveSequence} disabled={seqSaving || !seqForm.name.trim()}>
              {seqSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step Dialog */}
      <Dialog open={stepFormOpen} onOpenChange={setStepFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{stepFormMode === 'create' ? 'Novo passo' : 'Editar passo'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Template *</label>
              <select className={formControlClass} value={stepForm.template_id} onChange={(e) => setStepForm((f) => ({ ...f, template_id: e.target.value }))}>
                <option value="">Selecione...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Rótulo (opcional)</label>
              <input className={formControlClass} value={stepForm.name} onChange={(e) => setStepForm((f) => ({ ...f, name: e.target.value }))} placeholder="Dia 1 — Primeiro contato" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Dias após inscrição *</label>
                <input type="number" min="0" className={formControlClass} value={stepForm.delay_days} onChange={(e) => setStepForm((f) => ({ ...f, delay_days: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Horário fixo (opcional)</label>
                <input type="time" className={formControlClass} value={stepForm.send_time_override} onChange={(e) => setStepForm((f) => ({ ...f, send_time_override: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <input type="checkbox" checked={stepForm.is_active} onChange={(e) => setStepForm((f) => ({ ...f, is_active: e.target.checked }))} />
              Passo ativo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStepFormOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveStep} disabled={stepSaving || !stepForm.template_id}>
              {stepSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step Dialog */}
      <Dialog open={!!deleteStepTarget} onOpenChange={() => setDeleteStepTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover passo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover o passo <strong>{deleteStepTarget?.step?.name || deleteStepTarget?.step?.template?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteStepTarget(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteStep} disabled={deletingStep}>
              {deletingStep ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
