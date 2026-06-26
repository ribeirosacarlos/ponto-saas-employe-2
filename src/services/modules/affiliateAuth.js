import { api } from '../http/api'

export async function acceptAffiliateInvite(payload) {
  const { data } = await api.post('/v1/invites/affiliate/accept', payload, { skipAuth: true })
  return data?.data ?? data ?? {}
}

export async function affiliateLogin(email, password) {
  const { data } = await api.post('/v1/auth/affiliate/login', { email, password }, { skipAuth: true })
  return data?.data ?? data ?? {}
}

export async function getAffiliateMe(token) {
  const { data } = await api.get('/v1/affiliate/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data?.data ?? data ?? {}
}

export async function affiliateLogout(token) {
  await api.post('/v1/affiliate/logout', {}, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
