import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Handshake,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { getCommercialDashboard } from '../services/modules/commercial'

const ACCESS_REQUIRES = { anyOf: ['super_admin', 'commercial_manager', 'commercial_agent'] }

function StatCard({ label, value, icon: Icon, color = 'text-primary' }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-border/70 bg-card/80 px-4 py-4 shadow-[0_18px_60px_-35px_rgba(92,134,255,0.15)] backdrop-blur-xl">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight">{value ?? 0}</p>
      </div>
    </div>
  )
}

export default function CommercialDashboard() {
  const { toast } = useToast()
  const roles = useAuthStore((s) => s.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!hasAccess) return
    setLoading(true)
    setError('')
    try {
      const data = await getCommercialDashboard()
      setStats(data)
    } catch (err) {
      console.error('[CommercialDashboard]', err)
      setError('Erro ao carregar dashboard.')
      toast({ title: 'Erro', description: 'Não foi possível carregar o dashboard comercial.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [hasAccess, toast])

  useEffect(() => { load() }, [load])

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
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          eyebrow="Comercial"
          title="Dashboard Comercial"
          subtitle="Visão geral de leads, pipeline e performance"
        />

        {loading && (
          <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>
        )}

        {error && !loading && (
          <p className="text-center text-sm text-destructive py-10">{error}</p>
        )}

        {!loading && stats && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <StatCard label="Total de leads" value={stats.total_leads} icon={Users} />
              <StatCard label="Novos" value={stats.new_leads} icon={TrendingUp} color="text-sky-500" />
              <StatCard label="Em andamento" value={stats.leads_in_progress} icon={Clock} color="text-amber-500" />
              <StatCard label="Demos agendadas" value={stats.demos_scheduled} icon={Handshake} color="text-violet-500" />
              <StatCard label="Propostas enviadas" value={stats.proposals_sent} icon={BarChart3} color="text-blue-500" />
              <StatCard label="Ganhos" value={stats.won_leads} icon={CheckCircle2} color="text-emerald-500" />
              <StatCard label="Perdidos" value={stats.lost_leads} icon={XCircle} color="text-destructive" />
              <StatCard label="Ações para hoje" value={stats.next_actions_today} icon={Clock} color="text-orange-500" />
            </div>

            {stats.overdue_next_actions > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-[12px] text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{stats.overdue_next_actions}</strong> ação(ões) em atraso
                </span>
              </div>
            )}

            {stats.leads_by_priority && Object.keys(stats.leads_by_priority).length > 0 && (
              <div className="rounded-[18px] border border-border/70 bg-card/80 p-5 backdrop-blur-xl">
                <h2 className="mb-3 text-[13px] font-semibold">Leads por prioridade</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.leads_by_priority).map(([priority, count]) => (
                    <span
                      key={priority}
                      className="rounded-full border border-border/60 bg-muted px-3 py-1 text-[11px] font-medium capitalize"
                    >
                      {priority}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  )
}
