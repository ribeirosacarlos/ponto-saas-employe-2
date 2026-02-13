import { AnnouncementsCard } from '../components/AnnouncementsCard'
import { EmployeeDocumentsCard } from '../components/EmployeeDocumentsCard'
import { TimeOffCard } from '../components/TimeOffCard'
import { TimeTrackingCard } from '../components/dashboard/TimeTrackingCard'

// Raw source loader so we can extract endpoints directly from the codebase.
const RAW_SOURCES = import.meta.glob('../**/*.{js,jsx,ts,tsx}', { as: 'raw', eager: true })

function findSourceKey(endsWith) {
  return Object.keys(RAW_SOURCES).find((key) => key.endsWith(endsWith))
}

function resolveRelativePath(from, relative) {
  const fromParts = from.split('/').slice(0, -1)
  const relParts = relative.split('/')

  relParts.forEach((part) => {
    if (part === '..') {
      fromParts.pop()
    } else if (part !== '.') {
      fromParts.push(part)
    }
  })

  return fromParts.join('/')
}

function maybeResolveKey(basePath) {
  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}/index.js`,
    `${basePath}/index.jsx`,
    `${basePath}/index.ts`,
    `${basePath}/index.tsx`,
  ]

  return candidates.find((candidate) => Object.prototype.hasOwnProperty.call(RAW_SOURCES, candidate))
}

function collectDependencies(entryKey, seen = new Set()) {
  if (!entryKey || seen.has(entryKey)) return []
  seen.add(entryKey)

  const source = RAW_SOURCES[entryKey]
  if (!source) return []

  const matches = Array.from(source.matchAll(/from\s+['"](.+?)['"]/g))
  const relatives = matches.map((match) => match[1]).filter((p) => p.startsWith('.'))

  const deps = []
  relatives.forEach((relPath) => {
    const resolvedBase = resolveRelativePath(entryKey, relPath)
    const resolvedKey = maybeResolveKey(resolvedBase)
    if (resolvedKey && !seen.has(resolvedKey)) {
      deps.push(resolvedKey, ...collectDependencies(resolvedKey, seen))
    }
  })

  return deps
}

function extractApiMap(apiSource) {
  if (!apiSource) return {}

  const map = {}
  const regex =
    /export\s+async\s+function\s+(\w+)[\s\S]*?api\.(get|post|put|delete|patch)\s*\(\s*['"`](\/v1\/[^'"`]+)['"`]/g
  let match

  while ((match = regex.exec(apiSource))) {
    const [, fnName, , endpoint] = match
    if (!map[fnName]) map[fnName] = []
    map[fnName].push(endpoint)
  }

  return map
}

const apiSourceKeys = [
  'services/modules/employee.js',
  'services/modules/employees.js',
  'services/modules/shifts.js',
  'services/modules/auth.js',
]
  .map((hint) => findSourceKey(hint))
  .filter(Boolean)

const API_ENDPOINT_MAP = apiSourceKeys.reduce((acc, key) => {
  const map = extractApiMap(RAW_SOURCES[key])
  Object.entries(map).forEach(([fnName, endpoints]) => {
    acc[fnName] = [...(acc[fnName] || []), ...endpoints]
  })
  return acc
}, {})

function inferEndpointsFromSources(sourceKeys) {
  const combinedAll = sourceKeys.map((key) => RAW_SOURCES[key] || '').join('\n')
  const combinedNonApi = sourceKeys
    .filter((key) => !apiSourceKeys.includes(key))
    .map((key) => RAW_SOURCES[key] || '')
    .join('\n')

  const literalMatches = Array.from(combinedNonApi.matchAll(/['"`](\/v1\/[^'"` ]+)['"`]/g)).map(
    ([, endpoint]) => endpoint,
  )
  const usedApiFns = Object.keys(API_ENDPOINT_MAP).filter((fnName) => combinedAll.includes(fnName))
  const mappedEndpoints = usedApiFns.flatMap((fnName) => API_ENDPOINT_MAP[fnName] || [])

  return Array.from(new Set([...literalMatches, ...mappedEndpoints]))
}

function buildRequires(endpoints) {
  const caps = new Set()

  endpoints.forEach((endpoint) => {
    if (endpoint.startsWith('/v1/admin/')) caps.add('admin')
    if (endpoint.startsWith('/v1/area-manager/')) caps.add('area_manager')
    if (endpoint.startsWith('/v1/employee/')) caps.add('employee')
  })

  if (caps.size === 0) return { public: true }
  if (caps.size === 1) return { anyOf: Array.from(caps) }
  return { allOf: Array.from(caps) }
}

function analyzeCard(sourceHint) {
  const entryKey = findSourceKey(sourceHint)
  const sources = entryKey ? [entryKey, ...collectDependencies(entryKey)] : []
  const endpoints = inferEndpointsFromSources(sources)

  // requires is derived solely from the endpoints touched by the card + its dependencies.
  return {
    endpoints,
    requires: buildRequires(endpoints),
    sourcePaths: sources,
  }
}

const CARD_CONFIG = [
  { id: 'timeTracking', component: TimeTrackingCard, sourceHint: 'components/dashboard/TimeTrackingCard.jsx' },
  { id: 'documents', component: EmployeeDocumentsCard, sourceHint: 'components/EmployeeDocumentsCard.jsx' },
  { id: 'timeOff', component: TimeOffCard, sourceHint: 'components/TimeOffCard.jsx' },
  { id: 'announcements', component: AnnouncementsCard, sourceHint: 'components/AnnouncementsCard.jsx' },
]

export const DASHBOARD_CARDS = CARD_CONFIG.map((card) => {
  const analysis = analyzeCard(card.sourceHint)
  return {
    ...card,
    inferredFrom: analysis.endpoints,
    requires: analysis.requires,
    sourcePaths: analysis.sourcePaths,
  }
})
