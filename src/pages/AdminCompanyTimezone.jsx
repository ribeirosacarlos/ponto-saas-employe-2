import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CheckCircle2,
  Clock4,
  Globe2,
  HelpCircle,
  Info,
  RefreshCcw,
  Save,
} from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { cn } from '../lib/utils'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { fetchCompanyTimezone, updateCompanyTimezone } from '../services/companyTimezoneService'

const REQUIRED_ACCESS = { anyOf: ['admin', 'super_admin'] }

const ErrorBanner = ({ message, onRetry }) => {
  if (!message) return null
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <p className="text-sm font-semibold">Erro</p>
      </div>
      <p className="text-sm">{message}</p>
      {onRetry ? (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default function AdminCompanyTimezone({ sidebarOpen = false, onToggleSidebar = () => {} }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, REQUIRED_ACCESS), [capabilities])

  void sidebarOpen
  void onToggleSidebar

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timezone, setTimezone] = useState('')
  const [availableTimezones, setAvailableTimezones] = useState([])
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredTimezones = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return availableTimezones
    return availableTimezones.filter((tz) => tz.toLowerCase().includes(term))
  }, [availableTimezones, searchTerm])

  const loadTimezone = useCallback(async () => {
    setLoading(true)
    setError('')
    setValidationErrors({})
    try {
      const response = await fetchCompanyTimezone()
      const nextTz = response.timezone || ''
      setTimezone(nextTz)
      setSearchTerm(nextTz)
      setAvailableTimezones(Array.isArray(response.available_timezones) ? response.available_timezones : [])
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('adminTimezonePage.states.errorLoading', 'Não foi possível carregar o fuso horário.')
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (hasAccess) {
      loadTimezone()
    }
  }, [hasAccess, loadTimezone])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!hasAccess || !timezone) return
    setSaving(true)
    setValidationErrors({})
    try {
      const response = await updateCompanyTimezone(timezone)
      const savedTz = response.timezone || timezone
      setTimezone(savedTz)
      setSearchTerm(savedTz)
      setAvailableTimezones(Array.isArray(response.available_timezones) ? response.available_timezones : [])
      toast({
        title: t('adminTimezonePage.toast.successTitle', 'Fuso horário atualizado'),
        description: t('adminTimezonePage.toast.successDescription', 'A empresa agora usa o novo timezone.'),
        variant: 'success',
      })
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {}
      setValidationErrors(apiErrors)
      const message =
        apiErrors?.timezone?.join?.(', ') ||
        err?.response?.data?.message ||
        err?.message ||
        t('adminTimezonePage.toast.errorDescription', 'Não foi possível salvar o timezone.')
      toast({
        title: t('adminTimezonePage.toast.errorTitle', 'Erro ao salvar'),
        description: message,
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!hasAccess) {
    return (
      <PageContainer className="py-6">
        <div className="rounded-3xl border border-amber-200/70 bg-amber-50/80 p-6 text-amber-800 shadow-md dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <h1 className="text-lg font-semibold">
              {t('adminTimezonePage.states.noPermissionTitle', 'Apenas administradores podem acessar')}
            </h1>
          </div>
          <p className="mt-2 text-sm">
            {t(
              'adminTimezonePage.states.noPermissionDescription',
              'Este painel é restrito a usuários com papel de administrador.',
            )}
          </p>
        </div>
      </PageContainer>
    )
  }

  const timezoneError = validationErrors?.timezone

  return (
    <PageContainer className="py-6">
      <div className="flex flex-col gap-5">
        <AppTopBar
          icon={<Globe2 className="h-5 w-5" />}
          eyebrow={t('sidebar.sections.admin')}
          title={t('adminTimezonePage.title', 'Fuso horário da empresa')}
          subtitle={t(
            'adminTimezonePage.subtitle',
            'Somente admins podem ajustar como horários são exibidos e interpretados nos filtros.',
          )}
          actions={
            <Button
              type="button"
              variant="outline"
              disabled={loading || saving}
              onClick={loadTimezone}
              className="rounded-full border-border bg-background/80 px-3 text-sm"
            >
              <RefreshCcw className="mr-2 h-4 w-4 text-primary" />
              {t('adminTimezonePage.actions.reload', 'Recarregar')}
            </Button>
          }
        />

        <Card className="border border-border/80 bg-card/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Clock4 className="h-5 w-5" />
              {t('adminTimezonePage.form.title', 'Configurar timezone')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error ? <ErrorBanner message={error} onRetry={loadTimezone} /> : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label htmlFor="company-timezone">
                      {t('adminTimezonePage.form.fieldLabel', 'Timezone da empresa (para exibição e filtros)')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        'adminTimezonePage.form.fieldHint',
                        'O backend aplica este timezone em listagens, relatórios e exportações.',
                      )}
                    </p>
                  </div>
                  <HelpCircle
                    className="h-4 w-4 text-muted-foreground"
                    aria-label={t(
                      'adminTimezonePage.form.tooltipLabel',
                      'Ajuda sobre timezone da empresa',
                    )}
                    title={t(
                      'adminTimezonePage.form.tooltip',
                      'Este valor define como séries de data/hora aparecem e são interpretadas no ASP.NET (Europe/Madrid para empresas espanholas).',
                    )}
                  />
                </div>
                <div className="relative">
                  <Input
                    id="company-timezone"
                    name="timezone"
                    className="mt-1"
                    value={searchTerm}
                    autoComplete="off"
                    placeholder={t('adminTimezonePage.form.placeholder', 'Selecione ou digite um timezone')}
                    disabled={loading || saving}
                    onChange={(event) => {
                      setSearchTerm(event.target.value)
                      setTimezone(event.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                    required
                  />
                  {showSuggestions ? (
                    <ul className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-lg border border-border/80 bg-card/95 shadow-2xl backdrop-blur">
                      {filteredTimezones.length ? (
                        filteredTimezones.map((tz) => (
                          <li key={tz}>
                            <button
                              type="button"
                              className={cn(
                                'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-primary/10',
                                tz === timezone ? 'bg-primary/10 text-primary' : 'text-foreground',
                              )}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setTimezone(tz)
                                setSearchTerm(tz)
                                setShowSuggestions(false)
                              }}
                            >
                              {tz}
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="px-3 py-2 text-sm text-muted-foreground">
                          {t('adminTimezonePage.states.noOptions', 'Nenhum timezone disponível')}
                        </li>
                      )}
                    </ul>
                  ) : null}
                  {timezoneError ? (
                    <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">
                      {Array.isArray(timezoneError) ? timezoneError.join(', ') : timezoneError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={saving || loading || !timezone}>
                  {saving ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      {t('adminTimezonePage.actions.saving', 'Salvando...')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('adminTimezonePage.actions.save', 'Salvar')}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" disabled={loading || saving} onClick={loadTimezone}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t('adminTimezonePage.actions.reset', 'Descartar alterações')}
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>{t('adminTimezonePage.form.autoUtc', 'A API converte tudo para UTC internamente.')}</span>
                </div>
              </div>
            </form>

            <div className="rounded-xl border border-sky-200/70 bg-sky-50/80 p-4 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-50">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <p className="text-sm font-semibold">
                  {t('adminTimezonePage.filters.title', 'Como isso afeta filtros e exportações')}
                </p>
              </div>
              <p className="mt-2 text-sm">
                {t(
                  'adminTimezonePage.filters.description',
                  'Sempre que abrir filtros de data (relatórios, exportações), os intervalos são interpretados usando este timezone. A API já converte tudo para UTC, então o front só precisa informar ao usuário.',
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

