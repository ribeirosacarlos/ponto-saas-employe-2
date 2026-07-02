const SENSITIVE_PATH_PREFIXES = [
  '/dashboard',
  '/time-clock',
  '/documents',
  '/vacations',
  '/admin/',
  '/settings',
  '/platform/',
  '/super-admin/',
  '/commercial/',
  '/affiliate/',
]

export function isSensitiveRoute(pathname = '') {
  return SENSITIVE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function shouldBlockFramedApp(pathname = '') {
  if (typeof window === 'undefined') return false

  const isFramed = window.self !== window.top
  return isFramed && isSensitiveRoute(pathname)
}
