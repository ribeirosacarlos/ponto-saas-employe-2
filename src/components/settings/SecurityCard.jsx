import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useDateTime } from '../../hooks/useDateTime'

const DetailItem = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function SecurityCard({ security, compliance }) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateTime()

  if (!security && !compliance) return null

  return (
    <Card className="border border-border/80 bg-card/90">
      <CardHeader className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t('settingsPage.security.title')}
          </p>
          <CardTitle className="text-lg font-semibold text-foreground">
            {t('settingsPage.security.subtitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('settingsPage.security.helper')}</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <DetailItem
          label={t('settingsPage.security.fields.twoFactor')}
          value={
            security?.two_factor_enabled === null || security?.two_factor_enabled === undefined
              ? null
              : security.two_factor_enabled
                ? t('settingsPage.security.labels.enabled')
                : t('settingsPage.security.labels.disabled')
          }
        />
        <DetailItem
          label={t('settingsPage.security.fields.lastLogin')}
          value={security?.last_login_at ? formatDateTime(security.last_login_at) : null}
        />
        <DetailItem
          label={t('settingsPage.security.fields.logRetention')}
          value={
            compliance?.log_retention_days !== null && compliance?.log_retention_days !== undefined
              ? compliance.log_retention_days
              : null
          }
        />
        <DetailItem
          label={t('settingsPage.security.fields.exportEnabled')}
          value={
            compliance?.export_enabled === null || compliance?.export_enabled === undefined
              ? null
              : compliance.export_enabled
                ? t('settingsPage.security.labels.enabled')
                : t('settingsPage.security.labels.disabled')
          }
        />
      </CardContent>
    </Card>
  )
}
