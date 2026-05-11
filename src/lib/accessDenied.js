export const ACCESS_DENIED_REASONS = {
  NO_COMPANY: 'NO_COMPANY',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
}

let accessHandlers = {
  setAccessDenied: null,
  clearAccessDenied: null,
}

export function registerAccessHandlers(handlers = {}) {
  accessHandlers = {
    setAccessDenied: handlers.setAccessDenied || null,
    clearAccessDenied: handlers.clearAccessDenied || null,
  }
}

export function emitAccessDenied(payload) {
  if (typeof accessHandlers.setAccessDenied === 'function') {
    accessHandlers.setAccessDenied(payload)
  }
}

export function emitAccessClear() {
  if (typeof accessHandlers.clearAccessDenied === 'function') {
    accessHandlers.clearAccessDenied()
  }
}

const CODE_REASON_MAP = {
  NO_COMPANY: ACCESS_DENIED_REASONS.NO_COMPANY,
  COMPANY_REQUIRED: ACCESS_DENIED_REASONS.NO_COMPANY,
  SUBSCRIPTION_REQUIRED: ACCESS_DENIED_REASONS.SUBSCRIPTION_REQUIRED,
  TRIAL_OR_SUBSCRIPTION_REQUIRED: ACCESS_DENIED_REASONS.SUBSCRIPTION_REQUIRED,
}

function getAccessResolution(reason) {
  switch (reason) {
    case ACCESS_DENIED_REASONS.NO_COMPANY:
      return {
        reason,
        redirectPage: 'companyMissing',
        redirectPath: '/company/missing',
        search: '',
      }
    case ACCESS_DENIED_REASONS.SUBSCRIPTION_REQUIRED:
      return {
        reason,
        redirectPage: 'subscribe',
        redirectPath: '/billing/subscribe',
        search: '?reason=trial_or_subscription',
      }
    default:
      return {
        reason: ACCESS_DENIED_REASONS.FORBIDDEN,
        redirectPage: 'forbidden',
        redirectPath: '/forbidden',
        search: '',
      }
  }
}

export function resolveAccessDenial(payload = '') {
  const code = typeof payload === 'object' && payload !== null ? String(payload.code || '').toUpperCase() : ''
  const reasonFromCode = CODE_REASON_MAP[code]
  if (reasonFromCode) {
    return getAccessResolution(reasonFromCode)
  }

  const message = typeof payload === 'object' && payload !== null ? payload.message : payload
  const normalized = String(message || '').toLowerCase()

  if (normalized.includes('sem empresa')) {
    return getAccessResolution(ACCESS_DENIED_REASONS.NO_COMPANY)
  }

  if (normalized.includes('assinatura ativa')) {
    return getAccessResolution(ACCESS_DENIED_REASONS.SUBSCRIPTION_REQUIRED)
  }

  return getAccessResolution(ACCESS_DENIED_REASONS.FORBIDDEN)
}

export function getAccessRedirect(reason) {
  switch (reason) {
    case ACCESS_DENIED_REASONS.NO_COMPANY:
      return {
        page: 'companyMissing',
        path: '/company/missing',
        search: '',
      }
    case ACCESS_DENIED_REASONS.SUBSCRIPTION_REQUIRED:
      return {
        page: 'subscribe',
        path: '/billing/subscribe',
        search: '?reason=trial_or_subscription',
      }
    default:
      return {
        page: 'forbidden',
        path: '/forbidden',
        search: '',
      }
  }
}
