import { create } from 'zustand'

export const useAffiliateAuth = create((set) => ({
  token: null,
  affiliate: null,

  setSession: (token, affiliate) => {
    set({ token, affiliate })
  },

  clearSession: () => {
    set({ token: null, affiliate: null })
  },
}))
