import { create } from 'zustand'
import { api, loginRequest, logoutRequest } from '../lib/api'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const ROLES_KEY = 'auth_roles'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  roles: [],
  loading: false,
  error: null,
  restoreSession: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const user = localStorage.getItem(USER_KEY)
    const roles = localStorage.getItem(ROLES_KEY)
    if (token && user) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`
      set({
        token,
        user: JSON.parse(user),
        roles: roles ? JSON.parse(roles) : [],
      })
    }
  },
  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const data = await loginRequest(email, password)
      const { token, user, roles = [] } = data
      if (!token) {
        throw new Error('Token não retornado pela API')
      }

      api.defaults.headers.common.Authorization = `Bearer ${token}`
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user || null))
      localStorage.setItem(ROLES_KEY, JSON.stringify(roles))
      set({ user, token, roles })
      return data
    } catch (error) {
      const message =
        error.message ||
        error.response?.data?.message ||
        'Não foi possível fazer login. Verifique as credenciais.'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ loading: false })
    }
  },
  logout: async () => {
    const token = get().token
    set({ loading: true })
    try {
      if (token) {
        await logoutRequest()
      }
    } catch (error) {
      console.warn('Falha ao chamar logout na API', error)
    } finally {
      api.defaults.headers.common.Authorization = undefined
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(ROLES_KEY)
      set({ user: null, token: null, roles: [], loading: false })
    }
  },
}))
