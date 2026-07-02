const UUID_LIKE = /^[a-zA-Z0-9-]{3,}$/

export function sanitizeScopedId(value) {
  if (value === undefined || value === null) return ''
  const normalized = String(value).trim()
  return UUID_LIKE.test(normalized) ? normalized : ''
}

export function filterAllowedIds(values = [], allowedIds = []) {
  const allowed = new Set(allowedIds.map((item) => sanitizeScopedId(item)).filter(Boolean))
  return values
    .map((item) => sanitizeScopedId(item))
    .filter((item) => item && allowed.has(item))
}

export function sanitizeSingleScopedId(value, allowedIds = []) {
  return filterAllowedIds([value], allowedIds)[0] || ''
}
