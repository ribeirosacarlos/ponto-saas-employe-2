import { useMemo } from 'react'

// Encapsulates day timeline math to keep UI components lean and testable.
export function useDayRows(todaysEntries, t) {
  const formatDuration = (ms) => {
    const totalMinutes = Math.max(0, Math.floor(ms / 60000))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const minutes = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const sortedTodays = useMemo(
    () =>
      [...todaysEntries].sort(
        (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime(),
      ),
    [todaysEntries],
  )

  const dayRows = useMemo(() => {
    const rows = []
    let lastIn = null
    let lastOut = null

    sortedTodays.forEach((entry) => {
      const ts = new Date(entry.clocked_at).getTime()
      if (entry.type === 'in') {
        if (lastOut) {
          const gap = ts - lastOut
          rows.push({
            kind: 'interval',
            label: t('dashboard.interval'),
            start: lastOut,
            end: ts,
            duration: formatDuration(gap),
            tone: 'muted',
          })
        }
        lastIn = ts
      } else if (entry.type === 'out' && lastIn) {
        const duration = ts - lastIn
        rows.push({
          kind: 'segment',
          label: rows.length === 0 ? t('dashboard.firstPunch') : t('dashboard.lastPunchRow'),
          start: lastIn,
          end: ts,
          duration: formatDuration(duration),
          tone: 'primary',
        })
        lastOut = ts
        lastIn = null
      } else if (entry.type === 'out') {
        lastOut = ts
      }
    })

    if (lastIn) {
      const now = Date.now()
      rows.push({
        kind: 'open',
        label: t('dashboard.lastPunchRow'),
        start: lastIn,
        end: null,
        duration: formatDuration(now - lastIn),
        open: true,
        tone: 'primary',
      })
    }

    return rows
  }, [sortedTodays, t])

  return { dayRows }
}
