import i18n from '../../i18n/i18n'

export function attachForbiddenInterceptor(axiosInstance) {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status
      if (status === 403) {
        const data = error.response.data && typeof error.response.data === 'object' ? error.response.data : {}
        const title = data.title || i18n.t('errors.forbidden.title')
        const message = data.message || i18n.t('errors.forbidden.description')

        error.response.data = {
          ...data,
          title,
          message,
          code: data.code || 'forbidden',
        }

        error.userFriendlyMessage = message
      }

      return Promise.reject(error)
    },
  )
}
