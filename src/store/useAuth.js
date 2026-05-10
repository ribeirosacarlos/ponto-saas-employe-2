import { create } from 'zustand'
import { api } from '../services/http/api'
import { loginRequest, logoutRequest } from '../services/modules/auth'
import { clearAuthCache, getCurrentUser } from '../services/authService'
import { emitAccessClear } from '../lib/accessDenied'
import { clearStoredAuthSession, persistAuthSession, readStoredToken, readStoredUser } from '../lib/authStorage'
import i18n from '../i18n/i18n.js'

const loadStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { token: null, user: null, roles: [] }
  }

  return {
    token: readStoredToken(),
    user: readStoredUser(),
    roles: [],
  }
}

const initialAuth = loadStoredAuth()
if (initialAuth.token) {
  api.defaults.headers.common.Authorization = `Bearer ${initialAuth.token}`
}

const clearAccessibleCookies = () => {
  if (typeof document === 'undefined') return

  document.cookie.split(';').forEach((cookie) => {
    const separatorIndex = cookie.indexOf('=')
    const rawName = separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie
    const name = rawName.trim()
    if (!name) return

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    document.cookie = `${name}=; max-age=0; path=/`
  })
}

const clearPersistedAuthState = () => {
  if (typeof window === 'undefined') return

  clearStoredAuthSession()
  clearAccessibleCookies()
}

const resetAuthState = (set) => {
  clearAuthCache()
  delete api.defaults.headers.common.Authorization
  clearPersistedAuthState()
  emitAccessClear()
  set({ user: null, token: null, roles: [], error: null, isSessionReady: true })
}

export const useAuthStore = create((set, get) => ({
  user: initialAuth.user,
  token: initialAuth.token,
  roles: initialAuth.roles,
  isSessionReady: !initialAuth.token,
  loading: false,
  error: null,
  restoreSession: async () => {
    const { token, user } = loadStoredAuth()

    if (!token) {
      delete api.defaults.headers.common.Authorization
      set({ token: null, user: null, roles: [], error: null, isSessionReady: true })
      return null
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`
    set({ token, user, roles: [], error: null, isSessionReady: false })

    try {
      const profile = await getCurrentUser(true)
      const nextUser = profile?.user || user || null
      const nextRoles = Array.isArray(profile?.roles) ? profile.roles : []

      persistAuthSession({ token, user: nextUser })
      set({ token, user: nextUser, roles: nextRoles, error: null, isSessionReady: true })
      emitAccessClear()
      return profile
    } catch (error) {
      const status = error?.response?.status

      if (status === 401 || status === 403) {
        resetAuthState(set)
        return null
      }

      set({ roles: [], error: null, isSessionReady: true })
      return null
    }
  },
  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      resetAuthState(set)
      const data = await loginRequest(email, password)
      const { token, user, roles = [] } = data
      if (!token) {
        throw new Error(i18n.t('auth.errors.tokenMissing'))
      }

      api.defaults.headers.common.Authorization = `Bearer ${token}`
      persistAuthSession({ token, user: user || null })
      set({ user, token, roles, isSessionReady: true })
      emitAccessClear()
      return data
    } catch (error) {
      const status = error.response?.status
      const friendlyUnauthorized = status === 401 ? i18n.t('auth.errors.unauthorized') : null
      const message =
        friendlyUnauthorized ||
        error.response?.data?.message ||
        error.message ||
        i18n.t('auth.errors.loginFailed')
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ loading: false })
    }
  },
  logout: async () => {
    const token = get().token
    set({ loading: true }) // Marca inicio do loading no fluxo de logout
    try {
      if (token) {
        await logoutRequest()
      }
    } catch (error) {
      console.warn('Falha ao chamar logout na API', error)
    } finally {
      resetAuthState(set)
      set({ loading: false })
    }
  },
  syncProfile: (user, roles = []) => {
    if (!user) return
    persistAuthSession({ token: get().token, user: user || null })
    set({ user, roles, isSessionReady: true })
  },
}))
