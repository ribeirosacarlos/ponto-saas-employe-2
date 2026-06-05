import { DEFAULT_TIMEZONE, formatDate, formatDateTime, isValidTimeZone } from '../../lib/datetime'

export const HEALTH_STATUS_META = {
  healthy: {
    labelKey: 'superAdmin.shared.health.healthy',
    defaultLabel: 'Saudavel',
    className: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  },
  warning: {
    labelKey: 'superAdmin.shared.health.warning',
    defaultLabel: 'Atencao',
    className: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  },
  critical: {
    labelKey: 'superAdmin.shared.health.critical',
    defaultLabel: 'Critico',
    className: 'border-rose-200/70 bg-rose-500/10 text-rose-600',
  },
}

export const SUBSCRIPTION_STATUS_META = {
  active: {
    labelKey: 'superAdmin.shared.subscription.active',
    defaultLabel: 'Ativa',
    className: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  },
  blocked: {
    labelKey: 'superAdmin.shared.subscription.blocked',
    defaultLabel: 'Bloqueada',
    className: 'border-slate-200/70 bg-slate-500/10 text-slate-700',
  },
  trialing: {
    labelKey: 'superAdmin.shared.subscription.trialing',
    defaultLabel: 'Trial',
    className: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  },
  past_due: {
    labelKey: 'superAdmin.shared.subscription.past_due',
    defaultLabel: 'Em atraso',
    className: 'border-rose-200/70 bg-rose-500/10 text-rose-600',
  },
  canceled: {
    labelKey: 'superAdmin.shared.subscription.canceled',
    defaultLabel: 'Cancelada',
    className: 'border-slate-200/70 bg-slate-500/10 text-slate-700',
  },
}

const SUPER_ADMIN_DATETIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/

export const cleanQueryParams = (params = {}) =>
  Object.entries(params).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') return acc
    acc[key] = value
    return acc
  }, {})

export const parseNaiveDateTime = (value) => {
  if (!value || typeof value !== 'string') return null
  const match = value.trim().match(SUPER_ADMIN_DATETIME_REGEX)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4] || 0)
  const minute = Number(match[5] || 0)
  const second = Number(match[6] || 0)

  const parsed = new Date(year, month - 1, day, hour, minute, second)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

export const formatCurrencyEUR = (value, locale = 'pt-BR') => {
  return formatSuperAdminCurrency(value, 'EUR', locale)
}

export const formatSuperAdminCurrency = (value, currency = 'EUR', locale = 'pt-BR') => {
  const amount = Number(value ?? 0)
  return amount.toLocaleString(locale || 'pt-BR', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  })
}

export const formatSuperAdminCompactNumber = (value, locale = 'pt-BR') => {
  const amount = Number(value ?? 0)
  return amount.toLocaleString(locale || 'pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}

export const formatSuperAdminDate = (value, locale = 'pt-BR', timeZone = DEFAULT_TIMEZONE) => {
  if (!value) return '--'
  if (typeof value === 'string' && value.includes(' ') && !value.includes('T')) {
    const parsed = parseNaiveDateTime(value)
    if (!parsed) return value
    return parsed.toLocaleDateString(locale || 'pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return formatDate(value, {
    locale,
    timeZone: isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE,
  })
}

export const formatSuperAdminDateTime = (value, locale = 'pt-BR', timeZone = DEFAULT_TIMEZONE) => {
  if (!value) return '--'
  if (typeof value === 'string' && value.includes(' ') && !value.includes('T')) {
    const parsed = parseNaiveDateTime(value)
    if (!parsed) return value
    return parsed.toLocaleString(locale || 'pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  return formatDateTime(value, {
    locale,
    timeZone: isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE,
  })
}

export const getHealthStatusMeta = (status, t) => {
  const key = String(status || '').toLowerCase()
  const meta = HEALTH_STATUS_META[key] || {
    labelKey: 'superAdmin.shared.health.unknown',
    defaultLabel: status || 'Desconhecido',
    className: 'border-border/60 bg-muted/70 text-muted-foreground',
  }

  return {
    ...meta,
    label: t ? t(meta.labelKey, meta.defaultLabel) : meta.defaultLabel,
  }
}

export const getSubscriptionStatusMeta = (status, label, t) => {
  const key = String(status || '').toLowerCase()
  const meta = SUBSCRIPTION_STATUS_META[key] || {
    labelKey: 'superAdmin.shared.subscription.unknown',
    defaultLabel: label || status || 'Desconhecido',
    className: 'border-border/60 bg-muted/70 text-muted-foreground',
  }

  return {
    ...meta,
    label: label || (t ? t(meta.labelKey, meta.defaultLabel) : meta.defaultLabel),
  }
}

export const resolveSuperAdminError = (error, t, fallback) => {
  const status = error?.response?.status
  if (status === 401) {
    return t('superAdmin.shared.errors.unauthorized', 'Sua sessao expirou. Entre novamente.')
  }
  if (status === 403) {
    return t('superAdmin.shared.errors.forbidden', 'Voce não tem permissao para acessar esta area.')
  }
  return (
    error?.response?.data?.message ||
    error?.userFriendlyMessage ||
    error?.message ||
    fallback ||
    t('superAdmin.shared.errors.generic', 'Nao foi possivel concluir a requisicao.')
  )
}
