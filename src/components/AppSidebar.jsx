import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Building2,
  ChevronDown,
  Clock3,
  FileText,
  Home,
  ListChecks,
  Menu,
  Plane,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useAuthStore } from '../store/useAuth'
import { cn } from '../lib/utils'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { UserProfileDropdown } from './UserProfileDropdown'

const NAV_ITEMS = [
  {
    id: 'clock',
    labelKey: 'sidebar.items.clock',
    icon: Clock3,
    page: 'timeClock',
    path: '/time-clock',
    group: 'workspace',
    requires: { public: true },
  },
  {
    id: 'dashboard',
    labelKey: 'sidebar.items.dashboard',
    icon: Home,
    page: 'dashboard',
    path: '/dashboard',
    group: 'workspace',
    badgeKey: 'dashboardPage.badges.today',
    requires: { public: true },
  },
  {
    id: 'history',
    labelKey: 'sidebar.items.history',
    icon: ListChecks,
    page: 'history',
    path: '/history',
    group: 'workspace',
    requires: { public: true },
  },
  {
    id: 'documents',
    labelKey: 'sidebar.items.documents',
    icon: FileText,
    page: 'documents',
    path: '/documents',
    group: 'workspace',
    requires: { public: true },
  },
  {
    id: 'announcements',
    labelKey: 'sidebar.items.announcements',
    icon: Bell,
    page: 'announcements',
    path: '/announcements',
    group: 'workspace',
    requires: { anyOf: ['employee'] },
  },
  {
    id: 'vacations',
    labelKey: 'dashboardPage.timeOff.title',
    icon: Plane,
    page: 'vacations',
    path: '/vacations',
    group: 'workspace',
    requires: { anyOf: ['employee'] },
  },
  {
    id: 'adminVacations',
    labelKey: 'dashboardPage.timeOff.title',
    icon: Plane,
    page: 'adminVacations',
    path: '/admin/vacations',
    group: 'admin',
    requires: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  {

    id: 'adminAnnouncements',
    labelKey: 'sidebar.items.announcements',
    icon: Bell,
    page: 'adminAnnouncements',
    path: '/admin/announcements',
    group: 'admin',
    requires: { anyOf: ['area_manager', 'admin', 'super_admin'] },

  },
  {
    id: 'platformCompanies',
    labelKey: 'sidebar.items.platformCompanies',
    icon: Building2,
    page: 'platformCompanies',
    path: '/platform/companies',
    group: 'admin',
    requires: { anyOf: ['super_admin'] },
  },
  {
    id: 'team',
    labelKey: 'sidebar.items.team',
    icon: Users,
    page: 'equipo',
    path: '/equipo',
    group: 'admin',
    requires: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  {
    id: 'settings',
    labelKey: 'sidebar.items.settings',
    icon: Settings,
    path: '/settings',
    group: 'admin',
    requires: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
]

const WORKSPACE_STORAGE_KEY = 'sidebar_group_workspace_open'
const ADMIN_STORAGE_KEY = 'sidebar_group_admin_open'

const readStoredGroupState = (key, defaultOpen) => {
  if (typeof window === 'undefined') return defaultOpen
  const stored = window.localStorage.getItem(key)
  if (stored === '1') return true
  if (stored === '0') return false
  return defaultOpen
}

export function AppSidebar({
  sidebarOpen = true,
  currentPage,
  onNavigate,
  onProfile,
  onHelp,
  onLogout,
  onToggle = () => {},
}) {
  const roles = useAuthStore((state) => state.roles)
  const user = useAuthStore((state) => state.user)
  const { t } = useTranslation()
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const [workspaceOpen, setWorkspaceOpen] = useState(() =>
    readStoredGroupState(WORKSPACE_STORAGE_KEY, true),
  )
  const [adminOpen, setAdminOpen] = useState(() => readStoredGroupState(ADMIN_STORAGE_KEY, true))
  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => canRenderCard(capabilities, item.requires)),
    [capabilities],
  )
  const workspaceItems = visibleNavItems.filter((item) => item.group === 'workspace')
  const adminItems = visibleNavItems.filter((item) => item.group === 'admin')

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick()
    } else if (item.page && onNavigate) {
      onNavigate(item.page)
    }

  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceOpen ? '1' : '0')
  }, [workspaceOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ADMIN_STORAGE_KEY, adminOpen ? '1' : '0')
  }, [adminOpen])

  return (
    <>
      <button
        type="button"
        aria-label={t('dashboardPage.header.toggleMenu')}
        onClick={onToggle}
        className={cn(
          'fixed right-4 top-4 z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80 sm:right-6 sm:top-6 md:right-auto',
          sidebarOpen
            ? 'md:left-[calc(16rem+max(2rem,calc((100vw-16rem-1320px)/2+2rem)))]'
            : 'md:left-[max(2rem,calc((100vw-1320px)/2+2rem))]',
        )}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/70 bg-[#f7f7f9] px-5 py-6 text-foreground shadow-[0_24px_70px_-42px_rgba(62,82,152,0.35)] backdrop-blur-xl transition-transform duration-300 dark:bg-card/95 md:bg-card/95',
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
        <nav className="flex-1 space-y-5 overflow-y-auto pr-1 text-[12px] lg:text-[13px]">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setWorkspaceOpen((prev) => !prev)}
              aria-expanded={workspaceOpen}
              aria-controls="sidebar-group-workspace"
              className="flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground/80"
            >
              <span>{t('sidebar.sections.workspace')}</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  workspaceOpen ? 'rotate-0' : '-rotate-90',
                )}
              />
            </button>
            <div
              id="sidebar-group-workspace"
              aria-hidden={!workspaceOpen}
              className={cn(
                'overflow-hidden transition-[max-height,opacity] duration-200',
                workspaceOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0',
              )}
            >
              <div className="space-y-1 pt-1">
                {workspaceItems.map((item) => {
                  const Icon = item.icon
                  const isActive = item.page ? currentPage === item.page : item.active
                  const isCta = item.variant === 'cta'
                  const badgeLabel = item.badgeKey ? t(item.badgeKey) : item.badge
                  return (
                    <button
                      key={item.id}
                      className={cn(
                        'group flex w-full min-h-[36px] items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition-colors',
                        isCta
                          ? 'bg-primary text-primary-foreground font-semibold shadow-[0_16px_40px_-26px_rgba(62,82,152,0.6)] hover:bg-primary/90'
                          : isActive
                            ? 'bg-primary/15 text-primary font-semibold'
                            : 'text-foreground/80 hover:bg-muted/80 hover:text-foreground',
                      )}
                      onClick={() => handleItemClick(item)}
                      type="button"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg border transition-colors',
                            isCta
                              ? 'border-white/20 bg-white/15 text-primary-foreground'
                              : isActive
                                ? 'border-primary/20 bg-primary/10 text-primary'
                                : 'border-border bg-muted text-foreground',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>{t(item.labelKey)}</span>
                      </div>
                      {badgeLabel ? (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] lg:text-[11px]',
                            isCta
                              ? 'border border-white/20 bg-white/15 text-primary-foreground'
                              : 'border border-primary/20 bg-primary/15 text-primary',
                          )}
                        >
                          {badgeLabel}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {adminItems.length > 0 ? (
            <div className="space-y-2">
              <div className="mx-2 h-px bg-border/60" />
              <button
                type="button"
                onClick={() => setAdminOpen((prev) => !prev)}
                aria-expanded={adminOpen}
                aria-controls="sidebar-group-admin"
                className="flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground/80"
              >
                <span>{t('sidebar.sections.admin')}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    adminOpen ? 'rotate-0' : '-rotate-90',
                  )}
                />
              </button>
              <div
                id="sidebar-group-admin"
                aria-hidden={!adminOpen}
                className={cn(
                  'overflow-hidden transition-[max-height,opacity] duration-200',
                  adminOpen ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0',
                )}
              >
                <div className="space-y-1 pt-1">
                  {adminItems.map((item) => {
                    const Icon = item.icon
                    const isActive = item.page ? currentPage === item.page : item.active
                    return (
                      <button
                        key={item.id}
                        className={cn(
                          'group flex w-full min-h-[36px] items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition-colors',
                          isActive
                            ? 'bg-primary/15 text-primary font-semibold'
                            : 'text-foreground/80 hover:bg-muted/80 hover:text-foreground',
                        )}
                        onClick={() => handleItemClick(item)}
                        type="button"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg border transition-colors',
                              isActive
                                ? 'border-primary/20 bg-primary/10 text-primary'
                                : 'border-border bg-muted text-foreground',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>{t(item.labelKey)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </nav>
      </div>

      <div className="mt-auto w-full space-y-3">
        <div className="flex w-full items-center gap-2">
          <LanguageSwitcher iconOnly />
          <ThemeToggle iconOnly />
        </div>
        <UserProfileDropdown user={user} onProfile={onProfile} onHelp={onHelp} onLogout={onLogout} />
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/70 px-3 py-2 text-[10px] lg:text-[11px] text-muted-foreground">
          <span>{t('dashboardPage.version.label')}</span>
          <span>{t('dashboardPage.version.product')}</span>
        </div>
      </div>
      </aside>
    </>
  )
}
