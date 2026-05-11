import { api } from '../http/api'

export async function loginRequest(email, password) {
  const { data } = await api.post('/v1/auth/login', { email, password }, { skipAuth: true })
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

export async function acceptInvite(payload = {}) {
  const { email, invite_code, password, password_confirmation } = payload
  const { data } = await api.post('/v1/invites/accept', {
    email,
    invite_code,
    password,
    password_confirmation,
  }, { skipAuth: true })
  return data
}

export async function forgotPasswordRequest(email) {
  const { data } = await api.post('/v1/forgot-password', { email }, { skipAuth: true })
  return data
}

export async function resetPasswordRequest(payload = {}) {
  const { token, email, password, password_confirmation } = payload
  const { data } = await api.post('/v1/reset-password', {
    token,
    email,
    password,
    password_confirmation,
  }, { skipAuth: true })
  return data
}

// Deprecated: Use getCurrentUser from authService instead
export async function meRequest() {
  console.warn('meRequest is deprecated. Use getCurrentUser from authService instead.')
  const { data } = await api.get('/v1/auth/me')
  return data?.data || data
}
