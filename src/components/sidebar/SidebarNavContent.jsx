import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const WORKSPACE_STORAGE_KEY = 'sidebar_group_workspace_open'
const ADMIN_STORAGE_KEY = 'sidebar_group_admin_open'
const SUPER_ADMIN_STORAGE_KEY = 'sidebar_group_super_admin_open'

const readStoredGroupState = (key, defaultOpen) => {
  if (typeof window === 'undefined') return defaultOpen
  const stored = window.localStorage.getItem(key)
  if (stored === '1') return true
  if (stored === '0') return false
  return defaultOpen
}

const SidebarTooltip = ({ label, children, collapsed, offset = 'translate-x-2' }) => {
  if (!collapsed) return children

  return (
    <div className="group relative">
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-full top-1/2 z-40 -translate-y-1/2 opacity-0 transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
          offset,
        )}
      >
        <div className="rounded-full border border-border/80 bg-card px-3 py-1 text-[12px] text-foreground shadow-md">
          {label}
        </div>
      </div>
    </div>
  )
}

export function SidebarNavContent({
  items = [],
  currentPage,
  collapsed = false,
  onNavigate,
  onItemSelect,
}) {
  const { t } = useTranslation()
  const [workspaceOpen, setWorkspaceOpen] = useState(() =>
    readStoredGroupState(WORKSPACE_STORAGE_KEY, true),
  )
  const [adminOpen, setAdminOpen] = useState(() => readStoredGroupState(ADMIN_STORAGE_KEY, true))
  const [superAdminOpen, setSuperAdminOpen] = useState(() =>
    readStoredGroupState(SUPER_ADMIN_STORAGE_KEY, true),
  )

  const workspaceExpanded = collapsed ? true : workspaceOpen
  const adminExpanded = collapsed ? true : adminOpen
  const superAdminExpanded = collapsed ? true : superAdminOpen

  const workspaceItems = useMemo(
    () => items.filter((item) => item.group === 'workspace'),
    [items],
  )
  const adminItems = useMemo(() => items.filter((item) => item.group === 'admin'), [items])
  const superAdminItems = useMemo(
    () => items.filter((item) => item.group === 'superAdmin'),
    [items],
  )

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick()
    } else if (item.page && onNavigate) {
      onNavigate(item.page)
    }
    onItemSelect?.(item)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceOpen ? '1' : '0')
  }, [workspaceOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ADMIN_STORAGE_KEY, adminOpen ? '1' : '0')
  }, [adminOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, superAdminOpen ? '1' : '0')
  }, [superAdminOpen])

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto pr-1 text-[12px] lg:text-[13px]">
      {workspaceItems.length > 0 ? (
        <div className="space-y-2">
          {collapsed ? (
            <div className="mx-2 h-px bg-border/60" aria-hidden="true" />
          ) : (
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
          )}
          <div
            id="sidebar-group-workspace"
            aria-hidden={!workspaceExpanded}
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-200',
              workspaceExpanded ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <div className="space-y-1 pt-1">
              {workspaceItems.map((item) => {
                const Icon = item.icon
                const isActive = item.page ? currentPage === item.page : item.active
                const isCta = item.variant === 'cta'
                const badgeLabel = item.badgeKey ? t(item.badgeKey) : item.badge
                return (
                  <SidebarTooltip key={item.id} label={t(item.labelKey)} collapsed={collapsed}>
                    <button
                      aria-label={t(item.labelKey)}
                      className={cn(
                        'group flex w-full min-h-[34px] items-center rounded-full py-2 text-left transition-colors duration-150',
                        collapsed ? 'justify-center px-2' : 'justify-between px-3',
                        isCta
                          ? 'bg-primary text-primary-foreground font-semibold shadow-[0_18px_45px_-30px_rgba(62,82,152,0.7)] hover:bg-primary/90'
                          : isActive
                            ? 'bg-primary/12 text-primary font-semibold'
                            : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground',
                      )}
                      onClick={() => handleItemClick(item)}
                      type="button"
                    >
                      <div className={cn('flex items-center gap-1.5', collapsed && 'justify-center')}>
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isCta
                              ? 'text-primary-foreground'
                              : isActive
                                ? 'text-primary'
                                : 'text-foreground/70 group-hover:text-foreground',
                          )}
                        />
                        <span className={cn(collapsed ? 'sr-only' : '')}>{t(item.labelKey)}</span>
                      </div>
                      {!collapsed && badgeLabel ? (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] lg:text-[11px] transition-colors',
                            isCta
                              ? 'border border-white/20 bg-white/15 text-primary-foreground'
                              : 'border border-primary/20 bg-primary/15 text-primary',
                          )}
                        >
                          {badgeLabel}
                        </span>
                      ) : null}
                    </button>
                  </SidebarTooltip>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {adminItems.length > 0 ? (
        <div className="space-y-2">
          <div className="mx-2 h-px bg-border/60" />
          {collapsed ? null : (
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
          )}
          <div
            id="sidebar-group-admin"
            aria-hidden={!adminExpanded}
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-200',
              adminExpanded ? 'max-h-[999px] opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <div className="space-y-1 pt-1">
              {adminItems.map((item) => {
                const Icon = item.icon
                const isActive = item.page ? currentPage === item.page : item.active
                return (
                  <SidebarTooltip key={item.id} label={t(item.labelKey)} collapsed={collapsed}>
                    <button
                      aria-label={t(item.labelKey)}
                      className={cn(
                        'group flex w-full min-h-[34px] items-center rounded-full py-2 text-left transition-colors duration-150',
                        collapsed ? 'justify-center px-2' : 'justify-between px-3',
                        isActive
                          ? 'bg-primary/12 text-primary font-semibold'
                          : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground',
                      )}
                      onClick={() => handleItemClick(item)}
                      type="button"
                    >
                      <div className={cn('flex items-center gap-1.5', collapsed && 'justify-center')}>
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive ? 'text-primary' : 'text-foreground/70 group-hover:text-foreground',
                          )}
                        />
                        <span className={cn(collapsed ? 'sr-only' : '')}>{t(item.labelKey)}</span>
                      </div>
                    </button>
                  </SidebarTooltip>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {superAdminItems.length > 0 ? (
        <div className="space-y-2">
          <div className="mx-2 h-px bg-border/60" />
          {collapsed ? null : (
            <button
              type="button"
              onClick={() => setSuperAdminOpen((prev) => !prev)}
              aria-expanded={superAdminOpen}
              aria-controls="sidebar-group-super-admin"
              className="flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground/80"
            >
              <span>{t('sidebar.sections.superAdmin')}</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  superAdminOpen ? 'rotate-0' : '-rotate-90',
                )}
              />
            </button>
          )}
          <div
            id="sidebar-group-super-admin"
            aria-hidden={!superAdminExpanded}
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-200',
              superAdminExpanded ? 'max-h-[999px] opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <div className="space-y-1 pt-1">
              {superAdminItems.map((item) => {
                const Icon = item.icon
                const isActive = item.page ? currentPage === item.page : item.active
                return (
                  <SidebarTooltip key={item.id} label={t(item.labelKey)} collapsed={collapsed}>
                    <button
                      aria-label={t(item.labelKey)}
                      className={cn(
                        'group flex w-full min-h-[34px] items-center rounded-full py-2 text-left transition-colors duration-150',
                        collapsed ? 'justify-center px-2' : 'justify-between px-3',
                        isActive
                          ? 'bg-primary/12 text-primary font-semibold'
                          : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground',
                      )}
                      onClick={() => handleItemClick(item)}
                      type="button"
                    >
                      <div className={cn('flex items-center gap-1.5', collapsed && 'justify-center')}>
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive ? 'text-primary' : 'text-foreground/70 group-hover:text-foreground',
                          )}
                        />
                        <span className={cn(collapsed ? 'sr-only' : '')}>{t(item.labelKey)}</span>
                      </div>
                    </button>
                  </SidebarTooltip>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
