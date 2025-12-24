import { useEffect } from 'react'
import { create } from 'zustand'
import { getAbsenceToday, isAbsenceServiceConfigured } from '../../services/absencesService'

const normalizeAbsence = (absence = {}, index = 0) => {
  const startDate = absence.start_date ?? absence.startDate ?? absence.date ?? absence.day ?? ''
  const endDate = absence.end_date ?? absence.endDate ?? absence.date ?? absence.day ?? ''

  return {
    ...absence,
    id: absence.id ?? absence.uuid ?? `absence-${index}`,
    type: absence.type ?? absence.category ?? absence.kind ?? absence.absence_type ?? '',
    comment: absence.comment ?? absence.notes ?? absence.justification ?? absence.description ?? '',
    status: absence.status ?? absence.state ?? '',
    startDate,
    endDate,
  }
}

const useAbsenceStore = create((set) => ({
  isAbsentToday: false,
  absenceToday: null,
  loading: false,
  error: '',
  refresh: async () => {
    if (!isAbsenceServiceConfigured()) {
      set({ isAbsentToday: false, absenceToday: null, loading: false, error: '' })
      return { ok: false, reason: 'not-configured' }
    }

    set({ loading: true, error: '' })
    try {
      const response = await getAbsenceToday()
      const normalized = response ? normalizeAbsence(response) : null
      set({
        isAbsentToday: Boolean(normalized),
        absenceToday: normalized,
        loading: false,
        error: '',
      })
      return { ok: true, data: normalized }
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Unable to load absence.'
      set({
        isAbsentToday: false,
        absenceToday: null,
        loading: false,
        error: message,
      })
      return { ok: false, error }
    }
  },
}))

export function useAbsenceStatus({ auto = true } = {}) {
  const { isAbsentToday, absenceToday, loading, error, refresh } = useAbsenceStore()

  useEffect(() => {
    if (auto) {
      refresh()
    }
  }, [auto, refresh])

  return { isAbsentToday, absenceToday, loading, error, refresh }
}
