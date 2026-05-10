const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const LEGACY_KEYS = [TOKEN_KEY, USER_KEY, 'auth_roles']

const isBrowser = () => typeof window !== 'undefined'

const getSessionStorage = () => (isBrowser() ? window.sessionStorage : null)

const getLocalStorage = () => (isBrowser() ? window.localStorage : null)

const clearLegacyAuthStorage = () => {
  const local = getLocalStorage()
  if (!local) return

  LEGACY_KEYS.forEach((key) => local.removeItem(key))
}

const parseStoredUser = (value) => {
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch (error) {
    console.warn('[authStorage] Failed to parse stored user payload', error)
    return null
  }
}

export function readStoredToken() {
  const storage = getSessionStorage()
  return storage?.getItem(TOKEN_KEY) || null
}

export function readStoredUser() {
  const storage = getSessionStorage()
  return parseStoredUser(storage?.getItem(USER_KEY) || null)
}

export function hasStoredToken() {
  return Boolean(readStoredToken())
}

export function persistAuthSession({ token, user }) {
  const storage = getSessionStorage()
  if (!storage) return

  clearLegacyAuthStorage()

  if (token) {
    storage.setItem(TOKEN_KEY, token)
  } else {
    storage.removeItem(TOKEN_KEY)
  }

  if (user) {
    storage.setItem(USER_KEY, JSON.stringify(user))
  } else {
    storage.removeItem(USER_KEY)
  }
}

export function clearStoredAuthSession() {
  const storage = getSessionStorage()
  if (storage) {
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(USER_KEY)
  }

  clearLegacyAuthStorage()
}
