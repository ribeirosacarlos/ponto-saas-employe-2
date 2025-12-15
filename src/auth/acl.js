const ROLE_CAPABILITIES = {
  admin: ['admin', 'area_manager', 'employee'],
  area_manager: ['area_manager', 'employee'],
  employee: ['employee'],
}

function normalizeRoles(roles) {
  if (!roles || !Array.isArray(roles)) return []
  return roles
    .map((role) => (typeof role === 'string' ? role.toLowerCase() : ''))
    .filter(Boolean)
}

export function getCapabilitiesFromRoles(roles) {
  const normalized = normalizeRoles(roles)
  const caps = new Set()

  normalized.forEach((role) => {
    const mapped = ROLE_CAPABILITIES[role] || []
    mapped.forEach((cap) => caps.add(cap))
  })

  return Array.from(caps)
}

export function canRenderCard(capabilities, requires) {
  if (!requires || requires.public) return true
  if (capabilities?.includes('admin')) return true

  const userCaps = new Set(capabilities || [])

  if (requires.anyOf?.length) {
    return requires.anyOf.some((cap) => userCaps.has(cap))
  }

  if (requires.allOf?.length) {
    return requires.allOf.every((cap) => userCaps.has(cap))
  }

  return false
}

export { ROLE_CAPABILITIES }
