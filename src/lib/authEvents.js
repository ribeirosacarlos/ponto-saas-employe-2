const AUTH_FAILURE_EVENT = 'auth:session-invalidated'

let authFailureHandler = null

export function registerAuthFailureHandler(handler) {
  authFailureHandler = typeof handler === 'function' ? handler : null
}

export function emitAuthFailure(detail = {}) {
  authFailureHandler?.(detail)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_FAILURE_EVENT, { detail }))
  }
}

export function getAuthFailureEventName() {
  return AUTH_FAILURE_EVENT
}
