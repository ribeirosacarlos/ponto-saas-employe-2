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

export function resolveAccessDenial(message = '') {
  const normalized = String(message || '').toLowerCase()

  if (normalized.includes('sem empresa')) {
    return {
      reason: ACCESS_DENIED_REASONS.NO_COMPANY,
      redirectPage: 'companyMissing',
      redirectPath: '/company/missing',
      search: '',
    }
  }

  if (normalized.includes('assinatura ativa')) {
    return {
      reason: ACCESS_DENIED_REASONS.SUBSCRIPTION_REQUIRED,
      redirectPage: 'subscribe',
      redirectPath: '/billing/subscribe',
      search: '?reason=trial_or_subscription',
    }
  }

  return {
    reason: ACCESS_DENIED_REASONS.FORBIDDEN,
    redirectPage: 'forbidden',
    redirectPath: '/forbidden',
    search: '',
  }
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
