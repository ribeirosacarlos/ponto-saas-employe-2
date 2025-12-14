import { CalendarClock, MapPin, Radio } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useTranslation } from 'react-i18next'

export function PontoList({ entries = [], loading }) {
  const { t } = useTranslation()
  const typeLabels = {
    in: t('types.in'),
    out: t('types.out'),
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('dashboard.sectionLabel')}
          </p>
          <CardTitle className="text-xl">{t('pontoList.title')}</CardTitle>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Radio className="h-4 w-4" /> {t('pontoList.realtime')}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5"
              />
            ))}
          </div>
        )}
        {!loading && entries.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border/60 bg-secondary/60 px-4 py-5 text-sm text-muted-foreground">
            {t('pontoList.empty')}
          </p>
        )}
        {!loading &&
          entries.map((entry, idx) => {
            const isLast = idx === entries.length - 1
            return (
              <div key={entry.id} className="relative pl-6">
                {!isLast && (
                  <span className="absolute left-3 top-8 block h-full w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />
                )}
                <div className="absolute left-1 top-4 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white/70 bg-primary shadow-[0_6px_18px_-10px_rgba(92,134,255,0.9)] dark:border-card" />
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-card/75 px-4 py-3 shadow-[0_18px_50px_-30px_rgba(92,134,255,0.35)]">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold leading-tight">
                      {typeLabels[entry.type] || entry.type}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      <span>
                        {entry.clocked_at
                          ? format(new Date(entry.clocked_at), 'dd/MM/yyyy HH:mm')
                          : t('pontoList.dateMissing')}
                      </span>
                    </div>
                    {(entry.latitude || entry.longitude) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {entry.latitude}, {entry.longitude}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {entry.source || t('common.sourceFallback')}
                  </span>
                </div>
              </div>
            )
          })}
      </CardContent>
    </Card>
  )
}
