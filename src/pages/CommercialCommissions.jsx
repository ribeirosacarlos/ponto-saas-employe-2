import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgePercent, CheckCircle2, Gift } from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import { formControlClass } from '../components/ui/form-controls'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import {
  approveCommission,
  listBonuses,
  listCommissions,
  markCommissionPaid,
} from '../services/modules/commercial'

const ACCESS_REQUIRES = { anyOf: ['super_admin', 'commercial_manager'] }

const COMMISSION_STATUS_LABELS = {
  pending: 'Pendente',
  approved: 'Aprovada',
  cancelled: 'Cancelada',
  paid: 'Paga',
}

const BONUS_STATUS_LABELS = { pending: 'Pendente', paid: 'Pago' }

const statusColor = (status) => {
  if (status === 'paid') return 'bg-emerald-500/15 text-emerald-600'
  if (status === 'approved') return 'bg-blue-500/15 text-blue-600'
  if (status === 'cancelled') return 'bg-muted text-muted-foreground'
  return 'bg-amber-500/15 text-amber-600'
}

export default function CommercialCommissions() {
  const { toast } = useToast()
  const roles = useAuthStore((s) => s.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])

  const [tab, setTab] = useState('commissions')
  const [commissions, setCommissions] = useState([])
  const [commMeta, setCommMeta] = useState(null)
  const [commPage, setCommPage] = useState(1)
  const [commStatusFilter, setCommStatusFilter] = useState('')
  const [commLoading, setCommLoading] = useState(false)

  const [bonuses, setBonuses] = useState([])
  const [bonusMeta, setBonusMeta] = useState(null)
  const [bonusPage, setBonusPage] = useState(1)
  const [bonusLoading, setBonusLoading] = useState(false)

  const [actioning, setActioning] = useState(null)

  const loadCommissions = useCallback(async (pg = commPage, status = commStatusFilter) => {
    if (!hasAccess) return
    setCommLoading(true)
    try {
      const result = await listCommissions({ page: pg, ...(status && { status }) })
      setCommissions(result.data)
      setCommMeta(result.meta)
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível carregar as comissões.', variant: 'error' })
    } finally {
      setCommLoading(false)
    }
  }, [hasAccess, commPage, commStatusFilter, toast])

  const loadBonuses = useCallback(async (pg = bonusPage) => {
    if (!hasAccess) return
    setBonusLoading(true)
    try {
      const result = await listBonuses({ page: pg })
      setBonuses(result.data)
      setBonusMeta(result.meta)
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os bônus.', variant: 'error' })
    } finally {
      setBonusLoading(false)
    }
  }, [hasAccess, bonusPage, toast])

  useEffect(() => {
    if (tab === 'commissions') loadCommissions()
    else loadBonuses()
  }, [tab, loadCommissions, loadBonuses])

  const handleApprove = async (id) => {
    setActioning(id)
    try {
      await approveCommission(id)
      toast({ title: 'Comissão aprovada' })
      await loadCommissions()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao aprovar comissão.', variant: 'error' })
    } finally {
      setActioning(null)
    }
  }

  const handleMarkPaid = async (id) => {
    setActioning(id)
    try {
      await markCommissionPaid(id)
      toast({ title: 'Comissão marcada como paga' })
      await loadCommissions()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao marcar como paga.', variant: 'error' })
    } finally {
      setActioning(null)
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
          icon={<BadgePercent className="h-3.5 w-3.5" />}
          eyebrow="Comercial"
          title="Comissões e Bônus"
          subtitle="Gerencie comissões de afiliados e bônus mensais"
        />

        {/* Tab selector */}
        <div className="flex gap-1 rounded-[12px] border border-border/60 bg-muted/40 p-1">
          {[
            { key: 'commissions', label: 'Comissões', icon: BadgePercent },
            { key: 'bonuses', label: 'Bônus', icon: Gift },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-medium transition ${
                tab === key
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Commissions */}
        {tab === 'commissions' && (
          <>
            <div className="flex items-center gap-2">
              <select
                className={`${formControlClass} w-44`}
                value={commStatusFilter}
                onChange={(e) => { setCommStatusFilter(e.target.value); loadCommissions(1, e.target.value) }}
              >
                <option value="">Todos os status</option>
                {Object.entries(COMMISSION_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {commLoading && (
              <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>
            )}

            {!commLoading && commissions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10">Nenhuma comissão encontrada.</p>
            )}

            {!commLoading && commissions.length > 0 && (
              <div className="flex flex-col gap-2">
                {commissions.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-2 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusColor(c.status)}`}
                        >
                          {COMMISSION_STATUS_LABELS[c.status] ?? c.status}
                        </span>
                        <span className="text-[11px] text-muted-foreground">Mês {c.month_number}</span>
                      </div>
                      <p className="text-[12px] font-semibold">
                        €{Number(c.commission_amount).toFixed(2)}
                        <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                          ({c.commission_percentage}% de €{Number(c.base_amount).toFixed(2)})
                        </span>
                      </p>
                      {c.affiliate && (
                        <p className="text-[11px] text-muted-foreground">Afiliado: {c.affiliate.name}</p>
                      )}
                      {c.due_date && (
                        <p className="text-[10px] text-muted-foreground">Venc.: {c.due_date}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {c.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actioning === c.id}
                          onClick={() => handleApprove(c.id)}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Aprovar
                        </Button>
                      )}
                      {c.status === 'approved' && (
                        <Button
                          size="sm"
                          disabled={actioning === c.id}
                          onClick={() => handleMarkPaid(c.id)}
                        >
                          Marcar paga
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {commMeta && commMeta.lastPage > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={commPage <= 1} onClick={() => { setCommPage((p) => p - 1); loadCommissions(commPage - 1) }}>Anterior</Button>
                <span className="text-[11px] text-muted-foreground">{commPage} / {commMeta.lastPage}</span>
                <Button variant="outline" size="sm" disabled={commPage >= commMeta.lastPage} onClick={() => { setCommPage((p) => p + 1); loadCommissions(commPage + 1) }}>Próximo</Button>
              </div>
            )}
          </>
        )}

        {/* Bonuses */}
        {tab === 'bonuses' && (
          <>
            {bonusLoading && (
              <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>
            )}

            {!bonusLoading && bonuses.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10">Nenhum bônus encontrado.</p>
            )}

            {!bonusLoading && bonuses.length > 0 && (
              <div className="flex flex-col gap-2">
                {bonuses.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col gap-1 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                            b.status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-amber-500/15 text-amber-600'
                          }`}
                        >
                          {BONUS_STATUS_LABELS[b.status] ?? b.status}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {b.month}/{b.year}
                        </span>
                      </div>
                      <p className="text-[12px] font-semibold">
                        €{Number(b.total_bonus_amount).toFixed(2)}
                        <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                          ({b.clients_count} clientes a cada {b.bonus_every_clients})
                        </span>
                      </p>
                      {b.affiliate && (
                        <p className="text-[11px] text-muted-foreground">Afiliado: {b.affiliate.name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bonusMeta && bonusMeta.lastPage > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={bonusPage <= 1} onClick={() => { setBonusPage((p) => p - 1); loadBonuses(bonusPage - 1) }}>Anterior</Button>
                <span className="text-[11px] text-muted-foreground">{bonusPage} / {bonusMeta.lastPage}</span>
                <Button variant="outline" size="sm" disabled={bonusPage >= bonusMeta.lastPage} onClick={() => { setBonusPage((p) => p + 1); loadBonuses(bonusPage + 1) }}>Próximo</Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  )
}
