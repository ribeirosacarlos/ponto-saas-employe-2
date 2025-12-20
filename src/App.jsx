import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Dashboard from './pages/Dashboard.jsx'
import Documents from './pages/Documents.jsx'
import Login from './pages/Login.jsx'
import TimeClock from './pages/TimeClock.jsx'
import History from './pages/History.jsx'
import { AppSidebar } from './components/AppSidebar.jsx'
import { useAuthStore } from './store/useAuth.js'
import { useToast } from './components/ui/use-toast'
import { useTheme } from './providers/ThemeProvider.jsx'
import { cn } from './lib/utils'

const PAGE_PATHS = {
  login: '/',
  timeClock: '/time-clock',
  dashboard: '/dashboard',
  history: '/history',
  documents: '/documents',
}

const resolvePageFromPath = (path) => {
  if (!path) return 'login'
  const normalized = path.replace(/\/+$/, '') || '/'
  if (normalized === '/history' || normalized === '/time-entries') return 'history'
  if (normalized === '/dashboard') return 'dashboard'
  if (normalized === '/time-clock') return 'timeClock'
  if (normalized === '/documents') return 'documents'
  return 'login'
}

export default function App() {
  const token = useAuthStore((state) => state.token)
  const restoreSession = useAuthStore((state) => state.restoreSession)
  const logout = useAuthStore((state) => state.logout)
  const { theme } = useTheme()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(() =>
    typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'login',
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
      navigateTo('login', true)
      return
    }

    const pageFromPath =
      typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'timeClock'
    const nextPage = pageFromPath === 'login' ? 'timeClock' : pageFromPath
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
        setCurrentPage('login')
        return
      }
      setCurrentPage(pageFromPath === 'login' ? 'timeClock' : pageFromPath)
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

  const handleGoToDashboard = () => navigateTo('dashboard')
  const handleGoToHistory = () => navigateTo('history')
  const handleGoToTimeClock = () => navigateTo('timeClock')
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])
  const handleGoToDocuments = () => navigateTo('documents')
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
            <AppSidebar
              sidebarOpen={sidebarOpen}
              currentPage={currentPage}
              onNavigate={navigateTo}
              onClose={() => setSidebarOpen(false)}
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
        ) : (
          <Login onGoToTimeClock={handleGoToTimeClock} />
        )}
      </div>
    </div>
  )
}
