import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { AjusteModal } from '../../components/AjusteModal'

export function PunchSummaryCard({
  t,
  lastPunch,
  dayRows,
  workedTime,
  hourBank,
  nextType,
  nextLabel,
  sendingAdjustment,
  onAdjustment,
  onRegister,
  clocking,
}) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className="bg-card/95">
      <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              {t('dashboard.sectionLabel')}
            </p>
            <CardTitle className="text-base font-semibold">{t('dashboard.myPoint')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <AjusteModal
              onSubmit={onAdjustment}
              isSubmitting={sendingAdjustment}
              trigger={
                <Button size="sm" variant="outline" className="rounded-lg px-3 text-xs">
                  {t('dashboard.requestAdjustment')}
                </Button>
              }
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/60 shadow-xl">
          <div className="flex flex-col gap-3 rounded-2xl">
            <div className="flex items-center justify-between rounded-t-2xl border-b border-border/60 bg-primary/15 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t('dashboard.lastPunch')}</p>
                  <p className="text-xs text-muted-foreground">
                    {lastPunch?.clocked_at
                      ? t('dashboard.registeredAt', {
                          time: format(new Date(lastPunch.clocked_at), 'HH:mm'),
                        })
                      : t('dashboard.noEntriesToday')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-primary hover:bg-primary/10"
                onClick={() => setShowDetails((prev) => !prev)}
                aria-expanded={showDetails}
                aria-controls="day-history"
              >
                {t('dashboard.details')}
                {showDetails ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
              </Button>
            </div>

            {showDetails && (
              <div id="day-history" className="space-y-3 px-4 pb-4 pt-2">
                {dayRows.length === 0 && <p className="text-xs text-muted-foreground">{t('dashboard.noEntriesToday')}</p>}
                {dayRows.map((row, idx) => (
                  <div
                    key={`${row.label}-${idx}-${row.start || 'open'}`}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 px-4 py-3 shadow-md"
                  >
                    <div>
                      <p className="text-sm font-semibold">{row.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.start ? format(new Date(row.start), 'HH:mm') : '--:--'}{' '}
                        <span className="mx-1 text-muted-foreground/70">{'>'}</span>{' '}
                        {row.end ? format(new Date(row.end), 'HH:mm') : t('dashboard.openStatus')}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${row.tone === 'muted' ? 'text-emerald-400' : 'text-primary'}`}
                    >
                      {row.duration}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 bg-card/90 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {t('dashboard.hoursToday')}
            </p>
            <p className="mt-1 text-xl font-semibold text-foreground">{workedTime}</p>
            <p className="text-[11px] text-muted-foreground">{t('dashboard.hoursTodayHelper')}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/90 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t('dashboard.hourBank')}</p>
            <p className="mt-1 text-xl font-semibold text-red-400">{hourBank}</p>
            <p className="text-[11px] text-muted-foreground">{t('dashboard.hourBankHelper')}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-gradient-to-r from-primary/15 via-emerald-500/10 to-transparent px-3 py-2.5 text-xs text-muted-foreground">
          {t('dashboard.backendNote', {
            inLabel: 'in',
            outLabel: 'out',
            nextType: nextType.toUpperCase(),
          })}
        </div>

        <Button
          size="md"
          className="w-full rounded-2xl text-sm font-semibold shadow-lg"
          onClick={onRegister}
          disabled={clocking === nextType}
        >
          {clocking === nextType ? t('dashboard.registering') : t('dashboard.registerButton')} ({nextLabel})
        </Button>
      </CardContent>
    </Card>
  )
}
