import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, RefreshCcw, Save, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import { resolveSuperAdminError } from '../../features/superAdmin/utils'
import { usePlatformCompanySettings } from '../../hooks/usePlatformCompanySettings'
import { useUpdatePlatformCompanySettings } from '../../hooks/useUpdatePlatformCompanySettings'
import { serializePlatformCompanySettingsPayload } from '../../types/platformCompanySettings'

function AlertBox({ variant = 'info', children, className }) {
  const styles = {
    info: 'border-sky-200/70 bg-sky-50/80 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-50',
    error: 'border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50',
    success:
      'border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50',
  }

  return <div className={cn('rounded-2xl border px-4 py-3 text-sm', styles[variant], className)}>{children}</div>
}

function normalizeFieldErrors(apiErrors = {}) {
  return {
    timezone: apiErrors?.timezone?.join?.(', ') || '',
    audit_logs_enabled: apiErrors?.audit_logs_enabled?.join?.(', ') || '',
    settings: apiErrors?.settings?.join?.(', ') || '',
  }
}

export function AdministrativeSettingsCard({ companyId, enabled = true, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, isLoading, error, reload, setData } = usePlatformCompanySettings(companyId, enabled)
  const { save, isSaving } = useUpdatePlatformCompanySettings(companyId)

  const [formValues, setFormValues] = useState({ timezone: '', audit_logs_enabled: false })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)

  useEffect(() => {
    if (!data) return
    setFormValues({
      timezone: data.timezone || '',
      audit_logs_enabled: data.audit_logs_enabled === true,
    })
    setFieldErrors({})
    setSubmitError('')
  }, [data])

  const hasChanges = useMemo(() => {
    if (!data) return false
    return (
      formValues.timezone !== (data.timezone || '') ||
      formValues.audit_logs_enabled !== (data.audit_logs_enabled === true)
    )
  }, [data, formValues])

  const payload = useMemo(
    () =>
      serializePlatformCompanySettingsPayload(formValues, {
        timezone: data?.timezone || '',
        audit_logs_enabled: data?.audit_logs_enabled === true,
      }),
    [data, formValues],
  )

  const handleReload = async () => {
    setFieldErrors({})
    setSubmitError('')
    try {
      await reload()
    } catch {}
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!companyId || isLoading || isSaving) return

    setFieldErrors({})
    setSubmitError('')

    if (Object.keys(payload).length === 0) {
      const message = t(
        'superAdmin.companyDetails.administrativeSettings.validation.atLeastOne',
        'Altere ao menos uma configuracao antes de salvar.',
      )
      setFieldErrors({ settings: message })
      setSubmitError(message)
      return
    }

    try {
      const response = await save(payload)
      setData(response)
      setLastSavedAt(Date.now())
      onSaved?.(response)
      toast({
        title: t(
          'superAdmin.companyDetails.administrativeSettings.toast.successTitle',
          'Configuracoes salvas',
        ),
        description: t(
          'superAdmin.companyDetails.administrativeSettings.toast.successDescription',
          'As configuracoes administrativas da empresa foram atualizadas.',
        ),
        variant: 'success',
      })
    } catch (err) {
      const apiFieldErrors = normalizeFieldErrors(err?.response?.data?.errors)
      const message =
        apiFieldErrors.settings ||
        apiFieldErrors.timezone ||
        apiFieldErrors.audit_logs_enabled ||
        resolveSuperAdminError(
          err,
          t,
          t(
            'superAdmin.companyDetails.administrativeSettings.toast.errorDescription',
            'Nao foi possivel salvar as configuracoes administrativas.',
          ),
        )

      setFieldErrors(apiFieldErrors)
      setSubmitError(message)
      toast({
        title: t('superAdmin.companyDetails.administrativeSettings.toast.errorTitle', 'Erro ao salvar'),
        description: message,
        variant: 'error',
      })
    }
  }

  const statusCards = [
    {
      key: 'timezone',
      label: t(
        'superAdmin.companyDetails.administrativeSettings.summary.timezone',
        'Timezone atual',
      ),
      value: data?.timezone || '--',
      tone: 'text-foreground',
    },
    {
      key: 'audit',
      label: t(
        'superAdmin.companyDetails.administrativeSettings.summary.audit',
        'Auditoria para admins',
      ),
      value: data?.audit_logs_enabled
        ? t('superAdmin.companyDetails.administrativeSettings.values.enabled', 'Liberada')
        : t('superAdmin.companyDetails.administrativeSettings.values.disabled', 'Bloqueada'),
      tone: data?.audit_logs_enabled ? 'text-emerald-700' : 'text-amber-700',
    },
  ]

  return (
    <Card className="border border-border/80 bg-card/90 shadow-[0_24px_70px_-46px_rgba(72,88,140,0.28)] xl:col-span-3">
      <CardHeader className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t('superAdmin.companyDetails.administrativeSettings.tag', 'Configuracoes')}
          </p>
          <CardTitle className="text-lg font-semibold text-foreground">
            {t(
              'superAdmin.companyDetails.administrativeSettings.title',
              'Configuracoes Administrativas',
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              'superAdmin.companyDetails.administrativeSettings.description',
              'Controle o timezone da empresa e a liberacao de auditoria para administradores da operacao.',
            )}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
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

        <AlertBox variant="info">
          {t(
            'superAdmin.companyDetails.administrativeSettings.helper',
            'As alteracoes valem para a empresa selecionada e seguem as validacoes do backend da plataforma.',
          )}
        </AlertBox>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={`company-settings-skeleton-${index}`}
                className="h-40 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && error ? (
          <AlertBox variant="error">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {t(
                    'superAdmin.companyDetails.administrativeSettings.states.errorTitle',
                    'Erro ao carregar configuracoes',
                  )}
                </p>
                <p className="mt-1">{error}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleReload} disabled={isSaving}>
                <RefreshCcw className="h-4 w-4" />
                {t('superAdmin.shared.actions.retry', 'Tentar novamente')}
              </Button>
            </div>
          </AlertBox>
        ) : null}

        {lastSavedAt && !submitError ? (
          <AlertBox variant="success">
            {t(
              'superAdmin.companyDetails.administrativeSettings.states.saved',
              'Configuracoes administrativas salvas com sucesso.',
            )}
          </AlertBox>
        ) : null}

        {!isLoading && !error ? (
          <form
            className="space-y-5 rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/30 p-4"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-2">
                <Label htmlFor="platform-company-timezone">
                  {t(
                    'superAdmin.companyDetails.administrativeSettings.fields.timezoneLabel',
                    'Timezone da empresa',
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'superAdmin.companyDetails.administrativeSettings.fields.timezoneHint',
                    'Use a lista retornada pela API para definir como datas e horarios da empresa devem ser interpretados.',
                  )}
                </p>
                <div className="rounded-2xl border border-border/70 bg-background/90 px-3 py-2">
                  <select
                    id="platform-company-timezone"
                    className="w-full bg-transparent text-sm text-foreground outline-none"
                    value={formValues.timezone}
                    disabled={isLoading || isSaving}
                    onChange={(event) => {
                      setFormValues((current) => ({ ...current, timezone: event.target.value }))
                      setFieldErrors((current) => ({ ...current, timezone: '', settings: '' }))
                      setSubmitError('')
                    }}
                  >
                    {(data?.available_timezones || []).map((timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.timezone ? (
                  <p className="text-sm text-rose-600 dark:text-rose-300">{fieldErrors.timezone}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="platform-company-audit" className="text-base font-semibold text-foreground">
                          {t(
                            'superAdmin.companyDetails.administrativeSettings.fields.auditLabel',
                            'Permitir visualizacao da auditoria para admins da empresa',
                          )}
                        </Label>
                        <p className="max-w-[52ch] text-sm text-muted-foreground">
                          {t(
                            'superAdmin.companyDetails.administrativeSettings.fields.auditHint',
                            'Quando desabilitado, apenas o super admin podera consultar os logs de auditoria.',
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 self-start rounded-full border border-border/70 bg-background/80 px-3 py-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {formValues.audit_logs_enabled
                            ? t('superAdmin.companyDetails.administrativeSettings.values.enabled', 'Liberada')
                            : t('superAdmin.companyDetails.administrativeSettings.values.disabled', 'Bloqueada')}
                        </span>
                        <Switch
                          id="platform-company-audit"
                          checked={formValues.audit_logs_enabled}
                          disabled={isLoading || isSaving}
                          aria-label={t(
                            'superAdmin.companyDetails.administrativeSettings.fields.auditLabel',
                            'Permitir visualizacao da auditoria para admins da empresa',
                          )}
                          onCheckedChange={(checked) => {
                            setFormValues((current) => ({ ...current, audit_logs_enabled: checked }))
                            setFieldErrors((current) => ({
                              ...current,
                              audit_logs_enabled: '',
                              settings: '',
                            }))
                            setSubmitError('')
                          }}
                        />
                      </div>
                    </div>
                    {fieldErrors.audit_logs_enabled ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {fieldErrors.audit_logs_enabled}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {fieldErrors.settings || submitError ? (
              <AlertBox variant="error">{fieldErrors.settings || submitError}</AlertBox>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <Button type="submit" disabled={isLoading || isSaving || !hasChanges} className="min-w-[132px] rounded-2xl">
                {isSaving ? (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                    {t('superAdmin.companyDetails.administrativeSettings.actions.saving', 'Salvando...')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('superAdmin.companyDetails.administrativeSettings.actions.save', 'Salvar')}
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReload}
                disabled={isLoading || isSaving}
                className="rounded-2xl"
              >
                <RefreshCcw className={cn('mr-2 h-4 w-4', isLoading ? 'animate-spin' : '')} />
                {t('superAdmin.companyDetails.administrativeSettings.actions.reload', 'Recarregar')}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
