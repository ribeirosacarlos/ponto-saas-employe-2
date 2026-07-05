const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const ROLES_KEY = 'auth_roles'
const LEGACY_KEYS = [TOKEN_KEY, USER_KEY, ROLES_KEY]
let memoryToken = null

const isBrowser = () => typeof window !== 'undefined'

const getSessionStorage = () => (isBrowser() ? window.sessionStorage : null)

const getAuthStorages = () => {
  if (!isBrowser()) return []
  return [getSessionStorage()].filter(Boolean)
}

const clearLegacyAuthStorage = () => {
  if (!isBrowser()) return

  ;[window.sessionStorage, window.localStorage]
    .filter(Boolean)
    .forEach((storage) => {
    LEGACY_KEYS.forEach((key) => storage.removeItem(key))
  })
}

const parseStoredUser = (value) => {
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

const parseStoredRoles = (value) => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
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
  return memoryToken || readFromStorages(TOKEN_KEY)
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
  memoryToken = token || null

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
  memoryToken = null
  getAuthStorages().forEach((storage) => {
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(USER_KEY)
    storage.removeItem(ROLES_KEY)
  })

  clearLegacyAuthStorage()
}

export function setMemoryToken(token) {
  memoryToken = token || null
}
