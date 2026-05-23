import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CreditCard,
  Globe2,
  Loader2,
  LocateFixed,
  MapPinned,
  Monitor,
  MonitorSmartphone,
  Smartphone,
  Shield,
  ShieldCheck,
} from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { TimezoneCombobox } from '../components/ui/timezone-combobox'
import { Switch } from '../components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { DEFAULT_TIMEZONE } from '../lib/datetime'
import { useDateTime } from '../hooks/useDateTime'
import { useAdminDeviceSettings } from '../hooks/useAdminDeviceSettings'
import { useAdminLocationSettings } from '../hooks/useAdminLocationSettings'
import { useSettingsOverview } from '../hooks/useSettingsOverview'
import { useSettingsSubscription } from '../hooks/useSettingsSubscription'
import { useUpdateAdminDeviceSettings } from '../hooks/useUpdateAdminDeviceSettings'
import { useUpdateAdminLocationSettings } from '../hooks/useUpdateAdminLocationSettings'
import { fetchCompanyTimezone, updateCompanyTimezone } from '../services/companyTimezoneService'
import { fetchCompanyGeolocation, updateCompanyGeolocation } from '../services/companyGeolocationService'
import { useAuthStore } from '../store/useAuth'
import { useTimezoneStore } from '../store/useTimezone'
import { serializeAdminDeviceSettingsPayload } from '../types/adminDeviceSettings'
import {
  createAdminLocationSettingsFormValues,
  serializeAdminLocationSettingsPayload,
} from '../types/adminLocationSettings'

const EMPTY_LOCATION_FORM = {
  company_latitude: '',
  company_longitude: '',
  allowed_radius_meters: '',
  location_validation_enabled: false,
}

const STATUS_BADGES = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  trialing: 'border-sky-200 bg-sky-50 text-sky-700',
  canceling: 'border-amber-200 bg-amber-50 text-amber-700',
  past_due: 'border-amber-200 bg-amber-50 text-amber-700',
  canceled: 'border-rose-200 bg-rose-50 text-rose-700',
  default: 'border-slate-200 bg-slate-100 text-slate-600',
}

const LINE_BUTTON_CLASS =
  'inline-flex h-8 items-center rounded-md px-2.5 text-[11px] font-semibold text-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:text-muted-foreground'

function hasFieldValue(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function formatCurrency(value, currency = 'BRL') {
  if (value === null || value === undefined || value === '') return '--'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value) / 100)
}

function getIntervalSuffix(interval, t) {
  if (interval === 'year') return t('access.subscription.perInterval.year', '/ano')
  if (interval === 'one_time') return t('access.subscription.perInterval.oneTime', 'pagamento unico')
  return t('access.subscription.perInterval.month', '/mes')
}

function getCycleLabel(interval, t) {
  if (interval === 'year') return t('settingsPage.plan.cycle.yearly', 'Anual')
  if (interval === 'one_time') return t('settingsPage.plan.cycle.oneTime', 'Unico')
  return t('settingsPage.plan.cycle.monthly', 'Mensal')
}

function resolveSubscriptionState(subscription) {
  const rawStatus = String(
    subscription?.status || subscription?.subscription_status || '',
  ).toLowerCase()
  const scheduledCancellation = subscription?.cancel_at_period_end === true
  const planActive = subscription?.is_plan_active

  if (rawStatus === 'canceled' || rawStatus === 'cancelled' || planActive === false) {
    return 'canceled'
  }

  if (scheduledCancellation || rawStatus === 'canceling' || rawStatus === 'cancelling') {
    return 'canceling'
  }

  if (rawStatus === 'trialing') return 'trialing'
  if (rawStatus === 'past_due') return 'past_due'
  if (rawStatus === 'active') return 'active'

  return 'active'
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
      apiErrors?.location_validation_enabled?.join?.(', ') ||
      apiErrors?.locationValidationEnabled?.join?.(', ') ||
      '',
  }
}

function validateLocationForm(values, t) {
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

function Section({ label, title, children }) {
  return (
    <Card className="border border-border/80 bg-card/90">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span>{label}</span>
        </div>
        {title ? <CardTitle className="mt-1 text-base">{title}</CardTitle> : null}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

function RowAction({ children, className, ...props }) {
  return (
    <button type="button" className={cn(LINE_BUTTON_CLASS, className)} {...props}>
      {children}
    </button>
  )
}

function SettingRow({
  icon: Icon,
  title,
  description,
  control,
  children,
  expanded = false,
  error,
  className,
}) {
  return (
    <div className={cn('border-b border-border/70 py-5 last:border-b-0', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
        </div>
        {control ? <div className="sm:pl-6">{control}</div> : null}
      </div>

      <div
        className={cn(
          'overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out',
          expanded ? 'mt-4 max-h-[420px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        {children}
      </div>
    </div>
  )
}

function InlineField({ label, children, hint, error }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  )
}

function MinimalSelect({ className, ...props }) {
  return <Select className={cn('bg-white disabled:bg-muted/40', className)} {...props} />
}

function InlineNotice({ children, tone = 'default' }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2 text-sm',
        tone === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-700',
        tone === 'default' && 'border-border/70 bg-muted/30 text-muted-foreground',
      )}
    >
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { formatDate } = useDateTime()
  const setStoredTimezone = useTimezoneStore((state) => state.setTimezone)
  const roles = useAuthStore((state) => state.roles)

  const canEditPreferences = useMemo(
    () => Array.isArray(roles) && roles.some((role) => ['admin', 'super_admin'].includes(role)),
    [roles],
  )

  const { data, isLoading, error, reload } = useSettingsOverview()
  const {
    data: managedSubscription,
    isLoading: subscriptionLoading,
    isCancelling,
    error: subscriptionError,
    cancel,
  } = useSettingsSubscription(canEditPreferences)
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

  const billing = data?.billing || null
  const usage = data?.usage || null
  const links = data?.links || null
  const company = data?.company || null
  const plan = billing?.plan || {}
  const overviewSubscription = billing?.subscription || {}
  const activeSubscription = managedSubscription || overviewSubscription
  const subscriptionStatusKey = resolveSubscriptionState(activeSubscription)
  const subscriptionStatusLabel =
    subscriptionStatusKey === 'active'
      ? t('settingsPage.subscription.status.active')
      : subscriptionStatusKey === 'canceling'
        ? t('settingsPage.subscription.status.canceling')
        : subscriptionStatusKey === 'canceled'
          ? t('settingsPage.subscription.status.canceled')
          : activeSubscription?.status_label ||
            activeSubscription?.status ||
            t('settingsPage.plan.status.unknown')

  const billableUsers = usage?.billable_users || usage?.employees || {}
  const hasUserLimit = billableUsers.limit !== null && billableUsers.limit !== undefined
  const usagePercent = hasUserLimit
    ? Math.min(100, Math.round(((billableUsers.current || 0) / (billableUsers.limit || 1)) * 100))
    : 0

  const [isSubscriptionManagementOpen, setIsSubscriptionManagementOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [timezoneOptions, setTimezoneOptions] = useState([])
  const [timezoneValue, setTimezoneValue] = useState(company?.timezone || '')
  const [timezoneBaseline, setTimezoneBaseline] = useState(company?.timezone || '')
  const [isTimezoneEditing, setIsTimezoneEditing] = useState(false)
  const [timezoneLoading, setTimezoneLoading] = useState(false)
  const [timezoneSaving, setTimezoneSaving] = useState(false)
  const [timezoneError, setTimezoneError] = useState('')

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
  const [clockDevicePreference, setClockDevicePreference] = useState({
    mobile: true,
    desktop: true,
  })
  const [perimeterExpanded, setPerimeterExpanded] = useState(false)

  useEffect(() => {
    const nextTimezone = company?.timezone || ''
    if (!isTimezoneEditing) {
      setTimezoneValue(nextTimezone)
    }
    setTimezoneBaseline(nextTimezone)
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
    const nextForm = createAdminLocationSettingsFormValues(locationData)
    setLocationForm(nextForm)
    setLocationFieldErrors({})
    setLocationSubmitError('')
    setPerimeterExpanded(
      hasFieldValue(nextForm.company_latitude) || hasFieldValue(nextForm.company_longitude),
    )
  }, [locationData])

  useEffect(() => {
    let active = true

    const loadTimezones = async () => {
      setTimezoneLoading(true)
      setTimezoneError('')

      try {
        const response = await fetchCompanyTimezone()
        if (!active) return
        const nextTimezone = response?.timezone || company?.timezone || ''
        setTimezoneOptions(response?.available_timezones || [])
        setTimezoneBaseline(nextTimezone)
        if (!isTimezoneEditing) {
          setTimezoneValue(nextTimezone)
        }
      } catch (err) {
        if (!active) return
        setTimezoneError(
          err?.response?.data?.message ||
            err?.message ||
            t('settingsPage.preferences.states.errorLoading'),
        )
      } finally {
        if (active) {
          setTimezoneLoading(false)
        }
      }
    }

    loadTimezones()

    return () => {
      active = false
    }
  }, [company?.timezone, isTimezoneEditing, t])

  useEffect(() => {
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
        setClockRequirementError(
          err?.response?.data?.message ||
            err?.message ||
            t(
              'settingsPage.geolocation.states.errorLoading',
              'Nao foi possivel carregar a configuracao de geolocalizacao no registro de ponto.',
            ),
        )
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
  }, [t])

  const timezoneSelectOptions = useMemo(() => {
    const base = [timezoneBaseline, company?.timezone, DEFAULT_TIMEZONE, 'UTC'].filter(Boolean)
    return Array.from(new Set([...(timezoneOptions || []), ...base]))
  }, [company?.timezone, timezoneBaseline, timezoneOptions])
  const timezoneDirty = timezoneValue !== timezoneBaseline
  const validationEnabled = locationForm.location_validation_enabled === true
  const validationMode =
    hasFieldValue(locationForm.company_latitude) && hasFieldValue(locationForm.company_longitude)
      ? 'complete'
      : 'simple'

  const hasLocationChanges = useMemo(() => {
    if (!locationData) return false
    const initial = createAdminLocationSettingsFormValues(locationData)
    return JSON.stringify(initial) !== JSON.stringify(locationForm)
  }, [locationData, locationForm])

  const hasClockRequirementChanges = requiredOnClock !== initialRequiredOnClock
  const hasDeviceSettingsChanges =
    !!deviceSettingsData &&
    (clockDevicePreference.mobile !== (deviceSettingsData.allow_mobile_clock === true) ||
      clockDevicePreference.desktop !== (deviceSettingsData.allow_desktop_clock === true))
  const hasPendingGeolocationChanges =
    hasLocationChanges || hasClockRequirementChanges || hasDeviceSettingsChanges

  const accessUntil = activeSubscription?.access_expires_at || activeSubscription?.current_period_end || null
  const cancelDisabled =
    !canEditPreferences ||
    subscriptionLoading ||
    isCancelling ||
    subscriptionStatusKey === 'canceling' ||
    subscriptionStatusKey === 'canceled'

  const clockDeviceOptions = useMemo(
    () => [
      {
        key: 'mobile',
        label: t('settingsPage.preferences.clockDevice.options.mobile'),
        icon: Smartphone,
      },
      {
        key: 'desktop',
        label: t('settingsPage.preferences.clockDevice.options.desktop'),
        icon: Monitor,
      },
    ],
    [t],
  )

  const handleTimezoneSave = async () => {
    if (!timezoneValue || !canEditPreferences) return

    setTimezoneSaving(true)
    setTimezoneError('')

    try {
      const response = await updateCompanyTimezone(timezoneValue)
      const nextTimezone = response?.timezone || timezoneValue
      setTimezoneValue(nextTimezone)
      setTimezoneBaseline(nextTimezone)
      setTimezoneOptions(response?.available_timezones || timezoneOptions)
      setStoredTimezone(nextTimezone)
      setIsTimezoneEditing(false)
      await reload()
      toast({
        title: t('settingsPage.preferences.toast.successTitle'),
        description: t('settingsPage.preferences.toast.successDescription'),
        variant: 'success',
      })
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('settingsPage.preferences.toast.errorDescription')
      setTimezoneError(message)
      toast({
        title: t('settingsPage.preferences.toast.errorTitle'),
        description: message,
        variant: 'error',
      })
    } finally {
      setTimezoneSaving(false)
    }
  }

  const handleClockDeviceToggle = (deviceKey, checked) => {
    setDeviceSettingsError('')
    setClockDevicePreference((current) => {
      const next = { ...current, [deviceKey]: checked }
      if (!next.mobile && !next.desktop) {
        return current
      }
      return next
    })
  }

  const persistDeviceSettings = async () => {
    if (!clockDevicePreference.mobile && !clockDevicePreference.desktop) {
      throw new Error('device_validation_error')
    }

    const response = await saveDeviceSettings(
      serializeAdminDeviceSettingsPayload(clockDevicePreference),
    )
    setDeviceSettingsData(response)
    setClockDevicePreference({
      mobile: response.allow_mobile_clock === true,
      desktop: response.allow_desktop_clock === true,
    })
  }

  const persistClockRequirement = async () => {
    const response = await updateCompanyGeolocation(requiredOnClock)
    const nextRequired = response?.required_on_clock === true
    setFeatureAvailable(response?.feature_available === true)
    setRequiredOnClock(nextRequired)
    setInitialRequiredOnClock(nextRequired)
  }

  const persistLocationValidation = async () => {
    const nextErrors = validateLocationForm(locationForm, t)
    if (Object.keys(nextErrors).length) {
      setLocationFieldErrors(nextErrors)
      throw new Error('validation_error')
    }

    const response = await saveLocationSettings(
      serializeAdminLocationSettingsPayload(locationForm),
    )
    setLocationData(response)
    setLocationForm(createAdminLocationSettingsFormValues(response))
  }

  const handleSaveGeolocationChanges = async () => {
    if (!canEditPreferences || clockRequirementSaving || locationSaving || deviceSettingsSaving) return

    setClockRequirementError('')
    setLocationSubmitError('')
    setLocationFieldErrors({})
    setDeviceSettingsError('')

    let failed = false

    if (hasDeviceSettingsChanges) {
      try {
        await persistDeviceSettings()
      } catch (err) {
        failed = true
        setDeviceSettingsError(
          err?.message === 'device_validation_error'
            ? t(
                'settingsPage.preferences.clockDevice.validation.atLeastOne',
                'E necessario permitir ao menos um tipo de dispositivo para registro de ponto.',
              )
            : err?.response?.data?.message ||
                err?.message ||
                t(
                  'settingsPage.preferences.clockDevice.toast.errorDescription',
                  'Nao foi possivel salvar a configuracao de dispositivos para o registro de ponto.',
                ),
        )
      }
    }

    if (hasClockRequirementChanges) {
      try {
        setClockRequirementSaving(true)
        await persistClockRequirement()
      } catch (err) {
        failed = true
        const message =
          err?.response?.data?.errors?.required_on_clock?.join?.(', ') ||
          err?.response?.data?.errors?.requiredOnClock?.join?.(', ') ||
          err?.response?.data?.message ||
          err?.message ||
          t(
            'settingsPage.geolocation.toast.errorDescription',
            'Nao foi possivel salvar a configuracao de geolocalizacao no registro de ponto.',
          )
        setClockRequirementError(message)
      } finally {
        setClockRequirementSaving(false)
      }
    }

    if (hasLocationChanges) {
      try {
        await persistLocationValidation()
      } catch (err) {
        if (err?.message !== 'validation_error') {
          const apiErrors = normalizeFieldErrors(err?.response?.data?.errors)
          if (Object.values(apiErrors).some(Boolean)) {
            setLocationFieldErrors((current) => ({ ...current, ...apiErrors }))
          }
          setLocationSubmitError(
            err?.response?.data?.message ||
              err?.message ||
              t('settingsPage.locationValidation.toast.errorDescription'),
          )
        }
        failed = true
      }
    }

    if (!failed) {
      toast({
        title: t('settingsPage.locationValidation.toast.successTitle'),
        description: t('settingsPage.settingsSaved', 'As preferencias da empresa foram atualizadas.'),
        variant: 'success',
      })
    }
  }

  const handleDiscardGeolocationChanges = () => {
    if (deviceSettingsData) {
      setClockDevicePreference({
        mobile: deviceSettingsData.allow_mobile_clock === true,
        desktop: deviceSettingsData.allow_desktop_clock === true,
      })
    }
    if (locationData) {
      setLocationForm(createAdminLocationSettingsFormValues(locationData))
    }
    setRequiredOnClock(initialRequiredOnClock)
    setDeviceSettingsError('')
    setLocationFieldErrors({})
    setLocationSubmitError('')
    setClockRequirementError('')
  }

  const handleLocationFieldChange = (field) => (event) => {
    const nextValue = event?.target?.value ?? ''
    setLocationForm((current) => ({ ...current, [field]: nextValue }))
    setLocationFieldErrors((current) => ({ ...current, [field]: '' }))
    setLocationSubmitError('')
  }

  const handleValidationToggle = (checked) => {
    setLocationForm((current) => ({ ...current, location_validation_enabled: checked }))
    setLocationFieldErrors((current) => ({ ...current, location_validation_enabled: '' }))
    setLocationSubmitError('')
  }

  const handleCancelSubscription = async () => {
    try {
      const response = await cancel()
      const nextDate = response?.access_expires_at || response?.current_period_end || accessUntil
      setIsCancelDialogOpen(false)
      toast({
        title: t('settingsPage.subscription.toast.successTitle'),
        description: nextDate
          ? t('settingsPage.subscription.toast.successDescription', { date: formatDate(nextDate) })
          : t('settingsPage.subscription.toast.successDescriptionFallback'),
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: t('settingsPage.subscription.toast.errorTitle'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('settingsPage.subscription.toast.errorDescription'),
        variant: 'error',
      })
    }
  }

  return (
    <>
      <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      <PageContainer className="py-6 pb-24">
        <div className="mx-auto max-w-[680px] space-y-6">
          <AppTopBar
            icon={<Bell className="h-5 w-5" />}
            eyebrow={t('settingsPage.badge')}
            title={t('settingsPage.title', 'Configuracoes')}
            subtitle={t('settingsPage.subtitle')}
          />

          <Section
            label={t('settingsPage.plan.title', 'Plano')}
            title={t('settingsPage.plan.subtitle', 'Status da assinatura e uso da empresa.')}
          >
            {isLoading ? (
              <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('settingsPage.loading')}
              </div>
            ) : billing ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                      <h2 className="text-xl font-medium text-foreground">
                        {plan?.name || t('settingsPage.plan.unknown')}
                      </h2>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                          STATUS_BADGES[subscriptionStatusKey] || STATUS_BADGES.default,
                        )}
                      >
                        {subscriptionStatusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {t('settingsPage.plan.labels.price', 'Preco')}{' '}
                      <span className="text-foreground">
                        {`${formatCurrency(plan?.price_cents, plan?.currency || 'BRL')}${getIntervalSuffix(plan?.billing_interval, t)}`}
                      </span>
                    </span>
                    <span className="text-border">|</span>
                    <span>
                      {t('settingsPage.plan.labels.interval', 'Ciclo')}{' '}
                      <span className="text-foreground">{getCycleLabel(plan?.billing_interval, t)}</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">
                      {hasUserLimit
                        ? t('settingsPage.plan.usage.withLimit', {
                            current: billableUsers.current ?? 0,
                            limit: billableUsers.limit ?? 0,
                          })
                        : t('settingsPage.plan.usage.withoutLimit', {
                            current: billableUsers.current ?? 0,
                          })}
                    </span>
                    {billableUsers.over_limit ? (
                      <span className="text-xs font-medium text-amber-700">
                        {t('settingsPage.plan.usage.overLimit')}
                      </span>
                    ) : null}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        billableUsers.over_limit ? 'bg-amber-500' : 'bg-primary',
                      )}
                      style={{ width: `${hasUserLimit ? usagePercent : 24}%` }}
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEditPreferences}
                    onClick={() => setIsSubscriptionManagementOpen(true)}
                    className="rounded-full border-border/70 bg-transparent shadow-none"
                  >
                    {t('settingsPage.actions.manageSubscription', 'Gerenciar assinatura')}
                  </Button>
                </div>

                {accessUntil ? (
                  <p className="text-sm text-muted-foreground">
                    {subscriptionStatusKey === 'canceling'
                      ? t('settingsPage.subscription.scheduledAccessUntil', {
                          date: formatDate(accessUntil),
                        })
                      : t('settingsPage.subscription.accessUntil', { date: formatDate(accessUntil) })}
                  </p>
                ) : null}

                {subscriptionError ? <InlineNotice tone="error">{subscriptionError}</InlineNotice> : null}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {error || t('settingsPage.plan.empty')}
                </p>
                {error ? (
                  <RowAction onClick={reload}>
                    {t('settingsPage.preferences.actions.reload', 'Recarregar')}
                  </RowAction>
                ) : null}
              </div>
            )}
          </Section>

          {/*
            Secao de seguranca ocultada temporariamente.
            Mantida aqui para facilitar a reativacao quando o fluxo voltar.
          */}
          {false ? (
            <Section
              label={t('settingsPage.security.title', 'Seguranca')}
              title={t('settingsPage.security.heading', 'Contas e acessos')}
            >
              <div>
                <SettingRow
                  icon={ShieldCheck}
                  title={t('settingsPage.security.mfa')}
                  description={t('settingsPage.security.mfaHint')}
                  control={
                    <Button type="button" variant="outline" size="sm" className="border-border/70 bg-transparent shadow-none">
                      {t('settingsPage.actions.manage', 'Gerenciar')}
                    </Button>
                  }
                />
                <SettingRow
                  icon={Shield}
                  title={t('settingsPage.security.sessions')}
                  description={t('settingsPage.security.sessionsHint')}
                  control={
                    <Button type="button" variant="outline" size="sm" className="border-border/70 bg-transparent shadow-none">
                      {t('settingsPage.actions.view', 'Ver')}
                    </Button>
                  }
                />
              </div>
            </Section>
          ) : null}

          <Section
            label={t('settingsPage.preferences.title', 'Preferencias')}
            title={t(
              'settingsPage.preferences.subtitle',
              'Zona horaria, acesso de ponto e geolocalizacao da empresa.',
            )}
          >
            <div>
              <SettingRow
                icon={Globe2}
                title={t('settingsPage.preferences.fields.timezone')}
                description={timezoneValue || t('settingsPage.preferences.states.noTimezone')}
                error={timezoneError}
                expanded={isTimezoneEditing}
                control={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEditPreferences || timezoneLoading}
                    onClick={() => setIsTimezoneEditing((current) => !current)}
                    className="rounded-full border-border/70 bg-transparent shadow-none"
                  >
                    {t('settingsPage.preferences.actions.edit', 'Editar')}
                  </Button>
                }
              >
                <div className="space-y-4 pl-12">
                  <InlineField
                    label={t('settingsPage.preferences.fields.timezone')}
                    hint={t('settingsPage.preferences.helper')}
                  >
                    <TimezoneCombobox
                      value={timezoneValue}
                      onChange={setTimezoneValue}
                      options={timezoneSelectOptions}
                      disabled={timezoneLoading || timezoneSaving}
                      placeholder={t('settingsPage.preferences.fields.timezonePlaceholder')}
                    />
                  </InlineField>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!timezoneDirty || timezoneSaving || timezoneLoading}
                      onClick={handleTimezoneSave}
                      className="rounded-full border-border/70 bg-transparent shadow-none"
                    >
                      {timezoneSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('settingsPage.preferences.actions.save', 'Salvar')}
                        </>
                      ) : (
                        t('settingsPage.preferences.actions.save', 'Salvar')
                      )}
                    </Button>
                    <RowAction
                      disabled={timezoneSaving}
                      onClick={() => {
                        setIsTimezoneEditing(false)
                        setTimezoneError('')
                        setTimezoneValue(timezoneBaseline)
                      }}
                    >
                      {t('common.actions.cancel', 'Cancelar')}
                    </RowAction>
                  </div>
                </div>
              </SettingRow>

              <SettingRow
                icon={MonitorSmartphone}
                title={t(
                  'settingsPage.preferences.clockDevice.title',
                  'Dispositivo permitido para bater ponto',
                )}
                description={t(
                  'settingsPage.preferences.clockDevice.description',
                  'Escolha onde os colaboradores podem registrar o ponto. Pelo menos uma opcao deve estar ativa.',
                )}
                expanded
                error={deviceSettingsError}
              >
                <div className="space-y-3 pl-12">
                  {clockDeviceOptions.map((option) => {
                    const Icon = option.icon
                    const checked = clockDevicePreference[option.key]

                    return (
                      <div
                        key={option.key}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">{option.label}</p>
                        </div>
                        <Switch
                          checked={checked}
                          disabled={
                            !canEditPreferences ||
                            deviceSettingsLoading ||
                            deviceSettingsSaving ||
                            !deviceSettingsData
                          }
                          className="h-5 w-9 [&>span]:h-3.5 [&>span]:w-3.5"
                          aria-label={option.label}
                          onCheckedChange={(nextChecked) =>
                            handleClockDeviceToggle(option.key, nextChecked)
                          }
                        />
                      </div>
                    )
                  })}

                  <p className="text-xs text-muted-foreground">
                    {t(
                      'settingsPage.preferences.clockDevice.helper',
                      'Pelo menos uma forma de registro deve permanecer ativa.',
                    )}
                  </p>
                </div>
              </SettingRow>

              <SettingRow
                icon={LocateFixed}
                title={t(
                  'settingsPage.geolocation.fieldLabel',
                  'Exigir geolocalizacao ao registrar ponto',
                )}
                description={
                  featureAvailable
                    ? t(
                        'settingsPage.geolocation.fieldHint',
                        'Quando ativo, o colaborador precisa permitir localizacao para bater o ponto.',
                      )
                    : t(
                        'settingsPage.geolocation.unavailable',
                        'O plano atual da empresa nao suporta geolocalizacao obrigatoria no registro.',
                      )
                }
                error={clockRequirementError}
                control={
                  <Switch
                    checked={requiredOnClock}
                    disabled={
                      !canEditPreferences ||
                      clockRequirementLoading ||
                      clockRequirementSaving ||
                      !featureAvailable
                    }
                    aria-label={t(
                      'settingsPage.geolocation.fieldLabel',
                      'Exigir geolocalizacao ao registrar ponto',
                    )}
                    onCheckedChange={setRequiredOnClock}
                  />
                }
              />

              <SettingRow
                icon={ShieldCheck}
                title={t('settingsPage.locationValidation.title', 'Validacao de localizacao')}
                description={t(
                  'settingsPage.locationValidation.fields.locationValidationEnabledHint',
                )}
                error={locationFieldErrors.location_validation_enabled}
                expanded={validationEnabled}
                control={
                  <Switch
                    checked={validationEnabled}
                    disabled={!canEditPreferences || locationLoading || locationSaving}
                    aria-label={t('settingsPage.locationValidation.fields.locationValidationEnabled')}
                    onCheckedChange={handleValidationToggle}
                  />
                }
              >
                <div className="grid gap-4 pl-12 sm:grid-cols-2">
                  <InlineField
                    label={t('settingsPage.locationValidation.mode', 'Configuracao')}
                    hint={t(
                      'settingsPage.locationValidation.modeHint',
                      'A configuracao atual e derivada dos dados ja cadastrados.',
                    )}
                  >
                    <MinimalSelect value={validationMode} disabled>
                      <option value="complete">
                        {t('settingsPage.locationValidation.modeComplete', 'Completa')}
                      </option>
                      <option value="simple">
                        {t('settingsPage.locationValidation.modeSimple', 'Simples')}
                      </option>
                    </MinimalSelect>
                  </InlineField>

                  <InlineField
                    label={t(
                      'settingsPage.locationValidation.fields.allowedRadiusMeters',
                      'Raio permitido em metros',
                    )}
                    error={locationFieldErrors.allowed_radius_meters}
                  >
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="10"
                      max="5000"
                      value={locationForm.allowed_radius_meters}
                      onChange={handleLocationFieldChange('allowed_radius_meters')}
                      disabled={!canEditPreferences || locationLoading || locationSaving}
                      className="h-11 rounded-xl bg-white shadow-none"
                    />
                  </InlineField>
                </div>
              </SettingRow>

              <SettingRow
                icon={MapPinned}
                title={t('settingsPage.locationValidation.sectionLabel', 'Perimetro da empresa')}
                description={t(
                  'settingsPage.locationValidation.description',
                  'Defina latitude, longitude e o raio usado como referencia da empresa.',
                )}
                expanded={perimeterExpanded}
                control={
                  <Switch
                    checked={perimeterExpanded}
                    aria-label={t('settingsPage.locationValidation.sectionLabel', 'Perimetro da empresa')}
                    onCheckedChange={setPerimeterExpanded}
                  />
                }
              >
                <div className="space-y-4 pl-12">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InlineField
                      label={t('settingsPage.locationValidation.fields.companyLatitude')}
                      error={locationFieldErrors.company_latitude}
                    >
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={locationForm.company_latitude}
                        onChange={handleLocationFieldChange('company_latitude')}
                        disabled={!canEditPreferences || locationLoading || locationSaving}
                        className="h-11 rounded-xl bg-white shadow-none"
                        placeholder={t('settingsPage.locationValidation.placeholders.companyLatitude')}
                      />
                    </InlineField>

                    <InlineField
                      label={t('settingsPage.locationValidation.fields.companyLongitude')}
                      error={locationFieldErrors.company_longitude}
                    >
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={locationForm.company_longitude}
                        onChange={handleLocationFieldChange('company_longitude')}
                        disabled={!canEditPreferences || locationLoading || locationSaving}
                        className="h-11 rounded-xl bg-white shadow-none"
                        placeholder={t('settingsPage.locationValidation.placeholders.companyLongitude')}
                      />
                    </InlineField>
                  </div>

                  <InlineField
                    label={t(
                      'settingsPage.locationValidation.fields.allowedRadiusMeters',
                      'Raio permitido em metros',
                    )}
                    hint={t(
                      'settingsPage.locationValidation.radiusHint',
                      'Use um raio entre 10 e 5000 metros.',
                    )}
                    error={locationFieldErrors.allowed_radius_meters}
                  >
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="10"
                      max="5000"
                      value={locationForm.allowed_radius_meters}
                      onChange={handleLocationFieldChange('allowed_radius_meters')}
                      disabled={!canEditPreferences || locationLoading || locationSaving}
                      className="h-11 rounded-xl bg-white shadow-none"
                      placeholder={t('settingsPage.locationValidation.placeholders.allowedRadiusMeters')}
                    />
                  </InlineField>
                </div>
              </SettingRow>
            </div>

            <div className="space-y-3 pt-3">
              {locationLoading || clockRequirementLoading || deviceSettingsLoading ? (
                <InlineNotice>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {deviceSettingsLoading
                        ? t(
                            'settingsPage.preferences.clockDevice.states.loading',
                            'Carregando configuracao de dispositivos...',
                          )
                        : t('settingsPage.locationValidation.states.loading')}
                    </span>
                  </div>
                </InlineNotice>
              ) : null}

              {locationLoadError || deviceSettingsLoadError ? (
                <InlineNotice tone="error">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{deviceSettingsLoadError || locationLoadError}</span>
                    <RowAction
                      onClick={() => {
                        if (deviceSettingsLoadError) {
                          reloadDeviceSettings().catch(() => {})
                        }
                        if (locationLoadError) {
                          reloadLocation().catch(() => {})
                        }
                      }}
                    >
                      {t('settingsPage.locationValidation.actions.reload', 'Recarregar')}
                    </RowAction>
                  </div>
                </InlineNotice>
              ) : null}

              {!locationLoading && !hasFieldValue(locationForm.company_latitude) && !hasFieldValue(locationForm.company_longitude) ? (
                <InlineNotice tone="warning">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{t('settingsPage.locationValidation.alerts.incomplete')}</span>
                  </div>
                </InlineNotice>
              ) : null}

              {locationSubmitError ? <InlineNotice tone="error">{locationSubmitError}</InlineNotice> : null}
            </div>
          </Section>
        </div>
      </PageContainer>
      </div>

      {hasPendingGeolocationChanges ? (
        <div className="fixed inset-x-0 bottom-5 z-40 px-4">
          <div className="mx-auto flex max-w-[680px] flex-col gap-3 rounded-2xl border border-border/80 bg-white/95 px-4 py-3 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.25)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('settingsPage.pendingChangesTitle', 'Alteracoes pendentes')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'settingsPage.pendingChangesDescription',
                    'Salve ou descarte as preferencias de registro e geolocalizacao antes de sair da pagina.',
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <RowAction
                disabled={clockRequirementSaving || locationSaving || deviceSettingsSaving}
                onClick={handleDiscardGeolocationChanges}
              >
                {t('common.actions.cancel', 'Cancelar')}
              </RowAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  !canEditPreferences ||
                  clockRequirementSaving ||
                  locationSaving ||
                  deviceSettingsSaving
                }
                onClick={handleSaveGeolocationChanges}
                className="rounded-full border-border/70 bg-transparent shadow-none"
              >
                {clockRequirementSaving || locationSaving || deviceSettingsSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('settingsPage.locationValidation.actions.saving', 'Salvando...')}
                  </>
                ) : (
                  t('settingsPage.locationValidation.actions.save', 'Salvar')
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={isSubscriptionManagementOpen} onOpenChange={setIsSubscriptionManagementOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settingsPage.actions.manageSubscription', 'Gerenciar assinatura')}</DialogTitle>
            <DialogDescription>
              {t(
                'settingsPage.subscription.manageDescription',
                'Abra o portal de cobranca ou solicite o cancelamento da renovacao automatica.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{plan?.name || t('settingsPage.plan.unknown')}</p>
              {accessUntil ? (
                <p className="mt-1">
                  {subscriptionStatusKey === 'canceling'
                    ? t('settingsPage.subscription.scheduledAccessUntil', {
                        date: formatDate(accessUntil),
                      })
                    : t('settingsPage.subscription.accessUntil', { date: formatDate(accessUntil) })}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start rounded-xl border-border/70 bg-transparent shadow-none"
                disabled={!links?.customer_portal_url}
                onClick={() => window.location.assign(links.customer_portal_url)}
              >
                {t('settingsPage.plan.actions.portal', 'Portal do cliente')}
              </Button>

              <button
                type="button"
                className="text-left text-sm font-medium text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:text-rose-300"
                disabled={cancelDisabled}
                onClick={() => {
                  setIsSubscriptionManagementOpen(false)
                  setIsCancelDialogOpen(true)
                }}
              >
                {isCancelling
                  ? t('settingsPage.subscription.actions.cancelling')
                  : t('settingsPage.subscription.actions.cancel')}
              </button>
            </div>

            {subscriptionError ? <InlineNotice tone="error">{subscriptionError}</InlineNotice> : null}
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="shadow-none">
                {t('common.actions.close', 'Fechar')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settingsPage.subscription.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('settingsPage.subscription.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>{t('settingsPage.subscription.dialog.keepAccess')}</p>
            <p className="mt-2">{t('settingsPage.subscription.dialog.blockAfter')}</p>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="shadow-none">
                {t('common.actions.cancel', 'Cancelar')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="secondary"
              disabled={isCancelling}
              onClick={handleCancelSubscription}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('settingsPage.subscription.actions.cancelling')}
                </>
              ) : (
                t('settingsPage.subscription.dialog.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
