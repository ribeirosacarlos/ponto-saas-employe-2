import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useCompanyLocale } from '@/hooks/useCompanyLocale'
import { cn } from '@/lib/utils'

const COUNTRIES = [
  { value: 'BR', label: 'Brasil' },
  { value: 'PT', label: 'Portugal' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'Espanha' },
  { value: 'MX', label: 'México' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CO', label: 'Colômbia' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Peru' },
  { value: 'UY', label: 'Uruguai' },
]

const LOCALES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'pt-PT', label: 'Português (Portugal)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

function SelectField({ label, description, value, onChange, options, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Globe2 className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[12px] font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'h-8 min-w-[160px] rounded-md border border-border/80 bg-background px-2.5 text-[12px] text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function LocaleSection() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, isLoading, isSaving, error, save } = useCompanyLocale(true)

  const [form, setForm] = useState({ country: 'BR', locale: 'pt-BR' })
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (data) {
      setForm({ country: data.country || 'BR', locale: data.locale || 'pt-BR' })
      setIsDirty(false)
    }
  }, [data])

  const handleChange = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    try {
      await save(form)
      setIsDirty(false)
      toast({
        title: t('settingsLocale.toast.successTitle', { defaultValue: 'Localização atualizada' }),
        description: t('settingsLocale.toast.successDescription', { defaultValue: 'O país e idioma da empresa foram salvos.' }),
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: t('settingsLocale.toast.errorTitle', { defaultValue: 'Erro ao salvar' }),
        description: err?.response?.data?.message || err?.message || t('settingsLocale.toast.errorDescription', { defaultValue: 'Não foi possível salvar.' }),
        variant: 'error',
      })
    }
  }

  const handleDiscard = () => {
    if (data) setForm({ country: data.country || 'BR', locale: data.locale || 'pt-BR' })
    setIsDirty(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground">
          {t('settingsLocale.title', { defaultValue: 'Locale e País' })}
        </h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t('settingsLocale.description', { defaultValue: 'País de operação e idioma padrão da empresa.' })}
        </p>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.loading', { defaultValue: 'Carregando...' })}
        </div>
      ) : error && !data ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          <SelectField
            label={t('settingsLocale.fields.country', { defaultValue: 'País' })}
            description={t('settingsLocale.fields.countryHint', { defaultValue: 'País onde a empresa opera.' })}
            value={form.country}
            onChange={handleChange('country')}
            options={COUNTRIES}
            disabled={isSaving}
          />
          <SelectField
            label={t('settingsLocale.fields.locale', { defaultValue: 'Idioma' })}
            description={t('settingsLocale.fields.localeHint', { defaultValue: 'Idioma padrão do sistema para a empresa.' })}
            value={form.locale}
            onChange={handleChange('locale')}
            options={LOCALES}
            disabled={isSaving}
          />
        </div>
      )}

      {isDirty && (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
          <div className="flex flex-1 items-center gap-2 text-[12px] text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {t('settingsLocale.unsavedChanges', { defaultValue: 'Você tem alterações não salvas.' })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {t('common.actions.discard', { defaultValue: 'Descartar' })}
            </button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('common.actions.saving', { defaultValue: 'Salvando...' })}
                </>
              ) : (
                t('common.actions.save', { defaultValue: 'Salvar' })
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
