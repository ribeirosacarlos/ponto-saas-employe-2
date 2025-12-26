import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock3, FileText, Home, ListChecks, Settings, Users } from 'lucide-react'
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
<<<<<<< HEAD
import PlatformCompanies from './pages/PlatformCompanies.jsx'
=======
import AdminAnnouncements from './pages/AdminAnnouncements.jsx'
>>>>>>> 40fe9103dfcf8bd83894c8af9146089432eb6873
import { AppSidebar } from './components/AppSidebar.jsx'
import { useAuthStore } from './store/useAuth.js'
import { getWorkedToday } from './lib/api'
import { useToast } from './components/ui/use-toast'
import { UserProfileDropdown } from './components/UserProfileDropdown'
import { useTheme } from './providers/ThemeProvider.jsx'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { ThemeToggle } from './components/ThemeToggle'
import { cn } from './lib/utils'
import { canRenderCard, getCapabilitiesFromRoles } from './auth/acl'

const PAGE_PATHS = {
  login: '/',
  activateAccount: '/activate-account',
  timeClock: '/time-clock',
  dashboard: '/dashboard',
  history: '/history',
  documents: '/documents',
  vacations: '/vacations',
  adminVacations: '/admin/vacations',
  adminAnnouncements: '/admin/announcements',

  equipo: '/equipo',
  announcements: '/announcements',
  platformCompanies: '/platform/companies',
}

const PAGE_GUARDS = {
  equipo: { anyOf: ['area_manager'] },
  vacations: { anyOf: ['employee'] },
  announcements: { anyOf: ['employee'] },
  adminVacations: { anyOf: ['area_manager', 'admin', 'super_admin'] },
<<<<<<< HEAD
  platformCompanies: { anyOf: ['super_admin'] },
=======
  adminAnnouncements: { anyOf: ['area_manager', 'admin', 'super_admin'] },
>>>>>>> 40fe9103dfcf8bd83894c8af9146089432eb6873
}

const resolvePageFromPath = (path) => {
  if (!path) return 'login'
  const normalized = path.replace(/\/+$/, '') || '/'
  if (normalized === '/history' || normalized === '/time-entries') return 'history'
  if (normalized === '/dashboard') return 'dashboard'
  if (normalized === '/time-clock') return 'timeClock'
  if (normalized === '/documents') return 'documents'
  if (normalized === '/vacations') return 'vacations'
  if (normalized === '/admin/vacations') return 'adminVacations'
  if (normalized === '/admin/announcements') return 'adminAnnouncements'
  if (normalized === '/equipo') return 'equipo'
  if (normalized === '/announcements') return 'announcements'
  if (normalized === '/platform/companies') return 'platformCompanies'

  if (normalized === '/activate-account') return 'activateAccount'
  return 'login'
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
  const [todayBadge, setTodayBadge] = useState(t('dashboardPage.badges.today'))

  const formatMinutesToLabel = useCallback((minutes) => {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return t('dashboardPage.badges.today')
    const totalMinutes = Math.max(0, Math.round(minutes))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mins = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${mins}`
  }, [t])

  const canAccessPage = useCallback(
    (page) => canRenderCard(capabilities, PAGE_GUARDS[page]),
    [capabilities],
  )

  const navigateTo = useCallback(
    (page, replace = false) => {
      const allowedPage = canAccessPage(page) ? page : 'dashboard'
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
              onToggle={handleToggleSidebar}
              onProfile={handleProfile}
              onHelp={handleHelp}
              onLogout={handleLogout}
            />

            <main
              className={cn(
                'flex-1 flex min-h-screen flex-col min-w-0 transition-all duration-300',
                sidebarOpen ? 'md:ml-64' : 'md:ml-0',
              )}
            >
              <div className="flex-1 min-h-0">
<<<<<<< HEAD
                {currentPage === 'dashboard' ? (
                  <Dashboard
                    onOpenHistory={handleGoToHistory}
                    onOpenDocuments={handleGoToDocuments}
                    onOpenVacations={handleGoToVacations}
                    onOpenAnnouncements={handleGoToAnnouncements}
                  />
                ) : currentPage === 'history' ? (
                  <History
                    onBackToDashboard={handleGoToDashboard}
                  />
                ) : currentPage === 'documents' ? (
                  <Documents />
                ) : currentPage === 'vacations' ? (
                  <Vacations />
                ) : currentPage === 'adminVacations' ? (
                  <AdminVacations />
                ) : currentPage === 'announcements' ? (
                  <Announcements />
                ) : currentPage === 'platformCompanies' ? (
                  <PlatformCompanies />
                ) : currentPage === 'equipo' ? (
                  <Equipo />
                ) : (
                  <TimeClock
                    onContinueToDashboard={handleGoToDashboard}
                  />
                )}
=======
                <div className="mx-auto w-full max-w-[1320px]">
                  {currentPage === 'dashboard' ? (
                    <Dashboard
                      onOpenHistory={handleGoToHistory}
                      onOpenDocuments={handleGoToDocuments}
                      onOpenVacations={handleGoToVacations}
                      onOpenAnnouncements={handleGoToAnnouncements}
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
                  ) : currentPage === 'vacations' ? (
                    <Vacations sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
                  ) : currentPage === 'adminVacations' ? (
                    <AdminVacations sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
                  ) : currentPage === 'adminAnnouncements' ? (
                    <AdminAnnouncements
                      sidebarOpen={sidebarOpen}
                      onToggleSidebar={handleToggleSidebar}
                    />
                  ) : currentPage === 'announcements' ? (
                    <Announcements sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
                  ) : currentPage === 'equipo' ? (
                    <Equipo sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
                  ) : (
                    <TimeClock
                      onContinueToDashboard={handleGoToDashboard}
                      sidebarOpen={sidebarOpen}
                      onToggleSidebar={handleToggleSidebar}
                    />
                  )}
                </div>
>>>>>>> 40fe9103dfcf8bd83894c8af9146089432eb6873
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
