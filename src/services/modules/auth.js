import { api } from '../http/api'

export async function loginRequest(email, password) {
  const { data } = await api.post('/v1/auth/login', { email, password })
  const payload = data?.data || data || {}

  return {
    ...payload,
    token: payload.token,
    user: payload.user,
    roles: payload.roles || [],
  }
}

export async function logoutRequest() {
  const { data } = await api.post('/v1/auth/logout')
  return data?.data || data
}

// Deprecated: Use getCurrentUser from authService instead
export async function meRequest() {
  console.warn('meRequest is deprecated. Use getCurrentUser from authService instead.')
  const { data } = await api.get('/v1/auth/me')
  return data?.data || data
}
