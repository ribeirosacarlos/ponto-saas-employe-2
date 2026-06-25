import { create } from 'zustand'

const STORAGE_KEY = 'affiliate:token'
const USER_KEY = 'affiliate:user'

const readToken = () => (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null)
const readUser = () => {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
}

export const useAffiliateAuth = create((set) => ({
  token: readToken(),
  affiliate: readUser(),

  setSession: (token, affiliate) => {
    localStorage.setItem(STORAGE_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(affiliate))
    set({ token, affiliate })
  },

  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, affiliate: null })
  },
}))
