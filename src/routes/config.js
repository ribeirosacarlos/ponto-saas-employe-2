export const ROUTES = {
  login: { path: '/', isPublic: true },
  activateAccount: { path: '/activate-account', isPublic: true },
  companyMissing: { path: '/company/missing' },
  subscribe: { path: '/billing/subscribe' },
  forbidden: { path: '/forbidden' },
  timeClock: { path: '/time-clock' },
  dashboard: { path: '/dashboard' },
  history: { path: '/history', aliases: ['/time-entries'] },
  documents: { path: '/documents' },
  vacations: { path: '/vacations', guard: { anyOf: ['employee'] } },
  adminVacations: {
    path: '/admin/vacations',
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  adminShifts: {
    path: '/admin/shifts',
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  adminAdjustments: {
    path: '/admin/adjustments',
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  adminAnnouncements: {
    path: '/admin/announcements',
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  closeTimesheet: {
    path: '/area-manager/payroll-close',
    aliases: ['/area-manager/close-timesheet'],
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  settings: {
    path: '/settings',
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  platformBillingPlans: {
    path: '/platform/billing/plans',
    guard: { anyOf: ['super_admin'] },
  },
  platformCompanies: {
    path: '/platform/companies',
    guard: { anyOf: ['super_admin'] },
  },
  announcements: {
    path: '/announcements',
    guard: { anyOf: ['employee'] },
  },
  equipo: { path: '/equipo', guard: { anyOf: ['area_manager'] } },
}

const ROUTE_ENTRIES = Object.entries(ROUTES)

export const PAGE_PATHS = Object.fromEntries(ROUTE_ENTRIES.map(([key, route]) => [key, route.path]))

export const resolvePageFromPath = (path) => {
  if (!path) return 'login'
  const normalized = path.replace(/\/+$/, '') || '/'
  const matchedRoute = ROUTE_ENTRIES.find(([, route]) => {
    const candidates = [route.path, ...(route.aliases ?? [])]
    return candidates.includes(normalized)
  })
  return matchedRoute?.[0] ?? 'login'
}
