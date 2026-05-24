import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Globe2,
  Loader2,
  LocateFixed,
  MapPinned,
  Monitor,
  MonitorSmartphone,
  Pencil,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { DEFAULT_TIMEZONE } from '@/lib/datetime'
import { useAdminDeviceSettings } from '@/hooks/useAdminDeviceSettings'
import { useAdminLocationSettings } from '@/hooks/useAdminLocationSettings'
import { useSettingsOverview } from '@/hooks/useSettingsOverview'
import { useUpdateAdminDeviceSettings } from '@/hooks/useUpdateAdminDeviceSettings'
import { useUpdateAdminLocationSettings } from '@/hooks/useUpdateAdminLocationSettings'
import { fetchCompanyTimezone, updateCompanyTimezone } from '@/services/companyTimezoneService'
import { fetchCompanyGeolocation, updateCompanyGeolocation } from '@/services/companyGeolocationService'
import { useTimezoneStore } from '@/store/useTimezone'
import { serializeAdminDeviceSettingsPayload } from '@/types/adminDeviceSettings'
import {
  createAdminLocationSettingsFormValues,
  serializeAdminLocationSettingsPayload,
} from '@/types/adminLocationSettings'

const EMPTY_LOCATION_FORM = {
  company_latitude: '',
  company_longitude: '',
  allowed_radius_meters: '',
  location_validation_enabled: false,
}

function hasFieldValue(value) {
  return typeof value === 'string' && value.trim() !== ''
}

// ─── shared sub-components ────────────────────────────────────────────────────

function SubSectionLabel({ children }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
      {children}
    </p>
  )
}

function ToggleRow({ icon: Icon, title, description, checked, onCheckedChange, disabled, badge }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-4 py-4', disabled && 'opacity-50')}>
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-medium text-foreground">{title}</p>
            {badge && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5 shrink-0"
      />
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  )
}

function ErrorText({ children }) {
  return <p className="text-[11px] text-rose-600">{children}</p>
}

function LoadingRows({ count = 3 }) {
  return (
    <div className="space-y-4 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-48 animate-pulse rounded bg-muted/70" />
            </div>
          </div>
          <div className="h-5 w-9 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  )
}

// ─── validators ───────────────────────────────────────────────────────────────

function validateLocationForm(values, t) {
  const errors = {}
  const latitude = Number(values.company_latitude)
  const longitude = Number(values.company_longitude)
  const radius = Number(values.allowed_radius_meters)

  if (!values.company_latitude.trim())
    errors.company_latitude = t('settingsPage.locationValidation.validation.latitudeRequired')
  else if (!Number.isFinite(latitude))
    errors.company_latitude = t('settingsPage.locationValidation.validation.latitudeNumber')
  else if (latitude < -90 || latitude > 90)
    errors.company_latitude = t('settingsPage.locationValidation.validation.latitudeRange')

  if (!values.company_longitude.trim())
    errors.company_longitude = t('settingsPage.locationValidation.validation.longitudeRequired')
  else if (!Number.isFinite(longitude))
    errors.company_longitude = t('settingsPage.locationValidation.validation.longitudeNumber')
  else if (longitude < -180 || longitude > 180)
    errors.company_longitude = t('settingsPage.locationValidation.validation.longitudeRange')

  if (!values.allowed_radius_meters.trim())
    errors.allowed_radius_meters = t('settingsPage.locationValidation.validation.radiusRequired')
  else if (!Number.isFinite(radius))
    errors.allowed_radius_meters = t('settingsPage.locationValidation.validation.radiusNumber')
  else if (!Number.isInteger(radius))
    errors.allowed_radius_meters = t('settingsPage.locationValidation.validation.radiusInteger')
  else if (radius < 10 || radius > 5000)
    errors.allowed_radius_meters = t('settingsPage.locationValidation.validation.radiusRange')

  return errors
}

function normalizeFieldErrors(apiErrors = {}) {
  return {
    company_latitude:
      apiErrors?.company_latitude?.join?.(', ') || apiErrors?.companyLatitude?.join?.(', ') || '',
    company_longitude:
      apiErrors?.company_longitude?.join?.(', ') || apiErrors?.companyLongitude?.join?.(', ') || '',
    allowed_radius_meters:
      apiErrors?.allowed_radius_meters?.join?.(', ') ||
      apiErrors?.allowedRadiusMeters?.join?.(', ') ||
      '',
  }
}

// ─── main component ───────────────────────────────────────────────────────────

export function PreferencesSection() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const setStoredTimezone = useTimezoneStore((state) => state.setTimezone)

  const { data, reload } = useSettingsOverview()
  const company = data?.company || null

  const {
    data: deviceSettingsData,
    isLoading: deviceSettingsLoading,
    error: deviceSettingsLoadError,
    reload: reloadDeviceSettings,
    setData: setDeviceSettingsData,
  } = useAdminDeviceSettings(true)

  const {
    data: locationData,
    isLoading: locationLoading,
    error: locationLoadError,
    reload: reloadLocation,
    setData: setLocationData,
  } = useAdminLocationSettings(true)

  const { save: saveDeviceSettings, isSaving: deviceSettingsSaving } = useUpdateAdminDeviceSettings()
  const { save: saveLocationSettings, isSaving: locationSaving } = useUpdateAdminLocationSettings()

  // timezone state
  const [timezoneOptions, setTimezoneOptions] = useState([])
  const [timezoneValue, setTimezoneValue] = useState(company?.timezone || '')
  const [timezoneBaseline, setTimezoneBaseline] = useState(company?.timezone || '')
  const [isTimezoneEditing, setIsTimezoneEditing] = useState(false)
  const [timezoneLoading, setTimezoneLoading] = useState(false)
  const [timezoneSaving, setTimezoneSaving] = useState(false)
  const [timezoneError, setTimezoneError] = useState('')

  // location/device state
  const [locationForm, setLocationForm] = useState(EMPTY_LOCATION_FORM)
  const [locationFieldErrors, setLocationFieldErrors] = useState({})
  const [locationSubmitError, setLocationSubmitError] = useState('')
  const [deviceSettingsError, setDeviceSettingsError] = useState('')
  const [clockRequirementLoading, setClockRequirementLoading] = useState(true)
  const [clockRequirementSaving, setClockRequirementSaving] = useState(false)
  const [clockRequirementError, setClockRequirementError] = useState('')
  const [featureAvailable, setFeatureAvailable] = useState(false)
  const [requiredOnClock, setRequiredOnClock] = useState(false)
  const [initialRequiredOnClock, setInitialRequiredOnClock] = useState(false)
  const [clockDevicePreference, setClockDevicePreference] = useState({ mobile: true, desktop: true })
  const [perimeterExpanded, setPerimeterExpanded] = useState(false)

  useEffect(() => {
    const next = company?.timezone || ''
    if (!isTimezoneEditing) setTimezoneValue(next)
    setTimezoneBaseline(next)
  }, [company?.timezone, isTimezoneEditing])

  useEffect(() => {
    if (!deviceSettingsData) return
    setClockDevicePreference({
      mobile: deviceSettingsData.allow_mobile_clock === true,
      desktop: deviceSettingsData.allow_desktop_clock === true,
    })
    setDeviceSettingsError('')
  }, [deviceSettingsData])

  useEffect(() => {
    if (!locationData) return
    const next = createAdminLocationSettingsFormValues(locationData)
    setLocationForm(next)
    setLocationFieldErrors({})
    setLocationSubmitError('')
    setPerimeterExpanded(hasFieldValue(next.company_latitude) || hasFieldValue(next.company_longitude))
  }, [locationData])

  useEffect(() => {
    let active = true
    ;(async () => {
      setTimezoneLoading(true)
      setTimezoneError('')
      try {
        const res = await fetchCompanyTimezone()
        if (!active) return
        const next = res?.timezone || company?.timezone || ''
        setTimezoneOptions(res?.available_timezones || [])
        setTimezoneBaseline(next)
        if (!isTimezoneEditing) setTimezoneValue(next)
      } catch (err) {
        if (!active) return
        setTimezoneError(
          err?.response?.data?.message || err?.message || t('settingsPage.preferences.states.errorLoading'),
        )
      } finally {
        if (active) setTimezoneLoading(false)
      }
    })()
    return () => { active = false }
  }, [company?.timezone, isTimezoneEditing, t])

  useEffect(() => {
    let active = true
    ;(async () => {
      setClockRequirementLoading(true)
      setClockRequirementError('')
      try {
        const res = await fetchCompanyGeolocation()
        if (!active) return
        const next = res?.required_on_clock === true
        setFeatureAvailable(res?.feature_available === true)
        setRequiredOnClock(next)
        setInitialRequiredOnClock(next)
      } catch (err) {
        if (!active) return
        setClockRequirementError(
          err?.response?.data?.message || err?.message ||
          t('settingsPage.geolocation.states.errorLoading', 'Não foi possível carregar a configuração de geolocalização.'),
        )
      } finally {
        if (active) setClockRequirementLoading(false)
      }
    })()
    return () => { active = false }
  }, [t])

  const timezoneSelectOptions = useMemo(() => {
    const base = [timezoneBaseline, company?.timezone, DEFAULT_TIMEZONE, 'UTC'].filter(Boolean)
    return Array.from(new Set([...(timezoneOptions || []), ...base]))
  }, [company?.timezone, timezoneBaseline, timezoneOptions])

  const timezoneDirty = timezoneValue !== timezoneBaseline
  const validationEnabled = locationForm.location_validation_enabled === true

  const hasLocationChanges = useMemo(() => {
    if (!locationData) return false
    return JSON.stringify(createAdminLocationSettingsFormValues(locationData)) !== JSON.stringify(locationForm)
  }, [locationData, locationForm])

  const hasClockRequirementChanges = requiredOnClock !== initialRequiredOnClock
  const hasDeviceSettingsChanges =
    !!deviceSettingsData &&
    (clockDevicePreference.mobile !== (deviceSettingsData.allow_mobile_clock === true) ||
      clockDevicePreference.desktop !== (deviceSettingsData.allow_desktop_clock === true))
  const hasPendingChanges = hasLocationChanges || hasClockRequirementChanges || hasDeviceSettingsChanges

  const isSavingAny = clockRequirementSaving || locationSaving || deviceSettingsSaving

  // ─── handlers ───────────────────────────────────────────────────────────────

  const handleTimezoneSave = async () => {
    if (!timezoneValue) return
    setTimezoneSaving(true)
    setTimezoneError('')
    try {
      const res = await updateCompanyTimezone(timezoneValue)
      const next = res?.timezone || timezoneValue
      setTimezoneValue(next)
      setTimezoneBaseline(next)
      setTimezoneOptions(res?.available_timezones || timezoneOptions)
      setStoredTimezone(next)
      setIsTimezoneEditing(false)
      await reload()
      toast({
        title: t('settingsPage.preferences.toast.successTitle'),
        description: t('settingsPage.preferences.toast.successDescription'),
        variant: 'success',
      })
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || t('settingsPage.preferences.toast.errorDescription')
      setTimezoneError(msg)
      toast({ title: t('settingsPage.preferences.toast.errorTitle'), description: msg, variant: 'error' })
    } finally {
      setTimezoneSaving(false)
    }
  }

  const handleClockDeviceToggle = (key, checked) => {
    setDeviceSettingsError('')
    setClockDevicePreference((cur) => {
      const next = { ...cur, [key]: checked }
      return !next.mobile && !next.desktop ? cur : next
    })
  }

  const persistDeviceSettings = async () => {
    if (!clockDevicePreference.mobile && !clockDevicePreference.desktop) throw new Error('device_validation_error')
    const res = await saveDeviceSettings(serializeAdminDeviceSettingsPayload(clockDevicePreference))
    setDeviceSettingsData(res)
    setClockDevicePreference({ mobile: res.allow_mobile_clock === true, desktop: res.allow_desktop_clock === true })
  }

  const persistClockRequirement = async () => {
    const res = await updateCompanyGeolocation(requiredOnClock)
    setFeatureAvailable(res?.feature_available === true)
    setRequiredOnClock(res?.required_on_clock === true)
    setInitialRequiredOnClock(res?.required_on_clock === true)
  }

  const persistLocationValidation = async () => {
    const errs = validateLocationForm(locationForm, t)
    if (Object.keys(errs).length) { setLocationFieldErrors(errs); throw new Error('validation_error') }
    const res = await saveLocationSettings(serializeAdminLocationSettingsPayload(locationForm))
    setLocationData(res)
    setLocationForm(createAdminLocationSettingsFormValues(res))
  }

  const handleSave = async () => {
    if (isSavingAny) return
    setClockRequirementError('')
    setLocationSubmitError('')
    setLocationFieldErrors({})
    setDeviceSettingsError('')
    let failed = false

    if (hasDeviceSettingsChanges) {
      try { await persistDeviceSettings() } catch (err) {
        failed = true
        setDeviceSettingsError(
          err?.message === 'device_validation_error'
            ? t('settingsPage.preferences.clockDevice.validation.atLeastOne', 'Ao menos um tipo de dispositivo deve estar ativo.')
            : err?.response?.data?.message || err?.message || t('settingsPage.preferences.clockDevice.toast.errorDescription', 'Não foi possível salvar dispositivos.'),
        )
      }
    }

    if (hasClockRequirementChanges) {
      try {
        setClockRequirementSaving(true)
        await persistClockRequirement()
      } catch (err) {
        failed = true
        setClockRequirementError(
          err?.response?.data?.errors?.required_on_clock?.join?.(', ') ||
          err?.response?.data?.message || err?.message ||
          t('settingsPage.geolocation.toast.errorDescription', 'Não foi possível salvar geolocalização.'),
        )
      } finally { setClockRequirementSaving(false) }
    }

    if (hasLocationChanges) {
      try { await persistLocationValidation() } catch (err) {
        if (err?.message !== 'validation_error') {
          const apiErrs = normalizeFieldErrors(err?.response?.data?.errors)
          if (Object.values(apiErrs).some(Boolean)) setLocationFieldErrors((c) => ({ ...c, ...apiErrs }))
          setLocationSubmitError(err?.response?.data?.message || err?.message || t('settingsPage.locationValidation.toast.errorDescription'))
        }
        failed = true
      }
    }

    if (!failed) {
      toast({
        title: t('settingsPage.locationValidation.toast.successTitle'),
        description: t('settingsPage.settingsSaved', 'As preferências da empresa foram atualizadas.'),
        variant: 'success',
      })
    }
  }

  const handleDiscard = () => {
    if (deviceSettingsData) setClockDevicePreference({ mobile: deviceSettingsData.allow_mobile_clock === true, desktop: deviceSettingsData.allow_desktop_clock === true })
    if (locationData) setLocationForm(createAdminLocationSettingsFormValues(locationData))
    setRequiredOnClock(initialRequiredOnClock)
    setDeviceSettingsError('')
    setLocationFieldErrors({})
    setLocationSubmitError('')
    setClockRequirementError('')
  }

  const handleLocationFieldChange = (field) => (e) => {
    setLocationForm((c) => ({ ...c, [field]: e.target.value ?? '' }))
    setLocationFieldErrors((c) => ({ ...c, [field]: '' }))
    setLocationSubmitError('')
  }

  // ─── derived loading flags ───────────────────────────────────────────────────

  const geoLoading = locationLoading || clockRequirementLoading || deviceSettingsLoading
  const geoLoadError = locationLoadError || deviceSettingsLoadError

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-[13px] font-semibold text-foreground">
          {t('settingsPage.preferences.title', 'Preferências')}
        </h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t('settingsPage.preferences.subtitle', 'Fuso horário, dispositivos e geolocalização da empresa.')}
        </p>
      </div>

      <Separator />

      {/* ── Fuso Horário ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SubSectionLabel>{t('settingsPage.preferences.fields.timezone', 'Fuso horário')}</SubSectionLabel>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          {timezoneLoading ? (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('common.loading', 'Carregando...')}
            </div>
          ) : isTimezoneEditing ? (
            <div className="space-y-3">
              <SelectRoot value={timezoneValue} onValueChange={setTimezoneValue} disabled={timezoneSaving}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('settingsPage.preferences.fields.timezonePlaceholder', 'Selecionar fuso horário...')} />
                </SelectTrigger>
                <SelectContent>
                  {timezoneSelectOptions.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
              {timezoneError && <ErrorText>{timezoneError}</ErrorText>}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleTimezoneSave} disabled={!timezoneDirty || timezoneSaving}>
                  {timezoneSaving ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('common.actions.saving', 'Salvando...')}</>
                  ) : (
                    <><Check className="h-3.5 w-3.5" />{t('common.actions.save', 'Salvar')}</>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => { setIsTimezoneEditing(false); setTimezoneError(''); setTimezoneValue(timezoneBaseline) }}
                  disabled={timezoneSaving}
                  className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('common.actions.cancel', 'Cancelar')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Globe2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-foreground">
                    {timezoneBaseline || t('settingsPage.preferences.states.noTimezone', 'Não definido')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('settingsPage.preferences.helper', 'Fuso horário usado nos registros de ponto.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTimezoneEditing(true)}
                className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Pencil className="h-3 w-3" />
                {t('common.actions.edit', 'Editar')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Dispositivos de ponto ────────────────────────────────────────── */}
      <div className="space-y-3">
        <SubSectionLabel>
          {t('settingsPage.preferences.clockDevice.title', 'Dispositivos para registro')}
        </SubSectionLabel>

        <div className="rounded-xl border border-border/70 overflow-hidden">
          {deviceSettingsLoading ? (
            <div className="p-4"><LoadingRows count={2} /></div>
          ) : (
            <div className="divide-y divide-border/60">
              {[
                { key: 'mobile', Icon: Smartphone, label: t('settingsPage.preferences.clockDevice.options.mobile', 'Celular') },
                { key: 'desktop', Icon: Monitor, label: t('settingsPage.preferences.clockDevice.options.desktop', 'Computador') },
              ].map(({ key, Icon, label }) => (
                <div key={key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-[12px] font-medium text-foreground">{label}</p>
                  </div>
                  <Switch
                    checked={clockDevicePreference[key]}
                    disabled={deviceSettingsSaving || !deviceSettingsData}
                    onCheckedChange={(v) => handleClockDeviceToggle(key, v)}
                    aria-label={label}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {deviceSettingsError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {deviceSettingsError}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          {t('settingsPage.preferences.clockDevice.helper', 'Ao menos um tipo de dispositivo deve permanecer ativo.')}
        </p>
      </div>

      {/* ── Geolocalização ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SubSectionLabel>{t('settingsPage.geolocation.title', 'Geolocalização')}</SubSectionLabel>

        {geoLoading ? (
          <div className="rounded-xl border border-border/70 p-4">
            <LoadingRows count={3} />
          </div>
        ) : geoLoadError ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{geoLoadError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (deviceSettingsLoadError) reloadDeviceSettings().catch(() => {})
                if (locationLoadError) reloadLocation().catch(() => {})
              }}
              className="shrink-0 font-medium underline underline-offset-2 hover:text-rose-900 transition-colors"
            >
              {t('settingsPage.locationValidation.actions.reload', 'Recarregar')}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 overflow-hidden">
            <div className="divide-y divide-border/60">

              {/* Exigir geo ao bater ponto */}
              <ToggleRow
                icon={LocateFixed}
                title={t('settingsPage.geolocation.fieldLabel', 'Exigir geolocalização no registro')}
                description={
                  featureAvailable
                    ? t('settingsPage.geolocation.fieldHint', 'O colaborador deve permitir localização para bater o ponto.')
                    : t('settingsPage.geolocation.unavailable', 'O plano atual não suporta geolocalização obrigatória.')
                }
                checked={requiredOnClock}
                onCheckedChange={setRequiredOnClock}
                disabled={clockRequirementSaving || !featureAvailable}
                badge={!featureAvailable ? t('settingsPage.geolocation.planRequired', 'Plano necessário') : undefined}
              />

              {/* Validação de localização + raio expandível */}
              <div>
                <ToggleRow
                  icon={ShieldCheck}
                  title={t('settingsPage.locationValidation.title', 'Validação de localização')}
                  description={t('settingsPage.locationValidation.fields.locationValidationEnabledHint', 'Verifica se o colaborador está dentro do perímetro da empresa.')}
                  checked={validationEnabled}
                  onCheckedChange={(v) => {
                    setLocationForm((c) => ({ ...c, location_validation_enabled: v }))
                    setLocationFieldErrors((c) => ({ ...c, location_validation_enabled: '' }))
                    setLocationSubmitError('')
                  }}
                  disabled={locationSaving}
                />
                {validationEnabled && (
                  <div className="px-4 pb-4">
                    <div className="ml-11 space-y-1.5">
                      <FieldLabel>
                        {t('settingsPage.locationValidation.fields.allowedRadiusMeters', 'Raio permitido (metros)')}
                      </FieldLabel>
                      <Input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min="10"
                        max="5000"
                        value={locationForm.allowed_radius_meters}
                        onChange={handleLocationFieldChange('allowed_radius_meters')}
                        disabled={locationSaving}
                        placeholder="Ex: 200"
                        className={cn('max-w-[180px]', locationFieldErrors.allowed_radius_meters && 'border-rose-400')}
                      />
                      {locationFieldErrors.allowed_radius_meters && (
                        <ErrorText>{locationFieldErrors.allowed_radius_meters}</ErrorText>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {t('settingsPage.locationValidation.radiusHint', 'Entre 10 e 5000 metros.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Perímetro da empresa + campos expandíveis */}
              <div>
                <ToggleRow
                  icon={MapPinned}
                  title={t('settingsPage.locationValidation.sectionLabel', 'Definir perímetro da empresa')}
                  description={t('settingsPage.locationValidation.description', 'Latitude, longitude e raio de referência da sede.')}
                  checked={perimeterExpanded}
                  onCheckedChange={setPerimeterExpanded}
                  disabled={false}
                />
                {perimeterExpanded && (
                  <div className="px-4 pb-4 pt-2">
                    <div className="ml-11 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <FieldLabel>{t('settingsPage.locationValidation.fields.companyLatitude', 'Latitude')}</FieldLabel>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={locationForm.company_latitude}
                          onChange={handleLocationFieldChange('company_latitude')}
                          disabled={locationSaving}
                          placeholder={t('settingsPage.locationValidation.placeholders.companyLatitude', 'Ex: -23.5505')}
                          className={cn(locationFieldErrors.company_latitude && 'border-rose-400')}
                        />
                        {locationFieldErrors.company_latitude && (
                          <ErrorText>{locationFieldErrors.company_latitude}</ErrorText>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <FieldLabel>{t('settingsPage.locationValidation.fields.companyLongitude', 'Longitude')}</FieldLabel>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={locationForm.company_longitude}
                          onChange={handleLocationFieldChange('company_longitude')}
                          disabled={locationSaving}
                          placeholder={t('settingsPage.locationValidation.placeholders.companyLongitude', 'Ex: -46.6333')}
                          className={cn(locationFieldErrors.company_longitude && 'border-rose-400')}
                        />
                        {locationFieldErrors.company_longitude && (
                          <ErrorText>{locationFieldErrors.company_longitude}</ErrorText>
                        )}
                      </div>

                      {!validationEnabled && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <FieldLabel>{t('settingsPage.locationValidation.fields.allowedRadiusMeters', 'Raio (metros)')}</FieldLabel>
                          <Input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="10"
                            max="5000"
                            value={locationForm.allowed_radius_meters}
                            onChange={handleLocationFieldChange('allowed_radius_meters')}
                            disabled={locationSaving}
                            placeholder="Ex: 200"
                            className={cn('max-w-[180px]', locationFieldErrors.allowed_radius_meters && 'border-rose-400')}
                          />
                          {locationFieldErrors.allowed_radius_meters && (
                            <ErrorText>{locationFieldErrors.allowed_radius_meters}</ErrorText>
                          )}
                        </div>
                      )}
                    </div>

                    {!hasFieldValue(locationForm.company_latitude) && !hasFieldValue(locationForm.company_longitude) && (
                      <div className="ml-11 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {t('settingsPage.locationValidation.alerts.incomplete', 'Defina as coordenadas para ativar a validação por perímetro.')}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {clockRequirementError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {clockRequirementError}
          </div>
        )}
        {locationSubmitError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {locationSubmitError}
          </div>
        )}
      </div>

      {/* ── Barra de alterações pendentes ───────────────────────────────── */}
      {hasPendingChanges && (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
          <div className="flex flex-1 items-center gap-2 text-[12px] text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {t('settingsPage.pendingChangesTitle', 'Você tem alterações não salvas.')}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSavingAny}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {t('common.actions.discard', 'Descartar')}
            </button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isSavingAny}>
              {isSavingAny ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('common.actions.saving', 'Salvando...')}</>
              ) : (
                t('common.actions.save', 'Salvar')
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
