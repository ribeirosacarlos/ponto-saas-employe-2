import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, CircleHelp, Clock3, FileText, ListChecks, Users } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { BrandSignature } from '@/components/BrandSignature'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/config'

// ─── nav group config ──────────────────────────────────────────────────────

const NAV_GROUP_ORDER = ['workspace', 'admin', 'commercial', 'affiliate', 'superAdmin']
const NAV_GROUP_LABEL_KEYS = {
  workspace: 'sidebar.sections.workspace',
  admin: 'sidebar.sections.admin',
  commercial: 'sidebar.sections.commercial',
  affiliate: 'sidebar.sections.affiliate',
  superAdmin: 'sidebar.sections.superAdmin',
}

// ─── sub-group definitions ─────────────────────────────────────────────────

const ADMIN_SUB_GROUPS = [
  {
    key: 'pointManagement',
    labelKey: 'sidebar.groups.pointManagement',
    storageKey: 'sidebar:sg:admin:pointManagement',
    Icon: Clock3,
    itemIds: new Set(['adminAdjustments', 'adminShifts', 'closeTimesheet', 'adminMonthlyClosures', 'adminHolidays']),
  },
  {
    key: 'teamGroup',
    labelKey: 'sidebar.groups.team',
    storageKey: 'sidebar:sg:admin:team',
    Icon: Users,
    itemIds: new Set(['team', 'adminAreas']),
  },
  {
    key: 'content',
    labelKey: 'sidebar.groups.content',
    storageKey: 'sidebar:sg:admin:content',
    Icon: FileText,
    itemIds: new Set(['adminDocuments', 'adminAnnouncements']),
  },
]

const WORKSPACE_SUB_GROUPS = [
  {
    key: 'records',
    labelKey: 'sidebar.groups.myRecords',
    storageKey: 'sidebar:sg:workspace:records',
    Icon: ListChecks,
    itemIds: new Set(['history', 'employeeAdjustments', 'employeeTimesheets']),
  },
  {
    key: 'content',
    labelKey: 'sidebar.groups.content',
    storageKey: 'sidebar:sg:workspace:content',
    Icon: FileText,
    itemIds: new Set(['documents', 'announcements', 'vacations']),
  },
]

const NAV_GROUP_CONFIG = {
  admin: {
    subGroups: ADMIN_SUB_GROUPS,
    beforeSubGroupIds: ['adminVacations'],
  },
  workspace: {
    subGroups: WORKSPACE_SUB_GROUPS,
    beforeSubGroupIds: ['clock', 'dashboard'],
  },
}

// ─── localStorage hook ─────────────────────────────────────────────────────

function useCollapsibleState(storageKey) {
  const [open, setOpen] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored !== null) return stored === 'true'
    } catch {}
    return true // default: open
  })

  const handleChange = useCallback(
    (value) => {
      setOpen(value)
      try {
        window.localStorage.setItem(storageKey, String(value))
      } catch {}
    },
    [storageKey],
  )

  return [open, handleChange]
}

// ─── sub-components ────────────────────────────────────────────────────────

function SidebarBrand() {
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'
  return (
    <div className={cn('flex items-center gap-2 px-2 py-1', collapsed ? 'justify-center' : '')}>
      <BrandSignature collapsed={collapsed} />
    </div>
  )
}

function FlatNavItem({ item, currentPage, onNavigate, t }) {
  const Icon = item.icon
  const isActive = item.page ? currentPage === item.page : item.active
  const isCta = item.variant === 'cta'
  const badgeLabel = item.badge
  const href = (item.page && ROUTES[item.page]?.path) || item.path

  const handleClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (item.onClick) item.onClick()
    else if (item.page && onNavigate) onNavigate(item.page)
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={t(item.labelKey)}
        className={cn(
          isCta &&
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90',
        )}
      >
        <a href={href || '#'} onClick={handleClick}>
          <Icon />
          <span>{t(item.labelKey)}</span>
        </a>
      </SidebarMenuButton>
      {badgeLabel ? <SidebarMenuBadge>{badgeLabel}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  )
}

function CollapsibleNavSubGroup({ subGroup, items, currentPage, onNavigate, t }) {
  const [open, setOpen] = useCollapsibleState(subGroup.storageKey)
  const { Icon } = subGroup

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible w-full">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={t(subGroup.labelKey)}>
            <Icon />
            <span>{t(subGroup.labelKey)}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((item) => {
              const ItemIcon = item.icon
              const isActive = item.page ? currentPage === item.page : item.active
              const subHref = (item.page && ROUTES[item.page]?.path) || item.path
              return (
                <SidebarMenuSubItem key={item.id}>
                  <SidebarMenuSubButton
                    isActive={isActive}
                    href={subHref || '#'}
                    onClick={(e) => {
                      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                      e.preventDefault()
                      if (item.onClick) item.onClick()
                      else if (item.page && onNavigate) onNavigate(item.page)
                    }}
                  >
                    <ItemIcon />
                    <span>{t(item.labelKey)}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

// Renders a nav group that has collapsible sub-groups.
// When the sidebar is collapsed (icon mode), sub-groups are flattened to flat
// icon buttons with tooltips so the user can still navigate.
function GroupItemsWithSubGroups({ items, subGroups, beforeSubGroupIds, currentPage, onNavigate, t }) {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const itemById = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  )

  const renderUnits = useMemo(() => {
    const units = []
    const usedIds = new Set()

    beforeSubGroupIds.forEach((id) => {
      const item = itemById[id]
      if (item) {
        units.push({ type: 'flat', item })
        usedIds.add(id)
      }
    })

    subGroups.forEach((sg) => {
      const visibleItems = [...sg.itemIds].map((id) => itemById[id]).filter(Boolean)
      if (visibleItems.length > 0) {
        units.push({ type: 'subGroup', subGroup: sg, items: visibleItems })
        visibleItems.forEach((item) => usedIds.add(item.id))
      }
    })

    items.forEach((item) => {
      if (!usedIds.has(item.id)) {
        units.push({ type: 'flat', item })
      }
    })

    return units
  }, [items, itemById, subGroups, beforeSubGroupIds])

  return renderUnits.flatMap((unit) => {
    if (unit.type === 'flat') {
      return [
        <FlatNavItem
          key={unit.item.id}
          item={unit.item}
          currentPage={currentPage}
          onNavigate={onNavigate}
          t={t}
        />,
      ]
    }

    // In collapsed (icon) mode: flatten sub-group items so they are reachable
    if (isCollapsed) {
      return unit.items.map((item) => (
        <FlatNavItem
          key={item.id}
          item={item}
          currentPage={currentPage}
          onNavigate={onNavigate}
          t={t}
        />
      ))
    }

    return [
      <CollapsibleNavSubGroup
        key={unit.subGroup.key}
        subGroup={unit.subGroup}
        items={unit.items}
        currentPage={currentPage}
        onNavigate={onNavigate}
        t={t}
      />,
    ]
  })
}

// ─── main export ───────────────────────────────────────────────────────────

export function EfferdSidebar({
  navItems = [],
  currentPage,
  onNavigate,
  user,
  onProfile,
  onHelp,
  onLogout,
}) {
  const { t } = useTranslation()

  const bottomItems = useMemo(
    () => navItems.filter((item) => item.group === 'bottom'),
    [navItems],
  )

  const navGroups = useMemo(() => {
    const grouped = {}
    navItems.forEach((item) => {
      const g = item.group || 'workspace'
      if (g === 'bottom') return
      if (!grouped[g]) grouped[g] = []
      grouped[g].push(item)
    })

    return NAV_GROUP_ORDER.filter((g) => grouped[g]?.length > 0).map((g) => ({
      key: g,
      label: t(NAV_GROUP_LABEL_KEYS[g] || g),
      items: grouped[g],
    }))
  }, [navItems, t])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          const config = NAV_GROUP_CONFIG[group.key]
          return (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {config ? (
                  <GroupItemsWithSubGroups
                    items={group.items}
                    subGroups={config.subGroups}
                    beforeSubGroupIds={config.beforeSubGroupIds}
                    currentPage={currentPage}
                    onNavigate={onNavigate}
                    t={t}
                  />
                ) : (
                  group.items.map((item) => (
                    <FlatNavItem
                      key={item.id}
                      item={item}
                      currentPage={currentPage}
                      onNavigate={onNavigate}
                      t={t}
                    />
                  ))
                )}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {bottomItems.map((item) => (
            <FlatNavItem
              key={item.id}
              item={item}
              currentPage={currentPage}
              onNavigate={onNavigate}
              t={t}
            />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t('sidebar.helpCenter', { defaultValue: 'Central de ajuda' })}
              onClick={onHelp}
            >
              <CircleHelp />
              <span>{t('sidebar.helpCenter', { defaultValue: 'Central de ajuda' })}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
