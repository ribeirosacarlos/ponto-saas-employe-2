import {
  approveVacation,
  createAdminVacation,
  getAdminVacationBalance,
  listAdminVacations,
  rejectVacation,
} from './vacationsService'

export async function listPendingAdminVacations({ page } = {}) {
  return listAdminVacations({ status: 'pending', page })
}

export async function listAdminVacationsByUser({ userId, status, page } = {}) {
  if (!userId) return { data: [], meta: null }
  return listAdminVacations({ status, userId, page })
}

export async function approveAdminVacation(id, justification) {
  if (!id) return null
  const payload = justification ? { notes: justification } : null

  if (!payload) {
    return approveVacation(id)
  }

  try {
    return await approveVacation(id, payload)
  } catch (error) {
    return approveVacation(id)
  }
}

export async function rejectAdminVacation(id, rejectionReason) {
  if (!id) return null
  return rejectVacation(id, rejectionReason)
}

export async function getAdminVacationSummary(userId) {
  if (!userId) return null
  return getAdminVacationBalance(userId)
}

export async function createAdminVacationEntry(payload = {}) {
  return createAdminVacation(payload)
}
