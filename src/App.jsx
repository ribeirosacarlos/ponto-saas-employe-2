import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu, ShieldAlert, X } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Documents from './pages/Documents.jsx'
import ActivateAccount from './pages/ActivateAccount'
import Login from './pages/Login.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import TimeClock from './pages/TimeClock.jsx'
import History from './pages/History.jsx'
import Equipo from './pages/Equipo.jsx'
import Vacations from './pages/Vacations.jsx'
import AdminVacations from './pages/AdminVacations.jsx'
import AdminAdjustments from './pages/AdminAdjustments.jsx'
import CloseTimesheetPage from './pages/area-manager/CloseTimesheetPage.tsx'
import Announcements from './pages/Announcements.jsx'
import PlatformCompanies from './pages/PlatformCompanies.jsx'
import AdminAnnouncements from './pages/AdminAnnouncements.jsx'
import AdminCompanyTimezone from './pages/AdminCompanyTimezone.jsx'
import PlatformBillingPlans from './pages/PlatformBillingPlans.jsx'
import SuperAdminDashboard from './pages/SuperAdminDashboard.jsx'
import SuperAdminCompanies from './pages/SuperAdminCompanies.jsx'
import SuperAdminCompanyDetails from './pages/SuperAdminCompanyDetails.jsx'
import AuditLogs from './pages/AuditLogs.jsx'
import AdminShifts from './pages/AdminShifts.jsx'
import AdminAreas from './pages/AdminAreas.jsx'
import AdminDocuments from './pages/AdminDocuments.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import CompanyMissingPage from './pages/CompanyMissingPage.jsx'
import SubscribePage from './pages/SubscribePage.jsx'
import ForbiddenPage from './pages/ForbiddenPage.jsx'
import { DesktopSidebar } from './components/sidebar/DesktopSidebar.jsx'
import { MobileSidebarDrawer } from './components/sidebar/MobileSidebarDrawer.jsx'
import { BottomNavigation } from './components/sidebar/BottomNavigation.jsx'
import { BrandSignature } from './components/BrandSignature.jsx'
import { HelpContactDialog } from './components/HelpContactDialog.jsx'
import { Button } from './components/ui/button.jsx'
import { Card, CardContent } from './components/ui/card.jsx'
import { useAuthStore } from './store/useAuth.js'
import { getWorkedToday } from './services/modules/employee'
import { getCurrentUser, clearAuthCache } from './services/authService'
import { listAuditLogs } from './services/auditLogsService'
import { useToast } from './components/ui/use-toast'
import { useTheme } from './providers/ThemeProvider.jsx'
import { cn } from './lib/utils'
import { canRenderCard, getCapabilitiesFromRoles } from './auth/acl'
import { PAGE_PATHS, ROUTES, resolvePageFromPath, getRouteParams } from './routes/config'
import { NAV_ITEMS } from './config/nav.config'
import { useIsMobile } from './hooks/useMediaQuery'
import { useAccess } from './providers/AccessProvider.jsx'
import { ACCESS_DENIED_REASONS, getAccessRedirect } from './lib/accessDenied'
import { useAdminOnboarding } from './hooks/useAdminOnboarding.js'
import { useEmployeeOnboarding } from './hooks/useEmployeeOnboarding.js'

const SIDEBAR_COLLAPSED_KEY = 'sidebar:collapsed'
const PUBLIC_AUTH_PAGES = new Set(['activateAccount', 'resetPassword', 'forgotPassword'])
const NAV_GROUP_ORDER = {
  workspace: 0,
  admin: 1,
  superAdmin: 2,
}
const ADMIN_LAST_ITEM_IDS = new Set(['settings'])

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
  const syncProfile = useAuthStore((state) => state.syncProfile)
  const { theme } = useTheme()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { accessDeniedReason, lastDeniedMessage, lastDeniedContext, clearAccessDenied } = useAccess()
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const isSuperAdminOnlyNav = useMemo(
    () => roles?.some((role) => String(role).toLowerCase() === 'super_admin'),
    [roles],
  )
  const isMobile = useIsMobile()
  const [currentPage, setCurrentPage] = useState(() =>
    typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'login',
  )
  const [currentRouteParams, setCurrentRouteParams] = useState(() =>
    typeof window !== 'undefined'
      ? getRouteParams(resolvePageFromPath(window.location.pathname), window.location.pathname)
      : {},
  )
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed)
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)
  const [todayBadge, setTodayBadge] = useState(t('dashboardPage.badges.today'))
  const [isHandlingPublicAuthRoute, setIsHandlingPublicAuthRoute] = useState(false)
  const [companyAuditAccess, setCompanyAuditAccess] = useState(null)

  const formatMinutesToLabel = useCallback((minutes) => {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return t('dashboardPage.badges.today')
    const totalMinutes = Math.max(0, Math.round(minutes))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mins = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${mins}`
  }, [t])

  const isSuperAdmin = useMemo(
    () => roles?.some((role) => String(role).toLowerCase() === 'super_admin'),
    [roles],
  )
  const isCompanyAdmin = useMemo(
    () => roles?.some((role) => String(role).toLowerCase() === 'admin'),
    [roles],
  )

  const allNavItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        const route = item.page ? ROUTES[item.page] : undefined
        return {
          ...item,
          badge: item.id === 'dashboard' ? todayBadge : item.badge,
          badgeKey: item.id === 'dashboard' ? undefined : item.badgeKey,
          path: route?.path ?? item.path,
          requires: item.requires ?? route?.guard ?? (route?.isPublic ? { public: true } : undefined),
        }
      })
        .filter((item) => canRenderCard(capabilities, item.requires))
        .filter((item) => (isSuperAdminOnlyNav ? item.group === 'superAdmin' : true))
        .filter((item) => {
          if (item.id !== 'auditLogsAdmin') return true
          return companyAuditAccess === true
        })
        .sort((left, right) => {
          const groupOrder =
            (NAV_GROUP_ORDER[left.group] ?? Number.MAX_SAFE_INTEGER) -
            (NAV_GROUP_ORDER[right.group] ?? Number.MAX_SAFE_INTEGER)

          if (groupOrder !== 0) return groupOrder

          const leftIsAdminLast = left.group === 'admin' && ADMIN_LAST_ITEM_IDS.has(left.id)
          const rightIsAdminLast = right.group === 'admin' && ADMIN_LAST_ITEM_IDS.has(right.id)

          if (leftIsAdminLast !== rightIsAdminLast) {
            return leftIsAdminLast ? 1 : -1
          }

          return t(left.labelKey).localeCompare(t(right.labelKey), undefined, {
            sensitivity: 'base',
          })
        }),
    [capabilities, companyAuditAccess, isSuperAdminOnlyNav, t, todayBadge],
  )

  const desktopNavItems = useMemo(
    () => allNavItems.filter((item) => item.showInDesktop !== false),
    [allNavItems],
  )

  const drawerNavItems = useMemo(
    () => allNavItems.filter((item) => item.showInDrawer !== false),
    [allNavItems],
  )

  const bottomNavItems = useMemo(
    () => allNavItems.filter((item) => item.showInBottomNav),
    [allNavItems],
  )
  const shouldEnableAdminOnboarding =
    token &&
    currentPage === 'dashboard' &&
    canRenderCard(capabilities, { anyOf: ['area_manager', 'admin', 'super_admin'] })
  const shouldEnableEmployeeOnboarding =
    token &&
    currentPage === 'dashboard' &&
    canRenderCard(capabilities, { anyOf: ['employee'] }) &&
    !canRenderCard(capabilities, { anyOf: ['area_manager', 'admin', 'super_admin'] })
  const { restartAdminOnboarding } = useAdminOnboarding({
    enabled: shouldEnableAdminOnboarding,
    autoStart: true,
  })
  const { restartEmployeeOnboarding } = useEmployeeOnboarding({
    enabled: shouldEnableEmployeeOnboarding,
    autoStart: true,
  })

  const canAccessPage = useCallback(
    (page) => {
      if (page === 'auditLogs' && !isSuperAdmin && isCompanyAdmin && companyAuditAccess === false) {
        return false
      }
      return canRenderCard(capabilities, ROUTES[page]?.guard)
    },
    [capabilities, companyAuditAccess, isCompanyAdmin, isSuperAdmin],
  )

  const getDefaultAuthenticatedPage = useCallback(() => {
    if (canAccessPage('superAdminDashboard')) return 'superAdminDashboard'
    if (canAccessPage('dashboard')) return 'dashboard'
    if (canAccessPage('timeClock')) return 'timeClock'
    return 'dashboard'
  }, [canAccessPage])

  const navigateTo = useCallback(
    (page, replace = false, options = {}) => {
      const defaultPage = getDefaultAuthenticatedPage()
      const targetPage = ROUTES[page] ? page : defaultPage
      const allowedPage = canAccessPage(targetPage) ? targetPage : defaultPage
      const basePath = options.pathOverride || PAGE_PATHS[allowedPage] || '/'
      const path = options.search ? `${basePath}${options.search}` : basePath
      const method = replace || allowedPage !== page ? 'replaceState' : 'pushState'
      if (typeof window !== 'undefined') {
        window.history[method]({ page: allowedPage }, '', path)
      }
      setCurrentPage(allowedPage)
      setCurrentRouteParams(getRouteParams(allowedPage, path))
      if (isMobile) {
        setSidebarOpen(false)
      }
    },
    [canAccessPage, getDefaultAuthenticatedPage, isMobile],
  )

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile])

  useEffect(() => {
    if (!token) {
      setCompanyAuditAccess(null)
      setIsHandlingPublicAuthRoute(false)
      clearAccessDenied()
      const pageFromPath =
        typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'login'

      if (PUBLIC_AUTH_PAGES.has(pageFromPath)) {
        setCurrentPage(pageFromPath)
        setCurrentRouteParams(getRouteParams(pageFromPath, window.location.pathname))
        return
      }

      navigateTo('login', true)
      return
    }

    const pageFromPath =
      typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'timeClock'

    if (PUBLIC_AUTH_PAGES.has(pageFromPath)) {
      setCurrentPage(pageFromPath)
      setCurrentRouteParams(getRouteParams(pageFromPath, window.location.pathname))
      setIsHandlingPublicAuthRoute(true)
      void logout()
      return
    }

    setIsHandlingPublicAuthRoute(false)
    const defaultPage = getDefaultAuthenticatedPage()
    const nextPage =
      pageFromPath === 'login' ||
      PUBLIC_AUTH_PAGES.has(pageFromPath)
        ? defaultPage
        : pageFromPath
    const allowedPage = canAccessPage(nextPage) ? nextPage : defaultPage
    if (pageFromPath === 'login' || allowedPage !== pageFromPath) {
      navigateTo(allowedPage, true)
      return
    }
    setCurrentPage(allowedPage)
    setCurrentRouteParams(getRouteParams(allowedPage, window.location.pathname))
  }, [canAccessPage, clearAccessDenied, getDefaultAuthenticatedPage, navigateTo, token])

  useEffect(() => {
    if (!token) {
      setCompanyAuditAccess(null)
      return
    }

    if (isSuperAdmin) {
      setCompanyAuditAccess(true)
      return
    }

    if (!isCompanyAdmin) {
      setCompanyAuditAccess(false)
      return
    }

    let active = true

    const verifyAuditAccess = async () => {
      try {
        await listAuditLogs(
          'admin',
          { page: 1, per_page: 1 },
          { skipAccessDeniedHandling: true },
        )
        if (!active) return
        setCompanyAuditAccess(true)
      } catch (error) {
        if (!active) return
        if (error?.response?.status === 403) {
          setCompanyAuditAccess(false)
          return
        }
        setCompanyAuditAccess(true)
      }
    }

    verifyAuditAccess()

    return () => {
      active = false
    }
  }, [isCompanyAdmin, isSuperAdmin, token])

  useEffect(() => {
    const handlePopstate = () => {
      const pageFromPath =
        typeof window !== 'undefined' ? resolvePageFromPath(window.location.pathname) : 'login'
      if (!token) {
        setCurrentPage(PUBLIC_AUTH_PAGES.has(pageFromPath) ? pageFromPath : 'login')
        setCurrentRouteParams({})
        return
      }
      if (PUBLIC_AUTH_PAGES.has(pageFromPath)) {
        setCurrentPage(pageFromPath)
        setCurrentRouteParams(getRouteParams(pageFromPath, window.location.pathname))
        setIsHandlingPublicAuthRoute(true)
        void logout()
        return
      }

      const defaultPage = getDefaultAuthenticatedPage()
      const resolvedPage =
        pageFromPath === 'login' || PUBLIC_AUTH_PAGES.has(pageFromPath) ? defaultPage : pageFromPath
      if (!canAccessPage(resolvedPage)) {
        navigateTo(defaultPage, true)
        return
      }
      setCurrentPage(resolvedPage)
      setCurrentRouteParams(getRouteParams(resolvedPage, window.location.pathname))
    }

    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [canAccessPage, getDefaultAuthenticatedPage, navigateTo, token])

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [currentPage, isMobile])


  useEffect(() => {
    let active = true

    const bootstrapAccess = async () => {
      if (!token) return
      try {
        const profile = await getCurrentUser()
        if (!active) return
        if (profile?.user) {
          syncProfile(profile.user, profile.roles || [])
        }
        clearAccessDenied()
      } catch (error) {
        if (!active) return
        const status = error?.response?.status
        if (status === 401) {
          toast({
            title: t('toast.sessionExpired.title'),
            description: error.response?.data?.message || t('toast.sessionExpired.description'),
            variant: 'error',
          })
          await logout()
        }
      }
    }

    bootstrapAccess()
    return () => {
      active = false
    }
  }, [clearAccessDenied, logout, syncProfile, t, toast, token])

  useEffect(() => {
    if (!token || !accessDeniedReason) return
    if (accessDeniedReason === ACCESS_DENIED_REASONS.FORBIDDEN) return
    const redirect = getAccessRedirect(accessDeniedReason)
    if (!redirect?.page) return
    if (ROUTES[currentPage]?.isPublic) return
    if (currentPage === redirect.page) return

    navigateTo(redirect.page, true, { search: redirect.search })
  }, [accessDeniedReason, currentPage, navigateTo, token])

  useEffect(() => {
    let active = true

    const fetchWorkedToday = async () => {
      if (!token || accessDeniedReason) {
        setTodayBadge(t('dashboardPage.badges.today'))
        return
      }
      try {
        const data = await getWorkedToday()
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
  }, [accessDeniedReason, formatMinutesToLabel, t, token])

  const handleGoToDashboard = () => navigateTo('dashboard')
  const handleGoToHistory = () => navigateTo('history')
  const handleGoToTimeClock = () => navigateTo('timeClock')
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])
  const handleGoToDocuments = () => navigateTo('documents')
  const handleGoToVacations = () => navigateTo('vacations')
  const handleGoToAnnouncements = () => navigateTo('announcements')
  const handleGoToEmployees = () => navigateTo('equipo')
  const handleGoToAdminShifts = () => navigateTo('adminShifts')
  const handleGoToAdminReports = () => navigateTo('adminAdjustments')
  const handleProfile = () => {
    toast({
      title: t('dashboardPage.toasts.profile.title'),
      description: t('dashboardPage.toasts.profile.description'),
    })
  }
  const handleHelp = () => {
    setHelpDialogOpen(true)
  }
  const handleLogout = async () => {
    await logout()
    toast({
      title: t('toast.logout.title'),
      description: t('toast.logout.description'),
    })
  }

  const handleRetryAccess = useCallback(async () => {
    try {
      const profile = await getCurrentUser(true) // Force refresh
      if (profile?.user) {
        syncProfile(profile.user, profile.roles || [])
      }
      clearAccessDenied()
      navigateTo(getDefaultAuthenticatedPage(), true)
    } catch (error) {
      const status = error?.response?.status
      if (status === 401) {
        toast({
          title: t('toast.sessionExpired.title'),
          description: error.response?.data?.message || t('toast.sessionExpired.description'),
          variant: 'error',
        })
        await logout()
      }
    }
  }, [clearAccessDenied, getDefaultAuthenticatedPage, logout, navigateTo, syncProfile, t, toast])

  const accessDebugInfo = useMemo(() => {
    if (accessDeniedReason !== ACCESS_DENIED_REASONS.FORBIDDEN) return null

    return {
      pageLabel: lastDeniedContext?.page || currentPage,
      routePath:
        lastDeniedContext?.routePath ||
        (typeof window !== 'undefined' ? window.location.pathname : ''),
      requestUrl: lastDeniedContext?.requestUrl || '',
      requestMethod: lastDeniedContext?.requestMethod || '',
    }
  }, [accessDeniedReason, currentPage, lastDeniedContext])

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            onOpenHistory={handleGoToHistory}
            onOpenDocuments={handleGoToDocuments}
            onOpenVacations={handleGoToVacations}
            onOpenAnnouncements={handleGoToAnnouncements}
            onOpenEmployees={handleGoToEmployees}
            onOpenAdminShifts={handleGoToAdminShifts}
            onOpenAdminReports={handleGoToAdminReports}
            onRestartAdminOnboarding={restartAdminOnboarding}
            onOpenTimeClock={handleGoToTimeClock}
            onRestartEmployeeOnboarding={restartEmployeeOnboarding}
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
      case 'adminAdjustments':
        return <AdminAdjustments sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'adminDocuments':
        return <AdminDocuments sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'adminShifts':
        return <AdminShifts sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'adminAreas':
        return <AdminAreas sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'adminAnnouncements':
        return <AdminAnnouncements sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'auditLogs':
        return <AuditLogs />
      case 'adminCompanyTimezone':
        return <AdminCompanyTimezone sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'closeTimesheet':
        return <CloseTimesheetPage sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'platformBillingPlans':
        return <PlatformBillingPlans sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'platformCompanies':
        return <PlatformCompanies />
      case 'superAdminDashboard':
        return <SuperAdminDashboard />
      case 'superAdminCompanies':
        return (
          <SuperAdminCompanies
            onOpenCompany={(id) =>
              navigateTo('superAdminCompanyDetails', false, { pathOverride: `/super-admin/companies/${id}` })
            }
          />
        )
      case 'superAdminCompanyDetails':
        return (
          <SuperAdminCompanyDetails
            companyId={currentRouteParams.id}
            onBack={() => navigateTo('superAdminCompanies')}
            onSubscriptionUpdated={() => {}}
          />
        )
      case 'announcements':
        return <Announcements sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'equipo':
        return <Equipo sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      case 'settings':
        return <SettingsPage />
      case 'companyMissing':
        return (
          <CompanyMissingPage
            message={lastDeniedMessage}
            onRetry={handleRetryAccess}
          />
        )
      case 'subscribe':
        return (
          <SubscribePage
            message={lastDeniedMessage}
            onRetry={handleRetryAccess}
          />
        )
      case 'forbidden':
        return (
          <ForbiddenPage
            message={lastDeniedMessage}
            onRetry={handleRetryAccess}
          />
        )
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

  const shouldRenderPublicAuthPage =
    PUBLIC_AUTH_PAGES.has(currentPage) && (!token || isHandlingPublicAuthRoute)

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
        {shouldRenderPublicAuthPage ? (
          currentPage === 'activateAccount' ? (
            <ActivateAccount />
          ) : currentPage === 'resetPassword' ? (
            <ResetPassword />
          ) : (
            <ForgotPassword />
          )
        ) : token ? (
          <>
            {!isMobile ? (
              <DesktopSidebar
                open={sidebarOpen}
                collapsed={sidebarCollapsed}
                navItems={desktopNavItems}
                currentPage={currentPage}
                onNavigate={navigateTo}
                user={user}
                onProfile={handleProfile}
                onHelp={handleHelp}
                onLogout={handleLogout}
                onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
              />
            ) : (
              <MobileSidebarDrawer
                open={sidebarOpen}
                onOpenChange={setSidebarOpen}
                navItems={drawerNavItems}
                currentPage={currentPage}
                user={user}
                onNavigate={navigateTo}
                onProfile={handleProfile}
                onHelp={handleHelp}
                onLogout={handleLogout}
              />
            )}

            <main
              className={cn(
                'relative flex-1 flex min-h-screen flex-col min-w-0 pb-24 md:pb-0 transition-all duration-300',
                !isMobile && sidebarOpen
                  ? sidebarCollapsed
                    ? 'md:ml-16'
                    : 'md:ml-64'
                  : 'md:ml-0',
              )}
              style={
                isMobile
                  ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }
                  : undefined
              }
            >
              {isMobile ? (
                <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-card/90 px-4 py-3 shadow-[0_12px_45px_-30px_rgba(62,82,152,0.6)] backdrop-blur-xl">
                  <button
                    type="button"
                    aria-label={t('sidebar.actions.openMenu', { defaultValue: 'Open menu' })}
                    onClick={() => setSidebarOpen(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted text-foreground transition hover:bg-muted/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <BrandSignature />
                </div>
              ) : null}
              <div className="flex-1 min-h-0">
                <div className="mx-auto w-full max-w-[1320px]">
                  {accessDebugInfo ? (
                    <div className="px-4 pt-4 md:px-6">
                      <Card className="border-rose-200/70 bg-rose-50/80 shadow-[0_18px_50px_-35px_rgba(244,63,94,0.45)] dark:border-rose-500/30 dark:bg-rose-500/10">
                        <CardContent className="flex flex-col gap-3 px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
                                <ShieldAlert className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-rose-700 dark:text-rose-100">
                                  Permissão negada nesta página
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-full px-2 text-rose-700 hover:bg-rose-100 dark:text-rose-100 dark:hover:bg-rose-500/10"
                              onClick={clearAccessDenied}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-2 text-sm text-rose-800 dark:text-rose-50">
                            <p>
                              <span className="font-semibold">Página:</span> <code>{accessDebugInfo.pageLabel}</code>
                            </p>
                            <p>
                              <span className="font-semibold">Rota atual:</span> <code>{accessDebugInfo.routePath || '-'}</code>
                            </p>
                            <p>
                              <span className="font-semibold">Request bloqueada:</span>{' '}
                              <code>{accessDebugInfo.requestMethod || 'GET'} {accessDebugInfo.requestUrl || '-'}</code>
                            </p>
                            {lastDeniedMessage ? (
                              <p>
                                <span className="font-semibold">Mensagem:</span> <code>{lastDeniedMessage}</code>
                              </p>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}
                  {renderCurrentPage()}
                </div>
              </div>
            </main>
            {isMobile ? (
              <BottomNavigation
                items={bottomNavItems}
                currentPage={currentPage}
                onNavigate={navigateTo}
              />
            ) : null}
            <HelpContactDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
          </>
        ) : (
          <Login onGoToTimeClock={handleGoToTimeClock} />
        )}
      </div>
    </div>
  )
}
