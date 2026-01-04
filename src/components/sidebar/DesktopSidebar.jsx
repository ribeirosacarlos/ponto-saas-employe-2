import { useTranslation } from 'react-i18next'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '../../lib/utils'
import { SidebarNavContent } from './SidebarNavContent'
import { UserProfileDropdown } from '../UserProfileDropdown'

const SidebarBrand = ({ collapsed }) => (
  <div
    className={cn(
      'flex items-center gap-2 select-none pointer-events-none transition-opacity duration-150',
      collapsed ? 'group-hover:opacity-0' : '',
    )}
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-xs font-semibold tracking-tight text-primary-foreground shadow-inner shadow-primary/35">
      HR
    </div>
    <div className={cn('flex flex-col leading-tight', collapsed ? 'hidden' : 'flex')}>
      <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
        Synergy
      </span>
      <span className="text-[10px] text-muted-foreground">HR Management</span>
    </div>
  </div>
)

export function DesktopSidebar({
  open = true,
  collapsed = false,
  navItems = [],
  currentPage,
  onNavigate,
  user,
  onProfile,
  onHelp,
  onLogout,
  onToggleCollapse = () => {},
  className,
}) {
  const { t } = useTranslation()
  const collapseLabel = collapsed
    ? t('sidebar.actions.expand', { defaultValue: 'Expand sidebar' })
    : t('sidebar.actions.collapse', { defaultValue: 'Collapse sidebar' })

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/70 bg-card/95 py-5 text-foreground shadow-xl shadow-black/5 backdrop-blur-xl transition-all duration-300 dark:bg-card',
        collapsed ? 'w-20 px-2 md:w-16 md:px-2' : 'w-64 px-4 md:w-64 md:px-4',
        open ? 'translate-x-0 md:translate-x-0' : '-translate-x-full md:-translate-x-full',
        className,
      )}
    >
      <div
        className={cn(
          'group relative flex items-center px-1 pt-1 pb-3',
          collapsed ? 'justify-center gap-1' : 'justify-between gap-2.5',
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <button
          type="button"
          aria-label={collapseLabel}
          onClick={onToggleCollapse}
          className={cn(
            'absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-foreground transition hover:bg-muted',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            collapsed ? 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto' : '',
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-3 flex flex-1 flex-col overflow-hidden">
        <SidebarNavContent
          items={navItems}
          currentPage={currentPage}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </div>

      <div className="mt-auto w-full">
        <UserProfileDropdown
          user={user}
          onProfile={onProfile}
          onHelp={onHelp}
          onLogout={onLogout}
          collapsed={collapsed}
        />
      </div>
    </aside>
  )
}
