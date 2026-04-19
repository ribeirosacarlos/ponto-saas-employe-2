const ACTION_LABELS = {
  'employee.updated': 'Colaborador atualizado',
  'time_entry.adjustment_approved': 'Ajuste de ponto aprovado',
  'platform.company_blocked': 'Empresa bloqueada',
  'employee.deleted': 'Colaborador removido',
  'company.settings.updated': 'Configuracoes da empresa atualizadas',
}

const ENTITY_LABELS = {
  employee: 'Colaborador',
  company: 'Empresa',
  time_entry: 'Registro de ponto',
  adjustment: 'Ajuste',
  settings: 'Configuracoes',
  platform: 'Plataforma',
  announcement: 'Comunicado',
  document: 'Documento',
  vacation: 'Ferias',
}

export const AUDIT_PER_PAGE_OPTIONS = [10, 20, 50, 100]

const normalizeWord = (word = '') => {
  if (!word) return ''
  const lower = String(word).toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export const formatAuditActionLabel = (action) => {
  if (!action) return 'Acao nao informada'
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]

  return String(action)
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(normalizeWord)
    .join(' ')
}

export const formatAuditEntityTypeLabel = (entityType) => {
  if (!entityType) return 'Entidade nao informada'
  if (ENTITY_LABELS[entityType]) return ENTITY_LABELS[entityType]

  return String(entityType)
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(normalizeWord)
    .join(' ')
}

export const formatAuditRoleLabel = (role) => {
  if (!role) return 'Nao informado'
  const normalized = String(role).toLowerCase()
  const labels = {
    super_admin: 'Super admin',
    admin: 'Admin',
    manager: 'Gestor',
    area_manager: 'Gestor de area',
    employee: 'Colaborador',
    system: 'Sistema',
  }

  return labels[normalized] || normalizeWord(normalized.replace(/_/g, ' '))
}

export const buildAuditLogSuggestions = (logs = []) => {
  const users = new Map()
  const actions = new Map()
  const entityTypes = new Map()

  logs.forEach((log) => {
    if (log?.actor?.id) {
      users.set(String(log.actor.id), {
        value: String(log.actor.id),
        label: log.actor.name || log.actor.email || String(log.actor.id),
        hint: log.actor.email || '',
      })
    }

    if (log?.action) {
      actions.set(log.action, {
        value: log.action,
        label: formatAuditActionLabel(log.action),
      })
    }

    if (log?.entityType) {
      entityTypes.set(log.entityType, {
        value: log.entityType,
        label: formatAuditEntityTypeLabel(log.entityType),
      })
    }
  })

  return {
    userOptions: Array.from(users.values()).sort((left, right) =>
      left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' }),
    ),
    actionOptions: Array.from(actions.values()).sort((left, right) =>
      left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' }),
    ),
    entityTypeOptions: Array.from(entityTypes.values()).sort((left, right) =>
      left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' }),
    ),
  }
}
