import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink, Link2, Pencil, Plus, Send, Trash2, TrendingUp } from 'lucide-react'
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
import {
  createAffiliate,
  deleteAffiliate,
  getAffiliateMetrics,
  listAffiliates,
  resendAffiliateInvite,
  updateAffiliate,
} from '../services/modules/commercial'

const ACCESS_REQUIRES = { anyOf: ['super_admin', 'commercial_manager'] }

const buildForm = (aff = null) => ({
  id: aff?.id ?? '',
  name: aff?.name ?? '',
  slug: aff?.slug ?? '',
  email: aff?.email ?? '',
  phone: aff?.phone ?? '',
  status: aff?.status ?? 'active',
  create_account: false,
})

const STATUS_LABELS = { active: 'Ativo', inactive: 'Inativo' }

export default function CommercialAffiliates() {
  const { toast } = useToast()
  const roles = useAuthStore((s) => s.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])

  const [affiliates, setAffiliates] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [form, setForm] = useState(() => buildForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [metricsTarget, setMetricsTarget] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [resendingId, setResendingId] = useState(null)

  const load = useCallback(async (nextPage = page) => {
    if (!hasAccess) return
    setLoading(true)
    try {
      const result = await listAffiliates({ page: nextPage })
      setAffiliates(result.data)
      setMeta(result.meta)
    } catch (err) {
      console.error('[CommercialAffiliates]', err)
      toast({ title: 'Erro', description: 'Não foi possível carregar os afiliados.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [hasAccess, page, toast])

  useEffect(() => { load() }, [load])

  const handleOpenCreate = () => {
    setFormMode('create')
    setForm(buildForm())
    setDialogOpen(true)
  }

  const handleOpenEdit = (aff) => {
    setFormMode('edit')
    setForm(buildForm(aff))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        ...(form.email && { email: form.email.trim() }),
        ...(form.phone && { phone: form.phone.trim() }),
        status: form.status,
        ...(formMode === 'create' && { create_account: form.create_account }),
      }
      if (formMode === 'create') {
        await createAffiliate(payload)
        toast({ title: 'Afiliado criado', description: form.create_account ? 'Convite de acesso enviado por e-mail.' : undefined })
      } else {
        await updateAffiliate(form.id, payload)
        toast({ title: 'Afiliado atualizado' })
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Falha ao salvar afiliado.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteAffiliate(deleteTarget.id)
      toast({ title: 'Afiliado removido' })
      setDeleteTarget(null)
      await load()
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível remover o afiliado.', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const handleResendInvite = async (aff) => {
    setResendingId(aff.id)
    try {
      await resendAffiliateInvite(aff.id)
      toast({ title: 'Convite reenviado', description: `E-mail enviado para ${aff.email ?? aff.name}.` })
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Não foi possível reenviar o convite.', variant: 'error' })
    } finally {
      setResendingId(null)
    }
  }

  const handleViewMetrics = async (aff) => {
    setMetricsTarget(aff)
    setMetrics(null)
    setMetricsLoading(true)
    try {
      const data = await getAffiliateMetrics(aff.id)
      setMetrics(data)
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível carregar as métricas.', variant: 'error' })
    } finally {
      setMetricsLoading(false)
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
          icon={<ExternalLink className="h-3.5 w-3.5" />}
          eyebrow="Comercial"
          title="Afiliados"
          subtitle="Gerencie parceiros e programas de indicação"
          actions={
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo afiliado
            </Button>
          }
        />

        {loading && (
          <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>
        )}

        {!loading && affiliates.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhum afiliado cadastrado.</p>
        )}

        {!loading && affiliates.length > 0 && (
          <div className="flex flex-col gap-2">
            {affiliates.map((aff) => (
              <div
                key={aff.id}
                className="flex flex-col gap-2 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-semibold">{aff.name}</p>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                        aff.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {STATUS_LABELS[aff.status] ?? aff.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    /{aff.slug}
                    {aff.email && ` · ${aff.email}`}
                  </p>
                  {aff.referral_url && (
                    <a
                      href={aff.referral_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link2 className="h-3 w-3" />
                      {aff.referral_url}
                    </a>
                  )}
                  {aff.commission_plan && (
                    <p className="text-[10px] text-muted-foreground">
                      Plano: {aff.commission_plan.name} — {aff.commission_plan.commission_percentage}% por{' '}
                      {aff.commission_plan.recurrence_months} meses
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewMetrics(aff)}
                  >
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Métricas
                  </Button>
                  {aff.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Reenviar convite de acesso"
                      disabled={resendingId === aff.id}
                      onClick={() => handleResendInvite(aff)}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(aff)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(aff)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => { setPage((p) => p - 1); load(page - 1) }}
            >
              Anterior
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {page} / {meta.lastPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.lastPage}
              onClick={() => { setPage((p) => p + 1); load(page + 1) }}
            >
              Próximo
            </Button>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Novo afiliado' : 'Editar afiliado'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Nome *</label>
              <input
                className={formControlClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Slug * (único)</label>
              <input
                className={formControlClass}
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') }))}
                placeholder="joao-silva"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">E-mail</label>
                <input
                  type="email"
                  className={formControlClass}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="joao@exemplo.com"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Telefone</label>
                <input
                  className={formControlClass}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+351900000000"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Status</label>
              <select
                className={formControlClass}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            {formMode === 'create' && (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-border/70 bg-muted/30 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={form.create_account}
                  onChange={(e) => setForm((f) => ({ ...f, create_account: e.target.checked }))}
                />
                <div>
                  <p className="text-[12px] font-medium">Criar conta de acesso</p>
                  <p className="text-[11px] text-muted-foreground">Envia convite por e-mail para o afiliado definir sua senha</p>
                </div>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim() || !form.slug.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metrics Dialog */}
      <Dialog open={!!metricsTarget} onOpenChange={() => { setMetricsTarget(null); setMetrics(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Métricas — {metricsTarget?.name}</DialogTitle>
          </DialogHeader>
          {metricsLoading && (
            <p className="text-center text-sm text-muted-foreground py-4">Carregando...</p>
          )}
          {!metricsLoading && metrics && (
            <div className="grid grid-cols-2 gap-3 py-2">
              {[
                ['Cliques totais', metrics.total_clicks],
                ['Cliques únicos', metrics.unique_clicks],
                ['Leads gerados', metrics.total_leads],
                ['Leads ganhos', metrics.won_leads],
                ['Conversão (clique → lead)', `${metrics.conversion_rate_click_to_lead?.toFixed(1)}%`],
                ['Conversão (lead → cliente)', `${metrics.conversion_rate_lead_to_customer?.toFixed(1)}%`],
                ['Comissões pendentes', `€${Number(metrics.pending_commissions ?? 0).toFixed(2)}`],
                ['Comissões pagas', `€${Number(metrics.paid_commissions ?? 0).toFixed(2)}`],
                ['Bônus pendente', `€${Number(metrics.pending_bonus ?? 0).toFixed(2)}`],
                ['Bônus pago', `€${Number(metrics.paid_bonus ?? 0).toFixed(2)}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] border border-border/60 bg-muted/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-[13px] font-semibold">{value ?? 0}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setMetricsTarget(null); setMetrics(null) }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover afiliado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong>?
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
