import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../components/ui/use-toast'
import { clockRequest, endBreak, listEntries, startBreak } from '../../services/modules/employee'
import { useAuthStore } from '../../store/useAuth'
import { useDateTime } from '../../hooks/useDateTime'

const WORK_TYPES = ['in', 'out']
const BREAK_START = 'break_start'
const BREAK_END = 'break_end'

export function useClocking() {
  const logout = useAuthStore((state) => state.logout)
  const { toast } = useToast()
  const { t } = useTranslation()
  const { formatTime, isSameDay } = useDateTime()

  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [clocking, setClocking] = useState('')
  const [breakLoading, setBreakLoading] = useState(false)
  const [lastError, setLastError] = useState(null)
  const [localBreak, setLocalBreak] = useState(null)

  const refreshEntries = useCallback(async () => {
    setLoadingEntries(true)
    setLastError(null)
    try {
      const response = await listEntries()
      const normalized = response?.data || response?.entries || []
      setEntries(normalized)
      setLocalBreak(null)
    } catch (error) {
      const message = error.response?.data?.message || error.message || ''
      setLastError(message)
      if (error.response?.status === 401) {
        toast({
          title: t('toast.sessionExpired.title'),
          description: error.response?.data?.message || t('toast.sessionExpired.description'),
          variant: 'error',
        })
        await logout()
      } else if (error.response?.status === 403) {
      } else {
        toast({
          title: t('toast.fetchEntriesError.title'),
          description: error.response?.data?.message || t('toast.fetchEntriesError.description'),
          variant: 'error',
        })
      }
    } finally {
      setLoadingEntries(false)
    }
  }, [logout, toast, t])

  const registerClock = useCallback(
    async (type, coords) => {
      const actionType = type || ''
      setClocking(actionType)
      setLastError(null)
      try {
        const result = await clockRequest(type, coords)
        const savedAt = result?.entry?.clocked_at || result?.entry?.created_at
        const formattedTime = savedAt
          ? formatTime(savedAt, { hour12: false }) || t('dashboard.nowLabel')
          : t('dashboard.nowLabel')

        if (result?.status === 'adjustment_requested') {
          const adjustment = result?.adjustment ?? {}
          const adjustmentId = adjustment.id || adjustment.uuid
          const proposedType = adjustment.proposed_type ?? adjustment.proposedType ?? ''
          const proposedAt = adjustment.proposed_clocked_at ?? adjustment.proposedClockedAt ?? ''
          toast({
            title: t(
              'timeClock.adjustmentRequested.title',
              'Fora da jornada / dia não trabalhado / dia completo.',
            ),
            description:
              t(
                'timeClock.adjustmentRequested.description',
                'Enviamos uma solicitação de ajuste para aprovação.',
              ) +
              (adjustmentId
                ? ` (#${adjustmentId} • ${proposedType || '?'} • ${proposedAt || '--'})`
                : ''),
            variant: 'warning',
          })
          setLocalBreak(false)
          await refreshEntries()
          return result
        }

        toast({
          title: t('timeClock.clockSuccess.title', 'Ponto registrado com sucesso.'),
          description: formattedTime ? t('toast.clockSuccess.description', { time: formattedTime }) : null,
          variant: 'success',
        })
        setLocalBreak(false)
        await refreshEntries()
        return result
      } catch (error) {
        const message = error.response?.data?.message || error.message || ''
        setLastError(message)
        if (error.response?.status === 422 && error.response?.data?.message) {
          toast({
            title: t('toast.clockRateLimit.title'),
            description: error.response.data.message,
            variant: 'error',
          })
        } else if (error.response?.status === 401) {
          toast({
            title: t('toast.sessionExpired.title'),
            description: error.response?.data?.message || t('toast.sessionExpired.description'),
            variant: 'error',
          })
          await logout()
        } else if (error.response?.status === 403) {
          toast({
            title: t('toast.clockError.title'),
            description: error.response?.data?.message || t('toast.clockError.description'),
            variant: 'error',
          })
        } else {
          toast({
            title: t('toast.clockError.title'),
            description: error.response?.data?.message || t('toast.clockError.description'),
            variant: 'error',
          })
        }
        return null
      } finally {
        setClocking('')
      }
    },
    [formatTime, logout, refreshEntries, toast, t],
  )

  const registerBreak = useCallback(
    async (action) => {
      setBreakLoading(true)
      setLastError(null)
      try {
        const data = action === 'start' ? await startBreak() : await endBreak()
        const savedAt = data.clocked_at || data.created_at
        const formattedTime = savedAt
          ? formatTime(savedAt, { hour12: false }) || t('dashboard.nowLabel')
          : t('dashboard.nowLabel')
        toast({
          title: action === 'start' ? t('timeClock.actions.goToBreak', 'Iniciar intervalo') : t('timeClock.actions.backFromBreak', 'Voltar do intervalo'),
          description: t('toast.clockSuccess.description', { time: formattedTime }),
          variant: 'success',
        })
        setLocalBreak(action === 'start')
        await refreshEntries()
      } catch (error) {
        const message = error.response?.data?.message || error.message || ''
        setLastError(message)
        if (error.response?.status === 401) {
          toast({
            title: t('toast.sessionExpired.title'),
            description: error.response?.data?.message || t('toast.sessionExpired.description'),
            variant: 'error',
          })
          await logout()
        } else if (error.response?.status === 403) {
          toast({
            title: t('timeClock.breakError') || t('toast.clockError.title'),
            description: error.response?.data?.message || t('timeClock.breakErrorDescription') || t('toast.clockError.description'),
            variant: 'error',
          })
        } else {
          toast({
            title: t('timeClock.breakError') || t('toast.clockError.title'),
            description: error.response?.data?.message || t('timeClock.breakErrorDescription') || t('toast.clockError.description'),
            variant: 'error',
          })
        }
      } finally {
        setBreakLoading(false)
      }
    },
    [formatTime, logout, refreshEntries, toast, t],
  )

  const todaysEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.clocked_at &&
          isSameDay(entry.clocked_at, new Date()) &&
          (entry.adjustment_status ?? entry.status) !== 'pending',
      ),
    [entries, isSameDay],
  )

  const workEntries = useMemo(
    () => entries.filter((entry) => WORK_TYPES.includes(entry.type)),
    [entries],
  )
  const todaysWorkEntries = useMemo(
    () =>
      todaysEntries.filter(
        (entry) =>
          WORK_TYPES.includes(entry.type) &&
          (entry.adjustment_status ?? entry.status) !== 'pending' &&
          entry.event_kind !== 'free',
      ),
    [todaysEntries],
  )

  const isBreakFromEntries = useMemo(() => {
    if (todaysEntries.length === 0) return false
    const sorted = [...todaysEntries].sort(
      (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime(),
    )

    let onBreak = false
    sorted.forEach((entry) => {
      if (entry.type === BREAK_START) onBreak = true
      if (entry.type === BREAK_END) onBreak = false
      if (entry.type === 'out') onBreak = false
    })
    return onBreak
  }, [todaysEntries])

  const isOnBreak = localBreak !== null ? localBreak : isBreakFromEntries

  const lastWorkEntry = workEntries?.[0] || null
  const lastTodayWorkEntry = todaysWorkEntries?.[0] || null
  const nextType = lastWorkEntry?.type === 'in' ? 'out' : 'in'

  const status = useMemo(() => {
    if (isOnBreak) return 'break'
    if (!todaysWorkEntries.length) return 'idle'
    if (lastTodayWorkEntry?.type === 'in') return 'working'
    return 'finished'
  }, [isOnBreak, lastTodayWorkEntry, todaysWorkEntries.length])

  return {
    entries,
    todaysEntries,
    loadingEntries,
    refreshEntries,
    clocking,
    registerClock,
    breakLoading,
    registerBreak,
    status,
    isOnBreak,
    lastWorkEntry,
    nextType,
    lastError,
  }
}
