const GENERIC_ERROR_KEY = 'errors.generic'

export const AUTH_FAILURE_CODES = new Set([401])

export function normalizeApiError(error, options = {}) {
  const status = error?.response?.status ?? null
  const fallbackMessage = options.fallbackMessage || 'Ocorreu um erro. Tente novamente.'

  if (status === 401) {
    return {
      status,
      message: options.unauthorizedMessage || 'Sua sessão expirou. Faça login novamente.',
      shouldClearSession: options.clearSessionOnUnauthorized !== false,
      code: 'unauthorized',
    }
  }

  if (status === 403) {
    return {
      status,
      message: options.forbiddenMessage || 'Você não tem permissão para realizar esta ação.',
      shouldClearSession: false,
      code: 'forbidden',
    }
  }

  if (status === 429) {
    return {
      status,
      message:
        options.rateLimitMessage ||
        'Muitas tentativas em pouco tempo. Aguarde um instante antes de tentar novamente.',
      shouldClearSession: false,
      code: 'rate_limited',
    }
  }

  if (status >= 500) {
    return {
      status,
      message: options.serverErrorMessage || fallbackMessage,
      shouldClearSession: false,
      code: 'server_error',
    }
  }

  if (!status) {
    return {
      status: null,
      message: options.networkErrorMessage || fallbackMessage,
      shouldClearSession: false,
      code: 'network_error',
    }
  }

  return {
    status,
    message: fallbackMessage,
    shouldClearSession: false,
    code: GENERIC_ERROR_KEY,
  }
}
