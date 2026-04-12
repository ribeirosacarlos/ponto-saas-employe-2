import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, MapPin, RefreshCcw, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import { useAdminLocationSettings } from '../../hooks/useAdminLocationSettings'
import { useUpdateAdminLocationSettings } from '../../hooks/useUpdateAdminLocationSettings'
import { fetchCompanyGeolocation, updateCompanyGeolocation } from '../../services/companyGeolocationService'
import {
  createAdminLocationSettingsFormValues,
  serializeAdminLocationSettingsPayload,
} from '../../types/adminLocationSettings'

const EMPTY_FORM = {
  company_latitude: '',
  company_longitude: '',
  allowed_radius_meters: '',
  location_validation_enabled: false,
}

const ALERT_STYLES = {
  warning:
    'border-amber-300/70 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50',
  error:
    'border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50',
  info:
    'border-sky-200/70 bg-sky-50/80 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-50',
  success:
    'border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50',
}

function AlertBox({ variant = 'info', children, className }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', ALERT_STYLES[variant], className)}>
      {children}
    </div>
  )
}

function normalizeFieldErrors(apiErrors = {}) {
  return {
    company_latitude:
      apiErrors?.company_latitude?.join?.(', ') || apiErrors?.companyLatitude?.join?.(', ') || '',
    company_longitude:
      apiErrors?.company_longitude?.join?.(', ') || apiErrors?.companyLongitude?.join?.(', ') || '',
    allowed_radius_meters:
      apiErrors?.allowed_radius_meters?.join?.(', ') || apiErrors?.allowedRadiusMeters?.join?.(', ') || '',
    location_validation_enabled:
      apiErrors?.location_validation_enabled?.join?.(', ') || apiErrors?.locationValidationEnabled?.join?.(', ') || '',
  }
}

function validateForm(values, t) {
  const errors = {}
  const latitude = Number(values.company_latitude)
  const longitude = Number(values.company_longitude)
  const radius = Number(values.allowed_radius_meters)

  if (!values.company_latitude.trim()) {
    errors.company_latitude = t('settingsPage.locationValidation.validation.latitudeRequired')
  } else if (!Number.isFinite(latitude)) {
    errors.company_latitude = t('settingsPage.locationValidation.validation.latitudeNumber')
  } else if (latitude < -90 || latitude > 90) {
    errors.company_latitude = t('settingsPage.locationValidation.validation.latitudeRange')
  }

  if (!values.company_longitude.trim()) {
    errors.company_longitude = t('settingsPage.locationValidation.validation.longitudeRequired')
  } else if (!Number.isFinite(longitude)) {
    errors.company_longitude = t('settingsPage.locationValidation.validation.longitudeNumber')
  } else if (longitude < -180 || longitude > 180) {
    errors.company_longitude = t('settingsPage.locationValidation.validation.longitudeRange')
  }

  if (!values.allowed_radius_meters.trim()) {
    errors.allowed_radius_meters = t('settingsPage.locationValidation.validation.radiusRequired')
  } else if (!Number.isFinite(radius)) {
    errors.allowed_radius_meters = t('settingsPage.locationValidation.validation.radiusNumber')
  } else if (!Number.isInteger(radius)) {
    errors.allowed_radius_meters = t('settingsPage.locationValidation.validation.radiusInteger')
  } else if (radius < 10 || radius > 5000) {
    errors.allowed_radius_meters = t('settingsPage.locationValidation.validation.radiusRange')
  }

  return errors
}

function hasFieldValue(value) {
  return typeof value === 'string' && value.trim() !== ''
}

export function GeolocationSettingsCard({ canEdit }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, isLoading, error, reload, setData } = useAdminLocationSettings(canEdit)
  const { save, isSaving } = useUpdateAdminLocationSettings()

  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [clockRequirementLoading, setClockRequirementLoading] = useState(true)
  const [clockRequirementSaving, setClockRequirementSaving] = useState(false)
  const [clockRequirementError, setClockRequirementError] = useState('')
  const [featureAvailable, setFeatureAvailable] = useState(false)
  const [requiredOnClock, setRequiredOnClock] = useState(false)
  const [initialRequiredOnClock, setInitialRequiredOnClock] = useState(false)

  useEffect(() => {
    if (!data) return
    setFormValues(createAdminLocationSettingsFormValues(data))
    setFieldErrors({})
    setSubmitError('')
  }, [data])

  useEffect(() => {
    if (!canEdit) {
      setClockRequirementLoading(false)
      return
    }

    let active = true

    const loadClockRequirement = async () => {
      setClockRequirementLoading(true)
      setClockRequirementError('')

      try {
        const response = await fetchCompanyGeolocation()
        if (!active) return
        const nextRequired = response?.required_on_clock === true
        setFeatureAvailable(response?.feature_available === true)
        setRequiredOnClock(nextRequired)
        setInitialRequiredOnClock(nextRequired)
      } catch (err) {
        if (!active) return
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t(
            'settingsPage.geolocation.states.errorLoading',
            'Nao foi possivel carregar a configuracao de geolocalizacao no registro de ponto.',
          )
        setClockRequirementError(message)
      } finally {
        if (active) {
          setClockRequirementLoading(false)
        }
      }
    }

    loadClockRequirement()

    return () => {
      active = false
    }
  }, [canEdit, t])

  const isConfigured = useMemo(
    () => hasFieldValue(formValues.company_latitude) && hasFieldValue(formValues.company_longitude),
    [formValues.company_latitude, formValues.company_longitude],
  )

  const hasChanges = useMemo(() => {
    if (!data) return false
    const initial = createAdminLocationSettingsFormValues(data)
    return JSON.stringify(initial) !== JSON.stringify(formValues)
  }, [data, formValues])

  const handleChange = (field) => (event) => {
    const nextValue = event?.target?.value ?? ''
    setFormValues((current) => ({ ...current, [field]: nextValue }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setSubmitError('')
  }

  const handleSwitchChange = (checked) => {
    setFormValues((current) => ({ ...current, location_validation_enabled: checked }))
    setFieldErrors((current) => ({ ...current, location_validation_enabled: '' }))
    setSubmitError('')
  }

  const handleReload = async () => {
    setSubmitError('')
    setFieldErrors({})
    try {
      await reload()
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('settingsPage.locationValidation.errors.load')
      setSubmitError(message)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canEdit || isLoading || isSaving) return

    const nextErrors = validateForm(formValues, t)
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')

    try {
      const response = await save(serializeAdminLocationSettingsPayload(formValues))
      setData(response)
      setFormValues(createAdminLocationSettingsFormValues(response))
      setLastSavedAt(Date.now())
      toast({
        title: t('settingsPage.locationValidation.toast.successTitle'),
        description: t('settingsPage.locationValidation.toast.successDescription'),
        variant: 'success',
      })
    } catch (err) {
      const apiErrors = normalizeFieldErrors(err?.response?.data?.errors)
      const hasApiFieldErrors = Object.values(apiErrors).some(Boolean)
      const message =
        err?.response?.data?.message ||
        t('settingsPage.locationValidation.toast.errorDescription')

      if (hasApiFieldErrors) {
        setFieldErrors((current) => ({ ...current, ...apiErrors }))
      }

      setSubmitError(message)
      toast({
        title: t('settingsPage.locationValidation.toast.errorTitle'),
        description: message,
        variant: 'error',
      })
    }
  }

  const handleSaveClockRequirement = async () => {
    if (!canEdit || clockRequirementLoading || clockRequirementSaving) return

    setClockRequirementSaving(true)
    setClockRequirementError('')

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
          'A obrigatoriedade de geolocalizacao ao registrar ponto foi atualizada.',
        ),
        variant: 'success',
      })
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {}
      const fieldError =
        apiErrors?.required_on_clock?.join?.(', ') ||
        apiErrors?.requiredOnClock?.join?.(', ') ||
        ''
      const message =
        fieldError ||
        err?.response?.data?.message ||
        err?.message ||
        t(
          'settingsPage.geolocation.toast.errorDescription',
          'Nao foi possivel salvar a configuracao de geolocalizacao no registro de ponto.',
        )
      setClockRequirementError(message)
      toast({
        title: t('settingsPage.geolocation.toast.errorTitle', 'Erro ao salvar'),
        description: message,
        variant: 'error',
      })
    } finally {
      setClockRequirementSaving(false)
    }
  }

  const hasClockRequirementChanges = requiredOnClock !== initialRequiredOnClock
  const validationEnabled = formValues.location_validation_enabled === true
  const statusCards = [
    {
      key: 'validation',
      label: t('settingsPage.locationValidation.fields.locationValidationEnabled'),
      value: validationEnabled
        ? t('settingsPage.preferences.enabled', 'Ativo')
        : t('settingsPage.preferences.disabled', 'Inativo'),
      tone: validationEnabled ? 'text-emerald-700' : 'text-muted-foreground',
    },
    {
      key: 'configured',
      label: t('settingsPage.locationValidation.states.configuration', 'Configuracao'),
      value: isConfigured
        ? t('settingsPage.locationValidation.states.configured', 'Completa')
        : t('settingsPage.locationValidation.states.notConfigured', 'Incompleta'),
      tone: isConfigured ? 'text-emerald-700' : 'text-amber-700',
    },
    {
      key: 'radius',
      label: t('settingsPage.locationValidation.fields.allowedRadiusMeters'),
      value: formValues.allowed_radius_meters
        ? `${formValues.allowed_radius_meters} m`
        : t('settingsPage.locationValidation.states.notDefined', 'Nao definido'),
      tone: 'text-foreground',
    },
  ]

  return (
    <Card className="border border-border/80 bg-card/90 shadow-[0_24px_70px_-46px_rgba(72,88,140,0.28)]">
      <CardHeader className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t('settingsPage.locationValidation.eyebrow')}
          </p>
          <CardTitle className="text-lg font-semibold text-foreground">
            {t('settingsPage.locationValidation.title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('settingsPage.locationValidation.description')}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          {statusCards.map((item) => (
            <div
              key={item.key}
              className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 shadow-[0_12px_30px_-24px_rgba(72,88,140,0.35)]"
            >
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <p className={cn('mt-1 text-sm font-semibold', item.tone)}>{item.value}</p>
            </div>
          ))}
        </div>

        <AlertBox variant="info" className="rounded-2xl">
          {t('settingsPage.locationValidation.helper')}
        </AlertBox>

        {isLoading ? (
          <AlertBox variant="info">
            {t('settingsPage.locationValidation.states.loading')}
          </AlertBox>
        ) : null}

        {!isLoading && error ? (
          <AlertBox variant="error">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{t('settingsPage.locationValidation.states.errorTitle')}</p>
                <p className="mt-1">{error}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleReload} disabled={isSaving}>
                <RefreshCcw className="h-4 w-4" />
                {t('settingsPage.locationValidation.actions.reload')}
              </Button>
            </div>
          </AlertBox>
        ) : null}

        {!isLoading && !isConfigured ? (
          <AlertBox variant="warning">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('settingsPage.locationValidation.alerts.incomplete')}</p>
            </div>
          </AlertBox>
        ) : null}

        {!isLoading && formValues.location_validation_enabled && !isConfigured ? (
          <AlertBox variant="error">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('settingsPage.locationValidation.alerts.enabledWithoutCoordinates')}</p>
            </div>
          </AlertBox>
        ) : null}

        {lastSavedAt ? (
          <AlertBox variant="success">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p>{t('settingsPage.locationValidation.states.saved')}</p>
            </div>
          </AlertBox>
        ) : null}

        {submitError && !error ? <AlertBox variant="error">{submitError}</AlertBox> : null}

        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {t('settingsPage.geolocation.sectionLabel', 'Registro de ponto')}
                  </p>
                  <Label htmlFor="company-geolocation-required" className="text-base font-semibold text-foreground">
                    {t(
                      'settingsPage.geolocation.fieldLabel',
                      'Exigir geolocalizacao ao registrar ponto',
                    )}
                  </Label>
                  <p className="max-w-[52ch] text-sm text-muted-foreground">
                    {featureAvailable
                      ? t(
                          'settingsPage.geolocation.fieldHint',
                          'Quando ativo, o colaborador precisa permitir localizacao para bater o ponto.',
                        )
                      : t(
                          'settingsPage.geolocation.unavailable',
                          'O plano atual da empresa nao suporta geolocalizacao obrigatoria no registro.',
                        )}
                  </p>
                </div>
                <div className="flex items-center gap-3 self-start rounded-full border border-border/70 bg-background/80 px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {requiredOnClock
                      ? t('settingsPage.preferences.enabled', 'Ativo')
                      : t('settingsPage.preferences.disabled', 'Inativo')}
                  </span>
                  <Switch
                    id="company-geolocation-required"
                    checked={requiredOnClock}
                    disabled={!canEdit || clockRequirementLoading || clockRequirementSaving || !featureAvailable}
                    aria-label={t(
                      'settingsPage.geolocation.fieldLabel',
                      'Exigir geolocalizacao ao registrar ponto',
                    )}
                    onCheckedChange={setRequiredOnClock}
                  />
                </div>
              </div>

              {clockRequirementLoading ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    'settingsPage.geolocation.states.loading',
                    'Carregando configuracao de geolocalizacao no registro de ponto...',
                  )}
                </p>
              ) : null}

              {clockRequirementError ? (
                <p className="text-sm text-rose-600 dark:text-rose-300">{clockRequirementError}</p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSaveClockRequirement}
                  disabled={
                    !canEdit ||
                    clockRequirementLoading ||
                    clockRequirementSaving ||
                    !hasClockRequirementChanges ||
                    !featureAvailable
                  }
                >
                  {clockRequirementSaving ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      {t('settingsPage.geolocation.actions.saving', 'Salvando...')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('settingsPage.geolocation.actions.save', 'Salvar exigencia')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <form className="space-y-4 rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/30 p-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {t('settingsPage.locationValidation.sectionLabel', 'Perimetro da empresa')}
              </p>
              <Label htmlFor="location-validation-enabled" className="text-base font-semibold text-foreground">
                {t('settingsPage.locationValidation.fields.locationValidationEnabled')}
              </Label>
              <p className="max-w-[56ch] text-sm text-muted-foreground">
                {t('settingsPage.locationValidation.fields.locationValidationEnabledHint')}
              </p>
            </div>
            <div className="flex items-center gap-3 self-start rounded-full border border-border/70 bg-background/80 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {validationEnabled
                  ? t('settingsPage.preferences.enabled', 'Ativo')
                  : t('settingsPage.preferences.disabled', 'Inativo')}
              </span>
              <Switch
                id="location-validation-enabled"
                checked={validationEnabled}
                disabled={!canEdit || isLoading || isSaving}
                aria-label={t('settingsPage.locationValidation.fields.locationValidationEnabled')}
                onCheckedChange={handleSwitchChange}
              />
            </div>
          </div>

          {fieldErrors.location_validation_enabled ? (
            <p className="text-sm text-rose-600 dark:text-rose-300">
              {fieldErrors.location_validation_enabled}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-latitude">
                {t('settingsPage.locationValidation.fields.companyLatitude')}
              </Label>
              <Input
                id="company-latitude"
                name="company_latitude"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={t('settingsPage.locationValidation.placeholders.companyLatitude')}
                value={formValues.company_latitude}
                onChange={handleChange('company_latitude')}
                disabled={!canEdit || isLoading || isSaving}
                className="h-12 rounded-2xl bg-background/90"
              />
              {fieldErrors.company_latitude ? (
                <p className="text-sm text-rose-600 dark:text-rose-300">{fieldErrors.company_latitude}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-longitude">
                {t('settingsPage.locationValidation.fields.companyLongitude')}
              </Label>
              <Input
                id="company-longitude"
                name="company_longitude"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={t('settingsPage.locationValidation.placeholders.companyLongitude')}
                value={formValues.company_longitude}
                onChange={handleChange('company_longitude')}
                disabled={!canEdit || isLoading || isSaving}
                className="h-12 rounded-2xl bg-background/90"
              />
              {fieldErrors.company_longitude ? (
                <p className="text-sm text-rose-600 dark:text-rose-300">{fieldErrors.company_longitude}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowed-radius-meters">
              {t('settingsPage.locationValidation.fields.allowedRadiusMeters')}
            </Label>
            <Input
              id="allowed-radius-meters"
              name="allowed_radius_meters"
              type="number"
              inputMode="numeric"
              step="1"
              min="10"
              max="5000"
              placeholder={t('settingsPage.locationValidation.placeholders.allowedRadiusMeters')}
              value={formValues.allowed_radius_meters}
              onChange={handleChange('allowed_radius_meters')}
              disabled={!canEdit || isLoading || isSaving}
              className="h-12 rounded-2xl bg-background/90"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'settingsPage.locationValidation.radiusHint',
                'Use um raio entre 10 e 5000 metros para definir a area esperada da empresa.',
              )}
            </p>
            {fieldErrors.allowed_radius_meters ? (
              <p className="text-sm text-rose-600 dark:text-rose-300">{fieldErrors.allowed_radius_meters}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <Button type="submit" disabled={!canEdit || isLoading || isSaving || !hasChanges} className="min-w-[132px] rounded-2xl">
              {isSaving ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  {t('settingsPage.locationValidation.actions.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('settingsPage.locationValidation.actions.save')}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReload}
              disabled={!canEdit || isLoading || isSaving}
              className="rounded-2xl"
            >
              <RefreshCcw className={cn('mr-2 h-4 w-4', isLoading ? 'animate-spin' : '')} />
              {t('settingsPage.locationValidation.actions.reload')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
