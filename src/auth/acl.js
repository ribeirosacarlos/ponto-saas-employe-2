const ROLE_CAPABILITIES = {
  employee: ['employee'],
  area_manager: ['area_manager', 'employee'],
  manager: ['manager', 'area_manager', 'employee'],
  admin: ['admin', 'area_manager', 'employee'],
  super_admin: ['super_admin', 'admin', 'area_manager', 'employee'],
  commercial_manager: ['commercial_manager'],
  commercial_agent: ['commercial_agent'],
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
