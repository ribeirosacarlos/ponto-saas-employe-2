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

export async function listAllAdminVacationsByUser({ userId, status } = {}) {
  if (!userId) return []

  const collected = []
  let page = 1
  let lastPage = 1

  do {
    const response = await listAdminVacationsByUser({ userId, status, page })
    collected.push(...(Array.isArray(response?.data) ? response.data : []))

    const nextLastPage = Number(response?.meta?.lastPage ?? response?.meta?.last_page ?? 0)
    if (Number.isFinite(nextLastPage) && nextLastPage > 0) {
      lastPage = nextLastPage
    } else if (!response?.data?.length) {
      lastPage = page
    } else {
      lastPage = page + 1
    }

    page += 1
  } while (page <= lastPage && page <= 50)

  return collected
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
