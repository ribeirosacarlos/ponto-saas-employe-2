import { useCallback, useEffect, useMemo, useState } from 'react'
import { GripVertical, ListOrdered, Pencil, Plus, Trash2 } from 'lucide-react'
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
  createStep,
  deleteStep,
  listSteps,
  reorderSteps,
  updateStep,
} from '../services/modules/commercial'

const VIEW_REQUIRES = { anyOf: ['super_admin', 'commercial_manager', 'commercial_agent'] }
const MANAGE_REQUIRES = { anyOf: ['super_admin', 'commercial_manager'] }

const buildForm = (step = null) => ({
  id: step?.id ?? '',
  name: step?.name ?? '',
  description: step?.description ?? '',
  position: step?.position ?? '',
  default_due_days: step?.default_due_days ?? '',
  active: step?.active ?? true,
})

export default function CommercialSteps() {
  const { toast } = useToast()
  const roles = useAuthStore((s) => s.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasView = useMemo(() => canRenderCard(capabilities, VIEW_REQUIRES), [capabilities])
  const hasManage = useMemo(() => canRenderCard(capabilities, MANAGE_REQUIRES), [capabilities])

  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [form, setForm] = useState(() => buildForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!hasView) return
    setLoading(true)
    try {
      const items = await listSteps()
      setSteps(items)
    } catch (err) {
      console.error('[CommercialSteps] list error', err)
      toast({ title: 'Erro', description: 'Não foi possível carregar as etapas.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [hasView, toast])

  useEffect(() => { load() }, [load])

  const handleOpenCreate = () => {
    setFormMode('create')
    setForm(buildForm())
    setDialogOpen(true)
  }

  const handleOpenEdit = (step) => {
    setFormMode('edit')
    setForm(buildForm(step))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        ...(form.description && { description: form.description.trim() }),
        ...(form.position !== '' && { position: Number(form.position) }),
        ...(form.default_due_days !== '' && { default_due_days: Number(form.default_due_days) }),
        active: form.active,
      }
      if (formMode === 'create') {
        await createStep(payload)
        toast({ title: 'Etapa criada', description: `"${form.name}" adicionada ao pipeline.` })
      } else {
        await updateStep(form.id, payload)
        toast({ title: 'Etapa atualizada' })
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Falha ao salvar etapa.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteStep(deleteTarget.id)
      toast({ title: 'Etapa removida' })
      setDeleteTarget(null)
      await load()
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível remover a etapa. Verifique se existem logs associados.', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  if (!hasView) {
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
          icon={<ListOrdered className="h-3.5 w-3.5" />}
          eyebrow="Comercial"
          title="Etapas do Pipeline"
          subtitle="Gerencie as etapas do funil comercial"
          actions={
            hasManage && (
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nova etapa
              </Button>
            )
          }
        />

        {loading && (
          <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>
        )}

        {!loading && steps.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhuma etapa cadastrada.</p>
        )}

        {!loading && steps.length > 0 && (
          <div className="flex flex-col gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-3 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {step.position}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold">{step.name}</p>
                  {step.description && (
                    <p className="text-[11px] text-muted-foreground truncate">{step.description}</p>
                  )}
                </div>
                {step.default_due_days && (
                  <span className="shrink-0 rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {step.default_due_days}d
                  </span>
                )}
                {!step.active && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    Inativa
                  </span>
                )}
                {hasManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleOpenEdit(step)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(step)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Nova etapa' : 'Editar etapa'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Nome *</label>
              <input
                className={formControlClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Ligação 1"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
              <input
                className={formControlClass}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Posição</label>
                <input
                  type="number"
                  className={formControlClass}
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  placeholder="1"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Dias padrão</label>
                <input
                  type="number"
                  className={formControlClass}
                  value={form.default_due_days}
                  onChange={(e) => setForm((f) => ({ ...f, default_due_days: e.target.value }))}
                  placeholder="Ex: 3"
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Etapa ativa
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover etapa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong>? Esta ação não
            pode ser desfeita e falhará se houver registros associados.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
