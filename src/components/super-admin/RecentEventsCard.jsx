import { BellRing } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { formatSuperAdminDateTime } from '../../features/superAdmin/utils'

export function RecentEventsCard({ t, events = [], locale }) {
  return (
    <Card className="rounded-[28px] border-border/80 bg-card/95 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t('superAdmin.dashboard.events.eyebrow', 'Eventos')}
            </p>
            <CardTitle className="mt-1 text-base">{t('superAdmin.dashboard.events.title', 'Eventos recentes')}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                'superAdmin.dashboard.events.description',
                'Feed consolidado pelo backend a partir de auditoria, empresas e assinaturas.',
              )}
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BellRing className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.slice(0, 6).map((event) => (
              <div key={event.id} className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{event.title || event.type}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[event.companyName, event.description].filter(Boolean).join(' • ') || '--'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatSuperAdminDateTime(event.occurredAt, locale)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-8 text-sm text-muted-foreground">
            {t('superAdmin.dashboard.events.empty', 'Nenhum evento recente disponível.')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
