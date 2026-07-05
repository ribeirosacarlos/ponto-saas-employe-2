const isDev = import.meta.env.DEV

const redactValue = (value) => {
  if (typeof value === 'string') {
    if (/bearer\s+/i.test(value) || /token/i.test(value)) return '[redacted]'
    return value
  }

  if (Array.isArray(value)) {
    return value.map(redactValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        /token|authorization|password|cookie|email|document|cpf/i.test(key)
          ? '[redacted]'
          : redactValue(nestedValue),
      ]),
    )
  }

  return value
}

const log = (level, message, meta) => {
  if (!isDev || typeof console === 'undefined') return

  if (meta === undefined) {
    console[level](message)
    return
  }

  console[level](message, redactValue(meta))
}

export const securityLogger = {
  debug(message, meta) {
    log('debug', message, meta)
  },
  info(message, meta) {
    log('info', message, meta)
  },
  warn(message, meta) {
    log('warn', message, meta)
  },
  error(message, meta) {
    log('error', message, meta)
  },
}
