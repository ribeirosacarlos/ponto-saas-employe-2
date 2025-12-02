// src/services/api.js (ou onde você estiver usando)

import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://yellowgreen-falcon-528249.hostingersite.com/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Interceptor pra anexar o Bearer token em todas as requisições autenticadas
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function loginRequest(email, password) {
  const { data } = await api.post('/v1/auth/login', { email, password })
  return {
    token: data.token || data?.data?.token,
    user: data.user || data?.data?.user,
    roles: data.roles || data?.data?.roles || [],
  }
}

export async function logoutRequest() {
  const { data } = await api.post('/v1/auth/logout')
  return data
}

export async function clockRequest(type, coords = {}) {
  const payload = { type }

  if (coords.latitude) payload.latitude = coords.latitude
  if (coords.longitude) payload.longitude = coords.longitude

  const { data } = await api.post('/v1/employee/clock', payload)
  return data
}

export async function listEntries(page = 1) {
  const { data } = await api.get('/v1/employee/entries', {
    params: { page },
  })
  return data
}

export async function requestAdjustment(payload) {
  const { data } = await api.post('/v1/employee/adjustments', payload)
  return data
}
