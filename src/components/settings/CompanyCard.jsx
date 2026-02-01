import { useTranslation } from 'react-i18next'
import { Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useDateTime } from '../../hooks/useDateTime'

const DetailItem = ({ label, value }) => {
  if (!value) return null
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function CompanyCard({ company }) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateTime()

  if (!company) return null

  return (
    <Card className="border border-border/80 bg-card/90">
      <CardHeader className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t('settingsPage.company.title')}
          </p>
          <CardTitle className="text-lg font-semibold text-foreground">
            {company.name || t('settingsPage.company.unknown')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('settingsPage.company.subtitle')}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <DetailItem label={t('settingsPage.company.fields.name')} value={company.name} />
        <DetailItem label={t('settingsPage.company.fields.country')} value={company.country} />
        <DetailItem
          label={t('settingsPage.company.fields.createdAt')}
          value={company.created_at ? formatDateTime(company.created_at) : null}
        />
      </CardContent>
    </Card>
  )
}
