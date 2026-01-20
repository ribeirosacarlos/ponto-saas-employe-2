import { ShieldAlert, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '../components/ui/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

export default function ForbiddenPage({ message, onRetry }) {
  const { t } = useTranslation()

  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-2xl bg-card/90">
        <CardHeader className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 shadow-inner dark:text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500/90">
              {t('access.forbidden.badge')}
            </p>
            <CardTitle className="text-2xl leading-tight">
              {t('access.forbidden.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('access.forbidden.description')}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 px-4 py-3 text-sm text-rose-800 shadow-[0_18px_40px_-30px_rgba(244,63,94,0.45)] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500/90">
                {t('access.shared.details')}
              </p>
              <p className="leading-relaxed">{message}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-5"
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
