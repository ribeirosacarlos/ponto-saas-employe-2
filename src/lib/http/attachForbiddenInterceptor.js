import i18n from '../../i18n/i18n'
import { emitAccessDenied, resolveAccessDenial } from '../accessDenied'

const AUTH_ENDPOINTS = ['/v1/auth/login', '/v1/auth/logout']
const ACCESS_EXCEPTIONS = ['/v1/billing/checkout-session']

export function attachForbiddenInterceptor(axiosInstance) {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status
      if (status === 403) {
        const data = error.response.data && typeof error.response.data === 'object' ? error.response.data : {}
        const message = data.message || i18n.t('errors.forbidden.description')
        const { reason } = resolveAccessDenial(message)
        const title = data.title || i18n.t('errors.forbidden.title')
        const hasToken = typeof window !== 'undefined' ? Boolean(localStorage.getItem('auth_token')) : false
        const requestUrl = error.config?.url || ''
        const isAuthRequest = AUTH_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint))
        const isAccessException = ACCESS_EXCEPTIONS.some((endpoint) => requestUrl.includes(endpoint))

        error.response.data = {
          ...data,
          title,
          message,
          code: data.code || 'forbidden',
          accessDeniedReason: reason,
        }

        error.userFriendlyMessage = message

        if (hasToken && !isAuthRequest && !isAccessException) {
          emitAccessDenied({ reason, message })
        }
      }

      return Promise.reject(error)
    },
  )
}
