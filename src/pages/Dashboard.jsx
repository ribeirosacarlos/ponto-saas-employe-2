import { useEffect, useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { PontoList } from '../components/PontoList'
import { useToast } from '../components/ui/use-toast'
import { clockRequest, listEntries, requestAdjustment } from '../lib/api'
import { useAuthStore } from '../store/useAuth'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { PunchSummaryCard } from '../features/ponto/PunchSummaryCard'
import { useDayRows } from '../features/ponto/useDayRows'
import { QuickMenu } from '../components/QuickMenu'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const { toast } = useToast()
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [clocking, setClocking] = useState('')
  const [sendingAdjustment, setSendingAdjustment] = useState(false)
  const { t } = useTranslation()

  const todaysEntries = useMemo(
    () =>
      entries.filter((entry) => entry.clocked_at && isSameDay(new Date(entry.clocked_at), new Date())),
    [entries],
  )

  const lastPunch = entries?.[0]

  const workedTime = useMemo(() => {
    const sorted = [...todaysEntries].sort(
      (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime(),
    )
    let lastIn = null
    let totalMs = 0

    sorted.forEach((entry) => {
      const ts = new Date(entry.clocked_at).getTime()
      if (entry.type === 'in') {
        lastIn = ts
      } else if (entry.type === 'out' && lastIn) {
        totalMs += ts - lastIn
        lastIn = null
      }
    })

    const totalMinutes = Math.max(0, Math.floor(totalMs / 60000))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const minutes = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${minutes}`
  }, [todaysEntries])

  const hourBank = '-109:48'

  const nextType = lastPunch?.type === 'in' ? 'out' : 'in'
  const nextLabel = nextType === 'in' ? t('dashboard.nextLabel.in') : t('dashboard.nextLabel.out')

  const { dayRows } = useDayRows(todaysEntries, t)

  const fetchEntries = async () => {
    setLoadingEntries(true)
    try {
      const data = await listEntries()
      setEntries(data.data || [])
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast({
          title: t('toast.sessionExpired.title'),
          description: error.response?.data?.message || t('toast.sessionExpired.description'),
          variant: 'error',
        })
        await logout()
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
  }

  useEffect(() => {
    if (!token) return
    fetchEntries()
  }, [token])

  const handleClock = async (actionType) => {
    setClocking(actionType)
    try {
      const data = await clockRequest(actionType)
      const savedAt = data.clocked_at || data.created_at
      const formattedTime = savedAt ? format(new Date(savedAt), 'HH:mm') : t('dashboard.nowLabel')
      toast({
        title: t('toast.clockSuccess.title'),
        description: t('toast.clockSuccess.description', { time: formattedTime }),
        variant: 'success',
      })
      fetchEntries()
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.message) {
        toast({
          title: t('toast.clockRateLimit.title'),
          description: error.response.data.message,
          variant: 'error',
        })
      } else {
        toast({
          title: t('toast.clockError.title'),
          description: error.response?.data?.message || t('toast.clockError.description'),
          variant: 'error',
        })
      }
    } finally {
      setClocking('')
    }
  }

  const handleAdjustment = async (form, closeModal, resetForm) => {
    setSendingAdjustment(true)
    try {
      await requestAdjustment(form)
      toast({
        title: t('toast.adjustmentSuccess.title'),
        description: t('toast.adjustmentSuccess.description'),
        variant: 'success',
      })
      closeModal()
      resetForm()
    } catch (error) {
      toast({
        title: t('toast.adjustmentError.title'),
        description: error.response?.data?.message || t('toast.adjustmentError.description'),
        variant: 'error',
      })
    } finally {
      setSendingAdjustment(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    toast({
      title: t('toast.logout.title'),
      description: t('toast.logout.description'),
    })
  }

  return (
    <div className="container py-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="inline-flex items-center rounded-md bg-foreground/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-foreground">
            {t('dashboard.badge')}
          </p>
          <h2 className="text-xl font-semibold leading-tight break-words">
            {t('dashboard.greeting', {
              name: user?.name || t('dashboard.fallbackName'),
            })}
          </h2>
          <p className="text-sm text-foreground/80 leading-relaxed max-w-xl">{t('dashboard.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          
          <LanguageSwitcher variant="compact" />
          
          <QuickMenu
            onLogout={handleLogout}
            onHistory={() =>
              toast({
                title: t('dashboard.menu.history'),
                description: t('dashboard.menu.comingSoon'),
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <PunchSummaryCard
          t={t}
          lastPunch={lastPunch}
          dayRows={dayRows}
          workedTime={workedTime}
          hourBank={hourBank}
          nextType={nextType}
          nextLabel={nextLabel}
          sendingAdjustment={sendingAdjustment}
          onAdjustment={handleAdjustment}
          onRegister={() => handleClock(nextType)}
          clocking={clocking}
        />

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-[0_20px_60px_-35px_rgba(16,185,129,0.45)]">
            <h3 className="text-base font-semibold">{t('dashboard.employeeCardTitle')}</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">{t('dashboard.name')}</span>
                <span className="font-semibold">{user?.name || user?.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">{t('dashboard.email')}</span>
                <span className="font-semibold">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">{t('dashboard.role')}</span>
                <span className="font-semibold">{t('dashboard.roleValue')}</span>
              </div>
            </div>
          </div>
          <PontoList entries={entries} loading={loadingEntries} />
        </div>
      </div>
    </div>
  )
}
