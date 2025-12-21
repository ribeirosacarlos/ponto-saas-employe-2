import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock3, FileText, Home, ListChecks, Settings, Users } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Documents from './pages/Documents.jsx'
import Employees from './pages/Employees.jsx'
import ActivateAccount from './pages/ActivateAccount'
import Login from './pages/Login.jsx'
import TimeClock from './pages/TimeClock.jsx'
import History from './pages/History.jsx'
import { useAuthStore } from './store/useAuth.js'
import { getWorkedToday } from './lib/api'
import { useToast } from './components/ui/use-toast'
import { UserProfileDropdown } from './components/UserProfileDropdown'
import { useTheme } from './providers/ThemeProvider.jsx'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { ThemeToggle } from './components/ThemeToggle'
import { cn } from './lib/utils'

const PAGE_PATHS = {
  login: '/',
  activateAccount: '/activate-account',
  timeClock: '/time-clock',
  dashboard: '/dashboard',
  history: '/history',
  documents: '/documents',
  employees: '/employees',
}

const resolvePageFromPath = (path) => {
  if (!path) return 'login'
  const normalized = path.replace(/\/+$/, '') || '/'
  if (normalized === '/history' || normalized === '/time-entries') return 'history'
  if (normalized === '/dashboard') return 'dashboard'
  if (normalized === '/time-clock') return 'timeClock'
  if (normalized === '/documents') return 'documents'
  if (normalized === '/employees') return 'employees'
  if (normalized === '/activate-account') return 'activateAccount'
  return 'login'
}

export default function App() {
  const token = useAuthStore((state) => state.token)
  const restoreSession = useAuthStore((state) => state.restoreSession)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { theme } = useTheme()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(() =>
    typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'login',
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [todayBadge, setTodayBadge] = useState(t('dashboardPage.badges.today'))

  const formatMinutesToLabel = useCallback((minutes) => {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return t('dashboardPage.badges.today')
    const totalMinutes = Math.max(0, Math.round(minutes))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mins = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${mins}`
  }, [t])

  const navigateTo = useCallback((page, replace = false) => {
    const path = PAGE_PATHS[page] || '/'
    const method = replace ? 'replaceState' : 'pushState'
    if (typeof window !== 'undefined') {
      window.history[method]({ page }, '', path)
    }
    setCurrentPage(page)
  }, [])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  useEffect(() => {
    if (!token) {
      const pageFromPath =
        typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'login'

      if (pageFromPath === 'activateAccount') {
        setCurrentPage('activateAccount')
        return
      }

      navigateTo('login', true)
      return
    }

    const pageFromPath =
        typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'timeClock'
    const nextPage =
      pageFromPath === 'login' || pageFromPath === 'activateAccount' ? 'timeClock' : pageFromPath
    setCurrentPage(nextPage)
    if (pageFromPath === 'login') {
      navigateTo(nextPage, true)
    }
  }, [navigateTo, token])

  useEffect(() => {
    const handlePopstate = () => {
      const pageFromPath =
        typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'login'
      if (!token) {
        setCurrentPage(pageFromPath === 'activateAccount' ? 'activateAccount' : 'login')
        return
      }
      setCurrentPage(
        pageFromPath === 'login' || pageFromPath === 'activateAccount' ? 'timeClock' : pageFromPath,
      )
    }

    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [token])

  useEffect(() => {
    if (!sidebarOpen) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])
  useEffect(() => {
    let active = true

    const fetchWorkedToday = async () => {
      if (!token) {
        setTodayBadge(t('dashboardPage.badges.today'))
        return
      }
      try {
        const data = await getWorkedToday()
        console.log('[App] /v1/employee/worked-today response:', data)
        const minutes =
          data?.workedMinutes ??
          data?.worked_minutes ??
          (data?.workedSeconds ?? data?.worked_seconds) / 60
        if (!active) return
        setTodayBadge(formatMinutesToLabel(minutes))
      } catch (error) {
        console.error('[App] Failed to load worked-today', error)
        if (!active) return
        setTodayBadge(t('dashboardPage.badges.today'))
      }
    }

    fetchWorkedToday()
    return () => {
      active = false
    }
  }, [formatMinutesToLabel, t, token])

  const handleGoToDashboard = () => navigateTo('dashboard')
  const handleGoToHistory = () => navigateTo('history')
  const handleGoToTimeClock = () => navigateTo('timeClock')
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])
  const handleGoToDocuments = () => navigateTo('documents')
  const handleGoToEmployees = () => navigateTo('employees')
  const handleProfile = () => {
    toast({
      title: t('dashboardPage.toasts.profile.title'),
      description: t('dashboardPage.toasts.profile.description'),
    })
  }
  const handleHelp = () => {
    toast({
      title: t('dashboardPage.toasts.help.title'),
      description: t('dashboardPage.toasts.help.description'),
    })
  }
  const handleLogout = async () => {
    await logout()
    toast({
      title: t('toast.logout.title'),
      description: t('toast.logout.description'),
    })
  }
  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const navItems = [
    {
      label: t('dashboardPage.nav.dashboard'),
      icon: Home,
      page: 'dashboard',
      onClick: handleGoToDashboard,
      badge: todayBadge,
    },
    {
      label: t('dashboardPage.nav.history'),
      icon: ListChecks,
      page: 'history',
      onClick: handleGoToHistory,
    },
    {
      label: t('dashboardPage.nav.documents'),
      icon: FileText,
      page: 'documents',
      onClick: handleGoToDocuments,
    },
    {
      label: t('dashboardPage.nav.employees'),
      icon: Users,
      page: 'employees',
      onClick: handleGoToEmployees,
    },
    { label: t('dashboardPage.nav.calendar'), icon: CalendarDays },
    {
      label: t('dashboardPage.nav.registerPoint'),
      icon: Clock3,
      page: 'timeClock',
      onClick: handleGoToTimeClock,
    },
    { label: t('dashboardPage.nav.projects'), icon: ListChecks },
    { label: t('dashboardPage.nav.team'), icon: Users },
    { label: t('dashboardPage.nav.settings'), icon: Settings },
  ]

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300',
        theme === 'dark'
          ? 'bg-gradient-to-b from-[#060915] via-[#0d1629] to-background'
          : 'bg-gradient-to-b from-primary/8 via-[#f3f5ff] to-background',
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-8%] h-64 w-64 rounded-full bg-primary/16 blur-[120px] dark:bg-primary/24" />
        <div className="absolute right-[-5%] top-1/4 h-72 w-72 rounded-full bg-sky-300/16 blur-[120px] dark:bg-sky-400/12" />
        <div className="absolute bottom-[-12%] right-[-12%] h-80 w-80 rounded-full bg-indigo-200/14 blur-[130px] dark:bg-indigo-500/12" />
      </div>
      <div className="relative z-10">
        {token ? (
          <>
            <button
              type="button"
              aria-label={t('dashboardPage.header.closeMenu')}
              className={cn(
                'fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 md:hidden',
                sidebarOpen ? 'opacity-70 pointer-events-auto' : 'opacity-0 pointer-events-none',
              )}
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className={cn(
                'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/70 bg-card/95 px-5 py-6 text-foreground shadow-[0_24px_70px_-42px_rgba(62,82,152,0.35)] backdrop-blur-xl transition-transform duration-300',
                sidebarOpen ? 'translate-x-0 md:translate-x-0' : '-translate-x-full md:-translate-x-full',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-semibold tracking-tight text-primary-foreground shadow-inner shadow-primary/35">
                    HR
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">
                      Synergy
                    </span>
                    <span className="text-[11px] text-muted-foreground">HR Management</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-1 flex-col overflow-hidden">
                <nav className="flex-1 space-y-1 text-[12px] lg:text-[13px] overflow-y-auto pr-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = item.page ? currentPage === item.page : item.active
                    return (
                      <button
                        key={item.label}
                        className={`w-full flex items-center justify-between rounded-2xl px-3 py-2.5 transition ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-semibold shadow-[0_18px_40px_-24px_rgba(62,82,152,0.55)]'
                            : 'text-foreground/80 hover:bg-muted/80 hover:text-foreground'
                        }`}
                        onClick={() => {
                          item.onClick?.()
                          closeSidebarOnMobile()
                        }}
                        type="button"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {item.badge ? (
                          <span className="rounded-full border border-primary/20 bg-primary/15 px-2 py-0.5 text-[10px] lg:text-[11px] text-primary-foreground/90">
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </nav>
              </div>

              <div className="mt-auto w-full space-y-3">
                <div className="space-y-2">
                  <LanguageSwitcher className="w-full" />
                  <ThemeToggle className="w-full" />
                </div>
                <UserProfileDropdown
                  user={user}
                  onProfile={handleProfile}
                  onHelp={handleHelp}
                  onLogout={handleLogout}
                />
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/70 px-3 py-2 text-[10px] lg:text-[11px] text-muted-foreground">
                  <span>{t('dashboardPage.version.label')}</span>
                  <span>{t('dashboardPage.version.product')}</span>
                </div>
              </div>
            </aside>

            <main
              className={cn(
                'flex-1 flex min-h-screen flex-col min-w-0 transition-all duration-300',
                sidebarOpen ? 'md:ml-64' : 'md:ml-0',
              )}
            >
              <div className="flex-1 min-h-0">
                <div className="mx-auto w-full max-w-[1320px]">
                  {currentPage === 'dashboard' ? (
                  <Dashboard
                    onOpenHistory={handleGoToHistory}
                    onOpenDocuments={handleGoToDocuments}
                    sidebarOpen={sidebarOpen}
                    onToggleSidebar={handleToggleSidebar}
                  />
                  ) : currentPage === 'history' ? (
                    <History
                      onBackToDashboard={handleGoToDashboard}
                      sidebarOpen={sidebarOpen}
                      onToggleSidebar={handleToggleSidebar}
                    />
                  ) : currentPage === 'documents' ? (
                    <Documents sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
                  ) : currentPage === 'employees' ? (
                    <Employees sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
                  ) : (
                    <TimeClock
                      onContinueToDashboard={handleGoToDashboard}
                      sidebarOpen={sidebarOpen}
                      onToggleSidebar={handleToggleSidebar}
                    />
                  )}
                </div>
              </div>
            </main>
          </>
        ) : currentPage === 'activateAccount' ? (
          <ActivateAccount />
        ) : (
          <Login onGoToTimeClock={handleGoToTimeClock} />
        )}
      </div>
    </div>
  )
}
