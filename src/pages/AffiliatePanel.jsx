import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  LogOut,
  MousePointerClick,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { ThemeToggle } from '../components/ThemeToggle'
import { BrandSignature } from '../components/BrandSignature'
import { useToast } from '../components/ui/use-toast'
import { useAffiliateAuth } from '../store/useAffiliateAuth'
import { affiliateLogout, getAffiliateMe } from '../services/modules/affiliateAuth'

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

export default function AffiliatePanel() {
  const { token, affiliate, clearSession } = useAffiliateAuth()
  const { toast } = useToast()

  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  // Redirect to login if no token
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
      if (err?.response?.status === 401) {
        clearSession()
        window.location.href = '/affiliate/login'
      } else {
        toast({ title: 'Erro', description: 'Não foi possível carregar seus dados.', variant: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }, [token, clearSession, toast])

  useEffect(() => { loadMe() }, [loadMe])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      if (token) await affiliateLogout(token)
    } catch {
      // ignore logout errors
    } finally {
      clearSession()
      window.location.href = '/affiliate/login'
    }
  }

  if (!token) return null

  const displayAffiliate = me ?? affiliate ?? {}
  const metrics = me?.metrics ?? {}

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
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              {loggingOut ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
          {loading && (
            <p className="mt-20 text-center text-sm text-muted-foreground">Carregando...</p>
          )}

          {!loading && (
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
                {displayAffiliate.slug && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-[12px]">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Seu link de afiliado:</span>
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
              {(Object.keys(metrics).length > 0 || me) && (
                <>
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Suas métricas
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <StatCard
                      label="Cliques totais"
                      value={metrics.total_clicks ?? displayAffiliate.total_clicks}
                      icon={MousePointerClick}
                      color="text-sky-500"
                    />
                    <StatCard
                      label="Leads gerados"
                      value={metrics.total_leads ?? displayAffiliate.total_leads}
                      icon={Users}
                      color="text-violet-500"
                    />
                    <StatCard
                      label="Leads ganhos"
                      value={metrics.won_leads ?? displayAffiliate.won_leads}
                      icon={CheckCircle2}
                      color="text-emerald-500"
                    />
                    <StatCard
                      label="Comissões pendentes"
                      value={
                        metrics.pending_commissions != null
                          ? `€${Number(metrics.pending_commissions).toFixed(2)}`
                          : null
                      }
                      icon={TrendingUp}
                      color="text-amber-500"
                    />
                    <StatCard
                      label="Comissões pagas"
                      value={
                        metrics.paid_commissions != null
                          ? `€${Number(metrics.paid_commissions).toFixed(2)}`
                          : null
                      }
                      icon={BarChart3}
                      color="text-primary"
                    />
                    <StatCard
                      label="Bônus pendente"
                      value={
                        metrics.pending_bonus != null
                          ? `€${Number(metrics.pending_bonus).toFixed(2)}`
                          : null
                      }
                      icon={TrendingUp}
                      color="text-orange-500"
                    />
                  </div>

                  {metrics.conversion_rate_click_to_lead != null && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[14px] border border-border/60 bg-muted/30 px-4 py-3">
                        <p className="text-[10px] text-muted-foreground">Conversão clique → lead</p>
                        <p className="text-lg font-semibold">
                          {Number(metrics.conversion_rate_click_to_lead).toFixed(1)}%
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-border/60 bg-muted/30 px-4 py-3">
                        <p className="text-[10px] text-muted-foreground">Conversão lead → cliente</p>
                        <p className="text-lg font-semibold">
                          {Number(metrics.conversion_rate_lead_to_customer ?? 0).toFixed(1)}%
                        </p>
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
                      <strong className="text-foreground">
                        {displayAffiliate.commission_plan.recurrence_months}
                      </strong>{' '}
                      meses
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
