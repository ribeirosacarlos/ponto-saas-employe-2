import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, RefreshCcw, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { useToast } from '../ui/use-toast'
import { fetchCompanyGeolocation, updateCompanyGeolocation } from '../../services/companyGeolocationService'

export function GeolocationSettingsCard({ canEdit }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [featureAvailable, setFeatureAvailable] = useState(false)
  const [requiredOnClock, setRequiredOnClock] = useState(false)
  const [initialRequiredOnClock, setInitialRequiredOnClock] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    setValidationError('')

    try {
      const response = await fetchCompanyGeolocation()
      const nextRequired = response?.required_on_clock === true
      setFeatureAvailable(response?.feature_available === true)
      setRequiredOnClock(nextRequired)
      setInitialRequiredOnClock(nextRequired)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t(
          'settingsPage.geolocation.states.errorLoading',
          'Nao foi possivel carregar a configuracao de geolocalizacao.',
        )
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!canEdit) return
    loadSettings()
  }, [canEdit, loadSettings])

  const handleSave = async () => {
    if (!canEdit || loading || saving) return

    setSaving(true)
    setValidationError('')

    try {
      const response = await updateCompanyGeolocation(requiredOnClock)
      const nextRequired = response?.required_on_clock === true
      setFeatureAvailable(response?.feature_available === true)
      setRequiredOnClock(nextRequired)
      setInitialRequiredOnClock(nextRequired)
      toast({
        title: t('settingsPage.geolocation.toast.successTitle', 'Configuracao salva'),
        description: t(
          'settingsPage.geolocation.toast.successDescription',
          'A obrigatoriedade de geolocalizacao no registro de ponto foi atualizada.',
        ),
        variant: 'success',
      })
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {}
      const fieldError = apiErrors?.required_on_clock?.join?.(', ') || apiErrors?.requiredOnClock?.join?.(', ') || ''
      const message =
        fieldError ||
        err?.response?.data?.message ||
        err?.message ||
        t(
          'settingsPage.geolocation.toast.errorDescription',
          'Nao foi possivel salvar a configuracao de geolocalizacao.',
        )

      setValidationError(fieldError)
      toast({
        title: t('settingsPage.geolocation.toast.errorTitle', 'Erro ao salvar'),
        description: message,
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const disabled = !canEdit || loading || saving || !featureAvailable
  const hasChanges = requiredOnClock !== initialRequiredOnClock

  return (
    <Card className="border border-border/80 bg-card/90">
      <CardHeader className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t('settingsPage.geolocation.title', 'Geolocalizacao')}
          </p>
          <CardTitle className="text-lg font-semibold text-foreground">
            {t('settingsPage.geolocation.subtitle', 'Controle de obrigatoriedade no ponto')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              'settingsPage.geolocation.helper',
              'Defina se a localizacao do colaborador deve ser obrigatoria ao registrar o ponto.',
            )}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {t('settingsPage.geolocation.states.loading', 'Carregando configuracao de geolocalizacao...')}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="company-geolocation-required">
                {t(
                  'settingsPage.geolocation.fieldLabel',
                  'Exigir geolocalizacao ao registrar ponto',
                )}
              </Label>
              <p className="text-xs text-muted-foreground">
                {featureAvailable
                  ? t(
                      'settingsPage.geolocation.fieldHint',
                      'Quando ativo, o colaborador precisa permitir localizacao para bater o ponto.',
                    )
                  : t(
                      'settingsPage.geolocation.unavailable',
                      'O plano atual da empresa nao suporta geolocalizacao.',
                    )}
              </p>
            </div>
            <Switch
              id="company-geolocation-required"
              checked={requiredOnClock}
              disabled={disabled}
              aria-label={t(
                'settingsPage.geolocation.fieldLabel',
                'Exigir geolocalizacao ao registrar ponto',
              )}
              onCheckedChange={setRequiredOnClock}
            />
          </div>
          {validationError ? (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{validationError}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={loading || saving || !hasChanges || !canEdit}>
            {saving ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                {t('settingsPage.geolocation.actions.saving', 'Salvando...')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('settingsPage.geolocation.actions.save', 'Salvar')}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={loadSettings} disabled={loading || saving || !canEdit}>
            <RefreshCcw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            {t('settingsPage.geolocation.actions.reload', 'Recarregar')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
