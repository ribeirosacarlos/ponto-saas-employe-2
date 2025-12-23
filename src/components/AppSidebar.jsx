import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock3, FileText, Home, ListChecks, Settings, Users } from 'lucide-react'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useAuthStore } from '../store/useAuth'
import { cn } from '../lib/utils'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { UserProfileDropdown } from './UserProfileDropdown'

export function AppSidebar({
  sidebarOpen = true,
  currentPage,
  onNavigate,
  onClose,
  onProfile,
  onHelp,
  onLogout,
}) {
  const roles = useAuthStore((state) => state.roles)
  const user = useAuthStore((state) => state.user)
  const { t } = useTranslation()
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])

  const navItems = [
    {
      label: t('dashboardPage.nav.dashboard'),
      icon: Home,
      page: 'dashboard',
      badge: t('dashboardPage.badges.today'),
      requires: { anyOf: ['employee'] },
    },
    {
      label: t('dashboardPage.nav.history'),
      icon: ListChecks,
      page: 'history',
      requires: { anyOf: ['employee'] },
    },
    {
      label: t('dashboardPage.nav.documents'),
      icon: FileText,
      page: 'documents',
      requires: { anyOf: ['employee'] },
    },
    { label: t('dashboardPage.nav.calendar'), icon: CalendarDays, requires: { anyOf: ['employee'] } },
    {
      label: t('dashboardPage.nav.registerPoint'),
      icon: Clock3,
      page: 'timeClock',
      requires: { anyOf: ['employee'] },
    },
    { label: t('dashboardPage.nav.projects'), icon: ListChecks, requires: { anyOf: ['area_manager'] } },
    {
<<<<<<< HEAD
      label: t('dashboardPage.nav.equipo'),
      icon: Users,
      page: 'equipo',
      requires: { anyOf: ['admin'] },
=======
      label: t('dashboardPage.nav.team'),
      icon: Users,
      page: 'employees',
      requires: { anyOf: ['area_manager'] }
>>>>>>> origin/main
    },
    { label: t('dashboardPage.nav.settings'), icon: Settings, requires: { anyOf: ['admin'] } },
  ]

  const visibleNavItems = navItems.filter((item) => canRenderCard(capabilities, item.requires))

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick()
    } else if (item.page && onNavigate) {
      onNavigate(item.page)
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose?.()
    }
  }

  return (
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
          {visibleNavItems.map((item) => {
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
                onClick={() => handleItemClick(item)}
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
  )
}
