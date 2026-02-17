import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe2, RefreshCcw, Save, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { useToast } from '../ui/use-toast'
import { DEFAULT_TIMEZONE } from '../../lib/datetime'
import { fetchCompanyTimezone, updateCompanyTimezone } from '../../services/companyTimezoneService'
import { useTimezoneStore } from '../../store/useTimezone'

const DetailItem = ({ label, value }) => {
  if (!value) return null
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function PreferencesCard({ company, canEdit, onTimezoneSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const setTimezone = useTimezoneStore((state) => state.setTimezone)

  const [isEditing, setIsEditing] = useState(false)
  const [availableTimezones, setAvailableTimezones] = useState([])
  const [timezone, setTimezoneState] = useState(company?.timezone || '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (company?.timezone && !timezone) {
      setTimezoneState(company.timezone)
    }
  }, [company?.timezone, timezone])

  const options = useMemo(() => {
    const base = [company?.timezone, DEFAULT_TIMEZONE, 'UTC'].filter(Boolean)
    const merged = Array.from(new Set([...(availableTimezones || []), ...base]))
    return merged
  }, [availableTimezones, company?.timezone])

  const loadTimezones = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetchCompanyTimezone()
      setAvailableTimezones(response.available_timezones || [])
      if (response.timezone) {
        setTimezoneState(response.timezone)
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('settingsPage.preferences.states.errorLoading')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTimezones()
  }, [])

  const handleSave = async () => {
    if (!timezone || !canEdit) return
    setSaving(true)
    setError('')
    try {
      const response = await updateCompanyTimezone(timezone)
      const nextTimezone = response.timezone || timezone
      setTimezoneState(nextTimezone)
      setAvailableTimezones(response.available_timezones || availableTimezones)
      setTimezone(nextTimezone)
      toast({
        title: t('settingsPage.preferences.toast.successTitle'),
        description: t('settingsPage.preferences.toast.successDescription'),
        variant: 'success',
      })
      setIsEditing(false)
      if (onTimezoneSaved) onTimezoneSaved()
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('settingsPage.preferences.toast.errorDescription')
      setError(message)
      toast({
        title: t('settingsPage.preferences.toast.errorTitle'),
        description: message,
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border border-border/80 bg-card/90">
      <CardHeader className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Globe2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t('settingsPage.preferences.title')}
          </p>
          <CardTitle className="text-lg font-semibold text-foreground">
            {t('settingsPage.preferences.subtitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('settingsPage.preferences.helper')}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-xl border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
            {error}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={loadTimezones} disabled={loading}>
                <RefreshCcw className="h-4 w-4" />
                {t('settingsPage.preferences.actions.reload')}
              </Button>
            </div>
          </div>
        ) : null}

        {!isEditing ? (
          <>
            <DetailItem label={t('settingsPage.preferences.fields.timezone')} value={timezone || t('settingsPage.preferences.states.noTimezone')} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canEdit}
                onClick={() => setIsEditing(true)}
              >
                {t('settingsPage.preferences.actions.edit')}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="timezone-input">{t('settingsPage.preferences.fields.timezone')}</Label>
              <select
                id="timezone-input"
                value={timezone}
                onChange={(event) => setTimezoneState(event.target.value)}
                disabled={loading || saving}
                className="block w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">
                  {t('settingsPage.preferences.fields.timezonePlaceholder')}
                </option>
                {options.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleSave} disabled={saving || loading || !timezone}>
                <Save className="h-4 w-4" />
                {t('settingsPage.preferences.actions.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setIsEditing(false)
                  setError('')
                  const fallback = company?.timezone || ''
                  setTimezoneState(fallback)
                }}
              >
                <X className="h-4 w-4" />
                {t('common.actions.cancel')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadTimezones}
                disabled={loading}
              >
                <RefreshCcw className="h-4 w-4" />
                {t('settingsPage.preferences.actions.reload')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
