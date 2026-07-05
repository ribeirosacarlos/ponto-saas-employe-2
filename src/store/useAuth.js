import { create } from 'zustand'
import { api } from '../services/http/api'
import { loginRequest, logoutRequest } from '../services/modules/auth'
import { clearAuthCache, getCurrentUser } from '../services/authService'
import { emitAccessClear } from '../lib/accessDenied'
import { emitAuthFailure, registerAuthFailureHandler } from '../lib/authEvents'
import {
  clearStoredAuthSession,
  persistAuthSession,
  readStoredRoles,
  readStoredToken,
  readStoredUser,
  setMemoryToken,
} from '../lib/authStorage'
import i18n from '../i18n/i18n.js'
import { normalizeApiError } from '../lib/security/httpErrors'
import { securityLogger } from '../lib/security/logger'
import { runWithRequestLock } from '../lib/security/requestLock'

const loadStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { token: null, user: null, roles: [] }
  }

  return {
    token: readStoredToken(),
    user: readStoredUser(),
    roles: readStoredRoles(),
  }
}

const initialAuth = loadStoredAuth()
if (initialAuth.token) {
  api.defaults.headers.common.Authorization = `Bearer ${initialAuth.token}`
  setMemoryToken(initialAuth.token)
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
    const roles = readStoredRoles()

    if (!token) {
      delete api.defaults.headers.common.Authorization
      set({ token: null, user: null, roles: [], error: null, isSessionReady: true })
      return null
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`
    setMemoryToken(token)
    set({ token, user, roles, error: null, isSessionReady: false })

    if (Array.isArray(roles) && roles.some((role) => String(role).toLowerCase() === 'affiliate')) {
      set({ token, user, roles, error: null, isSessionReady: true })
      emitAccessClear()
      return { user, roles }
    }

    try {
      const profile = await getCurrentUser(true)
      const nextUser = profile?.user || user || null
      const nextRoles = Array.isArray(profile?.roles) && profile.roles.length ? profile.roles : roles

      persistAuthSession({ token, user: nextUser, roles: nextRoles })
      set({ token, user: nextUser, roles: nextRoles, error: null, isSessionReady: true })
      emitAccessClear()
      return profile
    } catch (error) {
      set({ token, user, roles, error: null, isSessionReady: true })
      return null
    }
  },
  login: async (email, password) => {
    if (get().loading) {
      throw new Error(i18n.t('auth.errors.requestInProgress'))
    }

    set({ loading: true, error: null })
    try {
      resetAuthState(set)
      const data = await runWithRequestLock('auth:login', () => loginRequest(email, password))
      const { token, user } = data
      if (!token) {
        throw new Error(i18n.t('auth.errors.tokenMissing'))
      }

      api.defaults.headers.common.Authorization = `Bearer ${token}`
      setMemoryToken(token)
      persistAuthSession({ token, user: user || null })
      const profile = await getCurrentUser(true)
      const nextUser = profile?.user || user || null
      const loginRoles = Array.isArray(data.roles) && data.roles.length > 0 ? data.roles : []
      const profileRoles = Array.isArray(profile?.roles) && profile.roles.length > 0 ? profile.roles : []
      const nextRoles = profileRoles.length > 0 ? profileRoles : loginRoles

      persistAuthSession({ token, user: nextUser, roles: nextRoles })
      set({ user: nextUser, token, roles: nextRoles, error: null, isSessionReady: true })
      emitAccessClear()
      return {
        ...data,
        user: nextUser,
        roles: nextRoles,
      }
    } catch (error) {
      const normalized = normalizeApiError(error, {
        fallbackMessage: i18n.t('auth.errors.loginFailed'),
        unauthorizedMessage: i18n.t('auth.errors.unauthorized'),
        rateLimitMessage: i18n.t('auth.errors.rateLimited'),
        networkErrorMessage: i18n.t('auth.errors.loginFailed'),
        clearSessionOnUnauthorized: false,
      })
      const message = error.message === i18n.t('auth.errors.requestInProgress') ? error.message : normalized.message
      resetAuthState(set)
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
        await runWithRequestLock('auth:logout', () => logoutRequest())
      }
    } catch (error) {
      securityLogger.warn('[useAuth] Logout API call failed', error)
    } finally {
      resetAuthState(set)
      set({ loading: false })
    }
  },
  syncProfile: (user, roles = []) => {
    if (!user) return
    persistAuthSession({ token: get().token, user: user || null, roles })
    set({ user, roles, error: null, isSessionReady: true })
  },
  bootstrapSession: ({ token, user = null, roles = [] }) => {
    if (!token) return
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    setMemoryToken(token)
    persistAuthSession({ token, user, roles })
    set({ token, user, roles, error: null, isSessionReady: true })
    emitAccessClear()
  },
  clearLocalSession: () => {
    resetAuthState(set)
  },
}))

registerAuthFailureHandler((detail = {}) => {
  if (!useAuthStore.getState().token) return
  resetAuthState(useAuthStore.setState)
  useAuthStore.setState({
    error: detail.message || i18n.t('auth.errors.sessionExpired'),
    loading: false,
  })
  securityLogger.warn('[useAuth] Session invalidated', detail)
})
