import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Clock, Clock4, RefreshCw } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ThemeToggle } from '../components/ThemeToggle'
import { AjusteModal } from '../components/AjusteModal'
import { PontoList } from '../components/PontoList'
import { useToast } from '../components/ui/use-toast'
import { clockRequest, listEntries, requestAdjustment } from '../lib/api'
import { useAuthStore } from '../store/useAuth'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const { toast } = useToast()
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [clocking, setClocking] = useState('')
  const [sendingAdjustment, setSendingAdjustment] = useState(false)

  const todaysEntries = useMemo(
    () =>
      entries.filter((entry) => entry.clocked_at && isSameDay(new Date(entry.clocked_at), new Date())),
    [entries],
  )

  const lastPunch = entries?.[0]

  const workedTime = useMemo(() => {
    const sorted = [...todaysEntries].sort(
      (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime(),
    )
    let lastIn = null
    let totalMs = 0

    sorted.forEach((entry) => {
      const ts = new Date(entry.clocked_at).getTime()
      if (entry.type === 'in') {
        lastIn = ts
      } else if (entry.type === 'out' && lastIn) {
        totalMs += ts - lastIn
        lastIn = null
      }
    })

    const totalMinutes = Math.max(0, Math.floor(totalMs / 60000))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const minutes = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${minutes}`
  }, [todaysEntries])

  const hourBank = '-109:48' // placeholder estático até ter endpoint oficial

  const nextType = lastPunch?.type === 'in' ? 'out' : 'in'
  const nextLabel = nextType === 'in' ? 'Registrar entrada' : 'Registrar saída'

  const fetchEntries = async () => {
    setLoadingEntries(true)
    try {
      const data = await listEntries()
      setEntries(data.data || [])
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast({
          title: 'Sessao expirada',
          description:
            error.response?.data?.message ||
            'Faca login novamente ou use um usuario com permissao de funcionario.',
          variant: 'error',
        })
        await logout()
      } else {
        toast({
          title: 'Erro ao buscar batidas',
          description:
            error.response?.data?.message ||
            'Nao foi possivel carregar suas batidas. Tente novamente em instantes.',
          variant: 'error',
        })
      }
    } finally {
      setLoadingEntries(false)
    }
  }

  useEffect(() => {
    if (!token) return
    fetchEntries()
  }, [token])

  const handleClock = async (actionType) => {
    setClocking(actionType)
    try {
      const data = await clockRequest(actionType)
      toast({
        title: 'Batida registrada',
        description: `Horario salvo como ${data.clocked_at || 'agora'}.`,
        variant: 'success',
      })
      fetchEntries()
    } catch (error) {
      toast({
        title: 'Erro ao registrar',
        description:
          error.response?.data?.message ||
          'Nao foi possivel registrar o ponto. Verifique permissoes ou tente novamente.',
        variant: 'error',
      })
    } finally {
      setClocking('')
    }
  }

  const handleAdjustment = async (form, closeModal, resetForm) => {
    setSendingAdjustment(true)
    try {
      await requestAdjustment(form)
      toast({
        title: 'Solicitacao enviada',
        description: 'Seu ajuste foi registrado como pendente para aprovacao.',
        variant: 'success',
      })
      closeModal()
      resetForm()
    } catch (error) {
      toast({
        title: 'Erro no envio',
        description:
          error.response?.data?.message ||
          'Nao foi possivel enviar o ajuste. Confira os campos e tente novamente.',
        variant: 'error',
      })
    } finally {
      setSendingAdjustment(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    toast({ title: 'Sessao encerrada', description: 'Voce saiu do sistema.' })
  }

  return (
    <div className="container py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Ponto eletronico</p>
          <h2 className="text-xl font-semibold">Ola, {user?.name || 'colaborador'} 👋</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Registre suas batidas, faca ajustes e acompanhe seu historico em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" onClick={handleLogout}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-card/90">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-primary">Meu tempo</p>
              <CardTitle className="text-base font-semibold">Resumo de batidas</CardTitle>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <BadgeCheck className="h-4 w-4" />
              Token ativo
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/80 p-5 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Última batida</p>
                    <p className="text-xs text-muted-foreground">
                      {lastPunch?.clocked_at
                        ? `${format(new Date(lastPunch.clocked_at), 'HH:mm')} · ${
                            lastPunch.type === 'in' ? 'Entrada' : 'Saída'
                          }`
                        : 'Nenhuma batida registrada hoje'}
                    </p>
                  </div>
                </div>
                <AjusteModal
                  onSubmit={handleAdjustment}
                  isSubmitting={sendingAdjustment}
                  trigger={<Button variant="outline">Solicitar ajuste</Button>}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-card/60 p-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    Horas trabalhadas hoje
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{workedTime}</p>
                  <p className="text-xs text-muted-foreground">
                    Somatório simples das batidas de hoje.
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    Banco de horas
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-red-400">{hourBank}</p>
                  <p className="text-xs text-muted-foreground">
                    Valor estático até conectar ao endpoint.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-gradient-to-r from-primary/15 via-emerald-500/10 to-transparent px-3 py-2.5 text-xs text-muted-foreground">
                O backend espera alternância entre <code className="font-semibold">in</code> e{' '}
                <code className="font-semibold">out</code>. O próximo envio será{' '}
                <span className="font-semibold text-primary">{nextType.toUpperCase()}</span>.
              </div>

              <Button
                size="md"
                className="w-full rounded-2xl text-sm font-semibold"
                onClick={() => handleClock(nextType)}
                disabled={clocking === nextType}
              >
                {clocking === nextType ? 'Registrando...' : 'Registrar ponto'} ({nextLabel})
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="bg-card/90">
            <CardHeader>
              <CardTitle>Dados do colaborador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-semibold">{user?.name || user?.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">E-mail</span>
                <span className="font-semibold">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">Papel</span>
                <span className="font-semibold">Funcionario</span>
              </div>
            </CardContent>
          </Card>
          <PontoList entries={entries} loading={loadingEntries} />
        </div>
      </div>
    </div>
  )
}
