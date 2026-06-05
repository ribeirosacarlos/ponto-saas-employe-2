import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, FileSignature, Loader2, MapPin, PenLine, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useCompanySignatures } from '@/hooks/useCompanySignatures'
import { cn } from '@/lib/utils'

const SIGNATURE_FIELDS = [
  {
    key: 'enable_native_signatures',
    icon: PenLine,
    labelKey: 'settingsSignatures.fields.enableNative',
    defaultLabel: 'Habilitar assinaturas nativas',
    descriptionKey: 'settingsSignatures.fields.enableNativeHint',
    defaultDescription: 'Permite que colaboradores assinem documentos diretamente no sistema.',
  },
  {
    key: 'require_timesheet_signature',
    icon: FileSignature,
    labelKey: 'settingsSignatures.fields.requireTimesheet',
    defaultLabel: 'Exigir assinatura na folha de ponto',
    descriptionKey: 'settingsSignatures.fields.requireTimesheetHint',
    defaultDescription: 'Colaboradores devem assinar a folha de ponto ao fechá-la.',
    dependsOn: 'enable_native_signatures',
  },
  {
    key: 'require_password_confirmation_for_signature',
    icon: ShieldCheck,
    labelKey: 'settingsSignatures.fields.requirePassword',
    defaultLabel: 'Exigir confirmação de senha',
    descriptionKey: 'settingsSignatures.fields.requirePasswordHint',
    defaultDescription: 'Solicita a senha do usuário para confirmar cada assinatura.',
    dependsOn: 'enable_native_signatures',
  },
  {
    key: 'allow_geolocation_on_signature',
    icon: MapPin,
    labelKey: 'settingsSignatures.fields.allowGeolocation',
    defaultLabel: 'Registrar geolocalização na assinatura',
    descriptionKey: 'settingsSignatures.fields.allowGeolocationHint',
    defaultDescription: 'Captura a localização do colaborador no momento da assinatura.',
    dependsOn: 'enable_native_signatures',
  },
]

export function SignaturesSection() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, isLoading, isSaving, error, save } = useCompanySignatures(true)

  const [form, setForm] = useState({
    enable_native_signatures: false,
    require_timesheet_signature: false,
    require_password_confirmation_for_signature: true,
    allow_geolocation_on_signature: false,
  })
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (data) {
      setForm({
        enable_native_signatures: data.enable_native_signatures ?? false,
        require_timesheet_signature: data.require_timesheet_signature ?? false,
        require_password_confirmation_for_signature: data.require_password_confirmation_for_signature ?? true,
        allow_geolocation_on_signature: data.allow_geolocation_on_signature ?? false,
      })
      setIsDirty(false)
    }
  }, [data])

  const handleToggle = (key, checked) => {
    setForm((prev) => {
      const next = { ...prev, [key]: checked }
      // Se desativar assinaturas nativas, desativa os dependentes
      if (key === 'enable_native_signatures' && !checked) {
        next.require_timesheet_signature = false
        next.require_password_confirmation_for_signature = false
        next.allow_geolocation_on_signature = false
      }
      return next
    })
    setIsDirty(true)
  }

  const handleSave = async () => {
    try {
      await save(form)
      setIsDirty(false)
      toast({
        title: t('settingsSignatures.toast.successTitle', { defaultValue: 'Assinaturas atualizadas' }),
        description: t('settingsSignatures.toast.successDescription', { defaultValue: 'As configurações de assinatura foram salvas.' }),
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: t('settingsSignatures.toast.errorTitle', { defaultValue: 'Erro ao salvar' }),
        description: err?.response?.data?.message || err?.message || t('settingsSignatures.toast.errorDescription', { defaultValue: 'Não foi possível salvar as configurações.' }),
        variant: 'error',
      })
    }
  }

  const handleDiscard = () => {
    if (data) {
      setForm({
        enable_native_signatures: data.enable_native_signatures ?? false,
        require_timesheet_signature: data.require_timesheet_signature ?? false,
        require_password_confirmation_for_signature: data.require_password_confirmation_for_signature ?? true,
        allow_geolocation_on_signature: data.allow_geolocation_on_signature ?? false,
      })
    }
    setIsDirty(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground">
          {t('settingsSignatures.title', { defaultValue: 'Assinaturas de Folha' })}
        </h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t('settingsSignatures.description', { defaultValue: 'Configure as assinaturas digitais na folha de ponto.' })}
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
        <div className="space-y-0 divide-y divide-border/60">
          {SIGNATURE_FIELDS.map((field) => {
            const Icon = field.icon
            const isDependent = Boolean(field.dependsOn)
            const parentDisabled = isDependent && !form[field.dependsOn]
            const isDisabled = isSaving || parentDisabled

            return (
              <div
                key={field.key}
                className={cn(
                  'flex items-start justify-between gap-4 py-4',
                  parentDisabled && 'opacity-50',
                )}
              >
                <div className="flex min-w-0 gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[12px] font-medium text-foreground">
                      {t(field.labelKey, { defaultValue: field.defaultLabel })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t(field.descriptionKey, { defaultValue: field.defaultDescription })}
                    </p>
                    {isDependent && parentDisabled && (
                      <p className="text-[10px] text-muted-foreground/60 italic">
                        {t('settingsSignatures.requiresNative', { defaultValue: 'Requer assinaturas nativas habilitadas.' })}
                      </p>
                    )}
                  </div>
                </div>
                <Switch
                  checked={form[field.key]}
                  disabled={isDisabled}
                  onCheckedChange={(checked) => handleToggle(field.key, checked)}
                  className="mt-0.5 shrink-0"
                  aria-label={t(field.labelKey, { defaultValue: field.defaultLabel })}
                />
              </div>
            )
          })}
        </div>
      )}

      {isDirty && (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
          <div className="flex flex-1 items-center gap-2 text-[12px] text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {t('settingsSignatures.unsavedChanges', { defaultValue: 'Você tem alterações não salvas.' })}
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
