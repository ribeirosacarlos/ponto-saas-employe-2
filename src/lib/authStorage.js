const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const ROLES_KEY = 'auth_roles'
const LEGACY_KEYS = [TOKEN_KEY, USER_KEY, ROLES_KEY]

const isBrowser = () => typeof window !== 'undefined'

const getLocalStorage = () => (isBrowser() ? window.localStorage : null)

const getSessionStorage = () => (isBrowser() ? window.sessionStorage : null)

const getAuthStorages = () => {
  if (!isBrowser()) return []
  return [getSessionStorage(), getLocalStorage()].filter(Boolean)
}

const clearLegacyAuthStorage = () => {
  getAuthStorages().forEach((storage) => {
    LEGACY_KEYS.forEach((key) => storage.removeItem(key))
  })
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

const parseStoredRoles = (value) => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('[authStorage] Failed to parse stored roles payload', error)
    return []
  }
}

const readFromStorages = (key) => {
  const storages = getAuthStorages()

  for (const storage of storages) {
    const value = storage.getItem(key)
    if (value) return value
  }

  return null
}

export function readStoredToken() {
  return readFromStorages(TOKEN_KEY)
}

export function readStoredUser() {
  return parseStoredUser(readFromStorages(USER_KEY))
}

export function readStoredRoles() {
  return parseStoredRoles(readFromStorages(ROLES_KEY))
}

export function hasStoredToken() {
  return Boolean(readStoredToken())
}

export function persistAuthSession({ token, user, roles = [] }) {
  clearLegacyAuthStorage()

  getAuthStorages().forEach((storage) => {
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

    if (Array.isArray(roles) && roles.length > 0) {
      storage.setItem(ROLES_KEY, JSON.stringify(roles))
    } else {
      storage.removeItem(ROLES_KEY)
    }
  })
}

export function clearStoredAuthSession() {
  getAuthStorages().forEach((storage) => {
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(USER_KEY)
    storage.removeItem(ROLES_KEY)
  })

  clearLegacyAuthStorage()
}
