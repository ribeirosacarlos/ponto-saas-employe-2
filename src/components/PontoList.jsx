import { CalendarClock, MapPin, Radio } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

const typeLabels = {
  in: 'Entrada',
  out: 'Saída',
}

export function PontoList({ entries = [], loading }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Suas batidas</CardTitle>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-primary">
          <Radio className="h-4 w-4" /> Em tempo real
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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
          <p className="text-sm text-muted-foreground">
            Nenhuma batida registrada ainda. Comece registrando sua jornada.
          </p>
        )}
        {!loading &&
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-4 py-3 shadow-sm"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold">{typeLabels[entry.type] || entry.type}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  <span>
                    {entry.clocked_at
                      ? format(new Date(entry.clocked_at), 'dd/MM/yyyy HH:mm')
                      : 'Data não informada'}
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
                {entry.source || 'web'}
              </span>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}
