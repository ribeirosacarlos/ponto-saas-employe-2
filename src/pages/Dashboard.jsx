import { useEffect, useMemo, useState } from 'react'
import { format, isSameDay, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  CalendarDays,
  Clock3,
  Home,
  ListChecks,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useToast } from '../components/ui/use-toast'
import { requestAdjustment } from '../lib/api'
import { useAuthStore } from '../store/useAuth'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { QuickMenu } from '../components/QuickMenu'
import { AjusteModal } from '../components/AjusteModal'
import { useClocking } from '../features/ponto/useClocking'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const { toast } = useToast()
  const {
    entries,
    loadingEntries,
    refreshEntries,
    clocking,
    registerClock,
    nextType,
  } = useClocking()
  const [sendingAdjustment, setSendingAdjustment] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { t } = useTranslation()

  const todaysEntries = useMemo(
    () =>
      entries.filter((entry) => entry.clocked_at && isSameDay(new Date(entry.clocked_at), new Date())),
    [entries],
  )

  const nextLabel = nextType === 'in' ? t('dashboard.nextLabel.in') : t('dashboard.nextLabel.out')

  const todayLabel = useMemo(() => {
    const label = format(new Date(), "dd 'de' MMMM", { locale: ptBR })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [])

  const initials = useMemo(() => {
    const base = user?.name || user?.email || 'US'
    const parts = base
      .trim()
      .split(' ')
      .filter(Boolean)
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }, [user])

  const daySummaries = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      if (!entry.clocked_at) return acc
      const key = format(new Date(entry.clocked_at), 'yyyy-MM-dd')
      acc[key] = acc[key] ? [...acc[key], entry] : [entry]
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([dateKey, items]) => {
        const sorted = [...items].sort(
          (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime(),
        )
        let firstIn = null
        let lastOut = null
        let lastIn = null
        let totalMs = 0

        sorted.forEach((item) => {
          const ts = new Date(item.clocked_at).getTime()
          if (item.type === 'in') {
            lastIn = ts
            if (!firstIn) firstIn = ts
          } else if (item.type === 'out' && lastIn) {
            totalMs += ts - lastIn
            lastOut = ts
            lastIn = null
          }
        })

        const totalMinutes = Math.max(0, Math.round(totalMs / 60000))
        const status = totalMinutes >= 540 ? 'Extra' : totalMinutes >= 480 ? 'Normal' : 'Atraso'

        return { dateKey, firstIn, lastOut, totalMinutes, status }
      })
      .sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime())
  }, [entries])

  const recentDays = useMemo(() => daySummaries.slice(0, 3), [daySummaries])

  const monthlyStats = useMemo(() => {
    const now = new Date()
    let totalMinutes = 0
    let workedDays = 0

    daySummaries.forEach((day) => {
      const current = new Date(day.dateKey)
      if (current.getMonth() === now.getMonth() && current.getFullYear() === now.getFullYear()) {
        totalMinutes += day.totalMinutes
        workedDays += 1
      }
    })

    const expectedMinutes = workedDays * 8 * 60
    const extraMinutes = Math.max(0, totalMinutes - expectedMinutes)

    return {
      totalHoursLabel: `${Math.round(totalMinutes / 60)}h`,
      extraHoursLabel: `${Math.round(extraMinutes / 60)}h`,
    }
  }, [daySummaries])

  const dayMinutesMap = useMemo(() => {
    return daySummaries.reduce((acc, day) => {
      acc[day.dateKey] = day.totalMinutes
      return acc
    }, {})
  }, [daySummaries])

  const heatmapData = useMemo(() => {
    const today = new Date()
    const columns = []

    for (let col = 0; col < 7; col += 1) {
      const column = []
      for (let row = 0; row < 7; row += 1) {
        const offset = (6 - col) * 7 + (6 - row)
        const date = subDays(today, offset)
        const key = format(date, 'yyyy-MM-dd')
        const minutes = dayMinutesMap[key] || 0
        let level = 0
        if (minutes >= 540) level = 4
        else if (minutes >= 480) level = 3
        else if (minutes >= 240) level = 2
        else if (minutes > 0) level = 1

        column.push({ key, level })
      }
      columns.push(column)
    }

    return columns
  }, [dayMinutesMap])

  const heatmapColors = ['bg-slate-100', 'bg-emerald-50', 'bg-emerald-100', 'bg-emerald-300', 'bg-emerald-500']

  const formatDuration = (minutes) => {
    const hrs = String(Math.floor(minutes / 60)).padStart(2, '0')
    const mins = String(minutes % 60).padStart(2, '0')
    return `${hrs}:${mins}`
  }

  const formatDayLabel = (dateKey) => {
    const label = format(new Date(dateKey), 'EEEE, dd MMM', { locale: ptBR })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const statusTone = {
    Normal: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    Extra: 'bg-amber-50 text-amber-600 border-amber-100',
    Atraso: 'bg-rose-50 text-rose-600 border-rose-100',
  }

  useEffect(() => {
    if (!token) return
    refreshEntries()
  }, [refreshEntries, token])

  const handleClock = registerClock

  const handleAdjustment = async (form, closeModal, resetForm) => {
    setSendingAdjustment(true)
    try {
      await requestAdjustment(form)
      toast({
        title: t('toast.adjustmentSuccess.title'),
        description: t('toast.adjustmentSuccess.description'),
        variant: 'success',
      })
      closeModal()
      resetForm()
    } catch (error) {
      toast({
        title: t('toast.adjustmentError.title'),
        description: error.response?.data?.message || t('toast.adjustmentError.description'),
        variant: 'error',
      })
    } finally {
      setSendingAdjustment(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    toast({
      title: t('toast.logout.title'),
      description: t('toast.logout.description'),
    })
  }

  return (
    <div className="min-h-screen bg-[#f3f4fb] text-slate-900">
      <div className="min-h-screen flex flex-col md:flex-row">
        {sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            aria-label="Fechar menu"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
        )}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-100 border-r border-slate-800 py-6 gap-6 shrink-0 transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0 md:translate-x-0 md:ml-0' : '-translate-x-full md:-translate-x-full md:-ml-64'
          } w-64 px-5 md:flex`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-md">
                <span className="text-white text-sm font-semibold tracking-tight">HR</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-slate-300">Synergy</span>
                <span className="text-[11px] text-slate-400">HR Management</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 text-[12px] lg:text-[13px]">
            {[
              { label: 'Dashboard', icon: Home, active: true, badge: 'Hoje' },
              { label: 'Calendario', icon: CalendarDays },
              { label: 'Time Off', icon: Clock3 },
              { label: 'Projetos', icon: ListChecks },
              { label: 'Equipe', icon: Users },
              { label: 'Configuracoes', icon: Settings },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition ${
                    item.active
                      ? 'bg-emerald-500 text-white font-semibold shadow-md'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="text-[10px] lg:text-[11px] bg-white/10 px-2 py-0.5 rounded-full">{item.badge}</span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          <div className="mt-2 border-t border-slate-800 pt-3 text-[10px] lg:text-[11px] text-slate-400">
            <p>Versao 1.0 - Synergy HR</p>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-[220px] max-w-full sm:max-w-lg flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-900 text-slate-100 border border-slate-800 hover:bg-slate-800 shrink-0"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  aria-label="Alternar menu lateral"
                  type="button"
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <h1 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 text-[10px] sm:text-[11px] px-2 py-0.5">
                  Hoje - {todayLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2 text-[12px] sm:text-[13px]">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar colaborador, equipe ou projeto"
                    className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="inline-flex items-center gap-2 h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-[#1e2a78] hover:bg-[#25338f] text-[11px] sm:text-xs font-semibold text-white shadow-md active:scale-[0.98] transition"
                onClick={() => handleClock(nextType)}
                disabled={clocking === nextType}
                type="button"
              >
                {clocking === nextType ? 'Registrando...' : 'Registrar ponto'} ({nextLabel})
              </button>

              <AjusteModal
                onSubmit={handleAdjustment}
                isSubmitting={sendingAdjustment}
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 h-9 sm:h-10 px-3 sm:px-4 rounded-full border border-slate-200 bg-white text-[11px] sm:text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition"
                  >
                    Ajustar ponto
                  </button>
                }
              />

              <button
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                type="button"
              >
                <Bell className="h-4 w-4" />
              </button>
              <LanguageSwitcher className="hidden sm:block" />
              <QuickMenu
                onLogout={handleLogout}
                onHistory={() =>
                  toast({
                    title: t('dashboard.menu.history'),
                    description: t('dashboard.menu.comingSoon'),
                  })
                }
              />

              <div className="h-9 sm:h-10 px-2 sm:px-3 rounded-full bg-slate-100 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-[#1e2a78] text-white text-xs font-semibold flex items-center justify-center">
                  {initials || 'EU'}
                </div>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-[11px] sm:text-xs font-medium text-slate-800">{user?.name || 'Colaborador'}</span>
                  <span className="text-[10px] text-slate-500">{user?.email || 'ponto ativo'}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 auto-rows-fr">
                <section className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200 shadow-[0_14px_35px_rgba(15,23,42,0.06)] px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-3 sm:gap-4 hover:shadow-[0_18px_45px_rgba(15,23,42,0.09)] transition h-full">
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] sm:text-xs font-medium tracking-[0.16em] uppercase text-slate-500">Time Tracking</p>
                    <h2 className="text-sm font-semibold text-slate-900">Historico de Ponto</h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">
                      {monthlyStats.totalHoursLabel} registradas neste mes - {monthlyStats.extraHoursLabel} extras
                    </p>
                  </div>
                </header>

                <div className="space-y-2 text-[11px] sm:text-[12px]">
                  {loadingEntries && (
                    <div className="space-y-2">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-14 rounded-2xl bg-slate-100 animate-pulse border border-slate-100" />
                      ))}
                    </div>
                  )}
                  {!loadingEntries && recentDays.length === 0 && <p className="text-slate-500 text-sm">Nenhum registro encontrado.</p>}
                  {!loadingEntries &&
                    recentDays.map((day) => (
                      <div
                        key={day.dateKey}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 border border-slate-100"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{formatDayLabel(day.dateKey)}</span>
                          <span className="text-slate-500">
                            Entrada {day.firstIn ? format(new Date(day.firstIn), 'HH:mm') : '--:--'} - Saida {day.lastOut ? format(new Date(day.lastOut), 'HH:mm') : '--:--'}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800">
                            {formatDuration(day.totalMinutes)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-medium ${
                              statusTone[day.status]
                            }`}
                          >
                            {day.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </section>

                <section className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200 shadow-[0_14px_35px_rgba(15,23,42,0.06)] px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-3 sm:gap-4 hover:shadow-[0_18px_45px_rgba(15,23,42,0.09)] transition h-full">
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] sm:text-xs font-medium tracking-[0.16em] uppercase text-slate-500">Registro</p>
                    <h2 className="text-sm font-semibold text-slate-900">Registro Mensal</h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Visao rapida de presenca e horas extras</p>
                  </div>
                  <details className="text-[10px] sm:text-[11px] w-full sm:w-auto">
                    <summary className="list-none cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">
                      <span>Expandir</span>
                      <span className="text-xs">v</span>
                    </summary>
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 space-y-2 text-[10px] sm:text-[11px] text-slate-600">
                      {recentDays.length === 0 && <p>Sem registros recentes.</p>}
                      {recentDays.map((day) => (
                        <div className="flex items-center justify-between" key={day.dateKey}>
                          <span>{formatDayLabel(day.dateKey)}</span>
                          <span className="font-semibold text-slate-800">
                            {formatDuration(day.totalMinutes)}
                            {day.totalMinutes > 480 ? ' - extra' : ''}
                          </span>
                        </div>
                      ))}
                      <p className="text-[9px] sm:text-[10px] text-slate-500">Use Registrar ponto para atualizar seu status em tempo real.</p>
                    </div>
                  </details>
                </header>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] sm:text-[11px] text-slate-500 px-0.5">
                    <span>Dom</span>
                    <span>Seg</span>
                    <span>Ter</span>
                    <span>Qua</span>
                    <span>Qui</span>
                    <span>Sex</span>
                    <span>Sab</span>
                  </div>

                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {heatmapData.map((column, colIdx) => (
                      <div className="flex flex-col gap-1" key={`col-${colIdx}`}>
                        {column.map((cell) => (
                          <span
                            key={cell.key}
                            className={`h-3 w-3 rounded-[6px] ${heatmapColors[cell.level]} border border-slate-100`}
                            title={`${formatDayLabel(cell.key)} - ${formatDuration(dayMinutesMap[cell.key] || 0)}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[9px] sm:text-[10px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>Menos horas</span>
                      <div className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-[6px] bg-slate-100 border border-slate-100" />
                        <span className="h-3 w-3 rounded-[6px] bg-emerald-100 border border-slate-100" />
                        <span className="h-3 w-3 rounded-[6px] bg-emerald-300 border border-slate-100" />
                        <span className="h-3 w-3 rounded-[6px] bg-emerald-500 border border-slate-100" />
                      </div>
                      <span>Mais horas</span>
                    </div>
                    <span className="whitespace-nowrap font-semibold text-emerald-600 text-[10px]">Horas extras</span>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200 shadow-[0_14px_35px_rgba(15,23,42,0.06)] px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-3 sm:gap-4 hover:shadow-[0_18px_45px_rgba(15,23,42,0.09)] transition h-full">
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] sm:text-xs font-medium tracking-[0.16em] uppercase text-slate-500">Time Off</p>
                    <h2 className="text-sm font-semibold text-slate-900">Ferias e Ausencias</h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Saldo atualizado para o periodo atual.</p>
                  </div>
                </header>

                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-full border-[9px] sm:border-[10px] border-slate-100" />
                    <div className="absolute inset-0 rounded-full border-[9px] sm:border-[10px] border-[#1e2a78] border-b-transparent border-l-transparent border-r-transparent rotate-[135deg]" />
                    <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white flex flex-col items-center justify-center shadow-sm">
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-wide text-slate-400">Dias</span>
                      <span className="text-[12px] sm:text-sm font-semibold text-slate-900">12</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-[11px] sm:text-[12px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Saldo disponivel</span>
                      <span className="font-semibold text-slate-900">12 dias</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Proximas ferias</span>
                      <span className="font-semibold text-slate-900">21-28 ago</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Status</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-[9px] sm:text-[10px] font-medium text-emerald-600 border border-emerald-100">
                        Aprovado
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    className="w-full h-9 sm:h-10 rounded-full bg-[#1e2a78] hover:bg-[#25338f] text-[11px] sm:text-xs font-semibold text-white shadow-md active:scale-[0.98] transition"
                    type="button"
                  >
                    Solicitar ferias
                  </button>
                </div>
              </section>

              <section className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200 shadow-[0_14px_35px_rgba(15,23,42,0.06)] px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-2 sm:gap-3 hover:shadow-[0_18px_45px_rgba(15,23,42,0.09)] transition h-full">
                <header className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 text-xs sm:text-sm">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium tracking-[0.16em] uppercase text-slate-500">Company</p>
                      <h2 className="text-sm font-semibold text-slate-900">Comunicados</h2>
                    </div>
                  </div>
                  <button className="text-[10px] sm:text-[11px] font-medium text-[#1e2a78] hover:text-[#25338f] whitespace-nowrap" type="button">
                    Ver todos
                  </button>
                </header>

                <div className="mt-1 space-y-1 text-[11px] sm:text-[12px]">
                  <p className="font-medium text-slate-900">Atualizacao do modelo hibrido</p>
                  <p className="text-slate-500">
                    A partir de setembro, passaremos a contar com 3 dias de home office por semana para todas as equipes administrativas.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Enviado em 12 ago - 17:42 - Escritorio Central</p>
                </div>
              </section>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
