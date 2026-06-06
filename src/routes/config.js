export const ROUTES = {
  login: { path: '/', isPublic: true },
  activateAccount: { path: '/activate-account', isPublic: true },
  resetPassword: { path: '/reset-password', isPublic: true },
  forgotPassword: { path: '/forgot-password', isPublic: true },
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
  adminAreas: {
    path: '/admin/areas',
    guard: { anyOf: ['admin', 'super_admin'] },
  },
  adminDocuments: {
    path: '/admin/documents',
    guard: { anyOf: ['manager', 'area_manager', 'admin', 'super_admin'] },
  },
  adminHolidays: {
    path: '/admin/holidays',
    guard: { anyOf: ['manager', 'area_manager', 'admin', 'super_admin'] },
  },
  adminCompanyTimezone: {
    path: '/admin/company/timezone',
    guard: { anyOf: ['admin', 'super_admin'] },
  },
  adminAdjustments: {
    path: '/admin/adjustments',
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  employeeAdjustments: {
    path: '/employee/adjustments',
    guard: { anyOf: ['employee'] },
  },
  employeeTimesheets: {
    path: '/employee/timesheets',
    guard: { anyOf: ['employee'] },
  },
  adminAnnouncements: {
    path: '/admin/announcements',
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  auditLogs: {
    path: '/audit-logs',
    guard: { anyOf: ['admin', 'super_admin'] },
  },
  closeTimesheet: {
    path: '/area-manager/payroll-close',
    aliases: ['/area-manager/close-timesheet'],
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  adminMonthlyClosures: {
    path: '/admin/monthly-closures',
    guard: { anyOf: ['area_manager', 'admin', 'super_admin'] },
  },
  settings: {
    path: '/settings',
  },
  platformBillingPlans: {
    path: '/platform/billing/plans',
    guard: { anyOf: ['super_admin'] },
  },
  platformCompanies: {
    path: '/platform/companies',
    guard: { anyOf: ['super_admin'] },
  },
  superAdminDashboard: {
    path: '/super-admin/dashboard',
    guard: { anyOf: ['super_admin'] },
  },
  superAdminCompanies: {
    path: '/super-admin/companies',
    guard: { anyOf: ['super_admin'] },
  },
  superAdminBlog: {
    path: '/super-admin/blog',
    guard: { anyOf: ['super_admin'] },
  },
  superAdminCompanyDetails: {
    path: '/super-admin/companies/:id',
    guard: { anyOf: ['super_admin'] },
  },
  announcements: {
    path: '/announcements',
    guard: { anyOf: ['employee'] },
  },
  equipo: { path: '/equipo', guard: { anyOf: ['area_manager'] } },
}

const ROUTE_ENTRIES = Object.entries(ROUTES)
const ROUTE_PARAM_MATCHERS = new Map()

export const PAGE_PATHS = Object.fromEntries(ROUTE_ENTRIES.map(([key, route]) => [key, route.path]))

const normalizePath = (path) => path.replace(/\/+$/, '') || '/'

const compilePathPattern = (pattern) => {
  const normalized = normalizePath(pattern)
  const segments = normalized.split('/').filter(Boolean)
  const paramNames = []
  const regexParts = segments.map((segment) => {
    if (segment.startsWith(':')) {
      paramNames.push(segment.slice(1))
      return '([^/]+)'
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  })

  const regex = new RegExp(`^/${regexParts.join('/')}$`)
  return { regex, paramNames }
}

const getRouteMatcher = (pattern) => {
  if (!ROUTE_PARAM_MATCHERS.has(pattern)) {
    ROUTE_PARAM_MATCHERS.set(pattern, compilePathPattern(pattern))
  }

  return ROUTE_PARAM_MATCHERS.get(pattern)
}

export const resolvePageFromPath = (path) => {
  if (!path) return 'login'
  const normalized = normalizePath(path)
  const matchedRoute = ROUTE_ENTRIES.find(([, route]) => {
    const candidates = [route.path, ...(route.aliases ?? [])]
    return candidates.some((candidate) => {
      if (!candidate.includes(':')) return candidate === normalized
      return getRouteMatcher(candidate).regex.test(normalized)
    })
  })
  return matchedRoute?.[0] ?? 'login'
}

export const getRouteParams = (page, path) => {
  if (!page || !path || !ROUTES[page]) return {}
  const normalized = normalizePath(path)
  const candidates = [ROUTES[page].path, ...(ROUTES[page].aliases ?? [])]

  for (const candidate of candidates) {
    if (!candidate.includes(':')) continue
    const { regex, paramNames } = getRouteMatcher(candidate)
    const match = normalized.match(regex)
    if (!match) continue

    return paramNames.reduce((acc, paramName, index) => {
      acc[paramName] = decodeURIComponent(match[index + 1] || '')
      return acc
    }, {})
  }

  return {}
}
