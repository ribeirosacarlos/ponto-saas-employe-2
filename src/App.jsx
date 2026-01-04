import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Documents from './pages/Documents.jsx'
import ActivateAccount from './pages/ActivateAccount'
import Login from './pages/Login.jsx'
import TimeClock from './pages/TimeClock.jsx'
import History from './pages/History.jsx'
import Equipo from './pages/Equipo.jsx'
import Vacations from './pages/Vacations.jsx'
import AdminVacations from './pages/AdminVacations.jsx'
import Announcements from './pages/Announcements.jsx'
import PlatformCompanies from './pages/PlatformCompanies.jsx'
import AdminAnnouncements from './pages/AdminAnnouncements.jsx'
import PlatformBillingPlans from './pages/PlatformBillingPlans.jsx'
import AdminShifts from './pages/AdminShifts.jsx'
import { AppSidebar } from './components/AppSidebar.jsx'
import { useAuthStore } from './store/useAuth.js'
import { getWorkedToday } from './lib/api'
import { useToast } from './components/ui/use-toast'
import { useTheme } from './providers/ThemeProvider.jsx'
import { cn } from './lib/utils'
import { canRenderCard, getCapabilitiesFromRoles } from './auth/acl'
import { PAGE_PATHS, ROUTES, resolvePageFromPath } from './routes/config'

const SIDEBAR_COLLAPSED_KEY = 'sidebar:collapsed'
const getInitialSidebarCollapsed = () => {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
  if (stored === '1') return true
  if (stored === '0') return false
  return false
}

export default function App() {
  const token = useAuthStore((state) => state.token)
  const restoreSession = useAuthStore((state) => state.restoreSession)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const roles = useAuthStore((state) => state.roles)
  const { theme } = useTheme()
  const { toast } = useToast()
  const { t } = useTranslation()
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const [currentPage, setCurrentPage] = useState(() =>
    typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'login',
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed)
  const [todayBadge, setTodayBadge] = useState(t('dashboardPage.badges.today'))

  const formatMinutesToLabel = useCallback((minutes) => {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return t('dashboardPage.badges.today')
    const totalMinutes = Math.max(0, Math.round(minutes))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mins = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${mins}`
  }, [t])

  const canAccessPage = useCallback(
    (page) => canRenderCard(capabilities, ROUTES[page]?.guard),
    [capabilities],
  )

  const navigateTo = useCallback(
    (page, replace = false) => {
      const targetPage = ROUTES[page] ? page : 'dashboard'
      const allowedPage = canAccessPage(targetPage) ? targetPage : 'dashboard'
      const path = PAGE_PATHS[allowedPage] || '/'
      const method = replace || allowedPage !== page ? 'replaceState' : 'pushState'
      if (typeof window !== 'undefined') {
        window.history[method]({ page: allowedPage }, '', path)
      }
      setCurrentPage(allowedPage)
    },
    [canAccessPage],
  )

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
    const allowedPage = canAccessPage(nextPage) ? nextPage : 'dashboard'
    if (pageFromPath === 'login' || allowedPage !== pageFromPath) {
      navigateTo(allowedPage, true)
      return
    }
    setCurrentPage(allowedPage)
  }, [canAccessPage, navigateTo, token])

  useEffect(() => {
    const handlePopstate = () => {
      const pageFromPath =
        typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'login'
      if (!token) {
        setCurrentPage(pageFromPath === 'activateAccount' ? 'activateAccount' : 'login')
        return
      }
      const resolvedPage =
        pageFromPath === 'login' || pageFromPath === 'activateAccount' ? 'timeClock' : pageFromPath
      if (!canAccessPage(resolvedPage)) {
        navigateTo('dashboard', true)
        return
      }
      setCurrentPage(resolvedPage)
    }

    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [canAccessPage, navigateTo, token])


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
  const handleGoToVacations = () => navigateTo('vacations')
  const handleGoToAnnouncements = () => navigateTo('announcements')
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

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            onOpenHistory={handleGoToHistory}
            onOpenDocuments={handleGoToDocuments}
            onOpenVacations={handleGoToVacations}
            onOpenAnnouncements={handleGoToAnnouncements}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={handleToggleSidebar}
          />
        )
      case 'history':
        return (
          <History
            onBackToDashboard={handleGoToDashboard}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={handleToggleSidebar}
          />
        )
      case 'documents':
        return <Documents sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'vacations':
        return <Vacations sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'adminVacations':
        return <AdminVacations sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'adminShifts':
        return <AdminShifts sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'adminAnnouncements':
        return <AdminAnnouncements sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'platformBillingPlans':
        return <PlatformBillingPlans sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'platformCompanies':
        return <PlatformCompanies />
      case 'announcements':
        return <Announcements sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'equipo':
        return <Equipo sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      default:
        return (
          <TimeClock
            onContinueToDashboard={handleGoToDashboard}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={handleToggleSidebar}
          />
        )
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])


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
            <div
              aria-hidden="true"
              className={cn(
                'fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 md:hidden',
                sidebarOpen ? 'opacity-70 pointer-events-auto' : 'opacity-0 pointer-events-none',
              )}
            />
            <AppSidebar
              sidebarOpen={sidebarOpen}
              currentPage={currentPage}
              onNavigate={navigateTo}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
              onToggle={handleToggleSidebar}
              onProfile={handleProfile}
              onHelp={handleHelp}
              onLogout={handleLogout}
            />

            <main
              className={cn(
                'relative flex-1 flex min-h-screen flex-col min-w-0 transition-all duration-300',
                sidebarOpen ? (sidebarCollapsed ? 'md:ml-16' : 'md:ml-64') : 'md:ml-0',
              )}
            >
              <div className="flex-1 min-h-0">
                <div className="mx-auto w-full max-w-[1320px]">
                  {renderCurrentPage()}
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
