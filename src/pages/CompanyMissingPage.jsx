import { Building2, Info, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '../components/ui/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

export default function CompanyMissingPage({ message, onRetry }) {
  const { t } = useTranslation()

  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-2xl bg-card/90">
        <CardHeader className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 shadow-inner dark:text-amber-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500/90">
              {t('access.companyMissing.badge')}
            </p>
            <CardTitle className="text-2xl leading-tight">
              {t('access.companyMissing.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('access.companyMissing.description')}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="flex gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 shadow-[0_18px_40px_-30px_rgba(245,158,11,0.45)] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-300" />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500/90">
                  {t('access.shared.details')}
                </p>
                <p className="leading-relaxed">{message}</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="default"
              className="rounded-full"
              onClick={onRetry}
              disabled={!onRetry}
            >
              <RefreshCw className="h-4 w-4" />
              {t('access.shared.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
