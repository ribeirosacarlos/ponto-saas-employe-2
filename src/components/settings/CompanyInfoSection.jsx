import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Loader2, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { cn } from '@/lib/utils'

function Field({ label, children, error, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  )
}

const FIELDS = [
  { key: 'name', labelKey: 'settingsCompanyInfo.fields.name', defaultLabel: 'Nome da empresa', colSpan: 2, autoComplete: 'organization' },
  { key: 'email', labelKey: 'settingsCompanyInfo.fields.email', defaultLabel: 'E-mail de contato', inputType: 'email', autoComplete: 'email' },
  { key: 'phone', labelKey: 'settingsCompanyInfo.fields.phone', defaultLabel: 'Telefone', inputType: 'tel', autoComplete: 'tel' },
  { key: 'address', labelKey: 'settingsCompanyInfo.fields.address', defaultLabel: 'Endereço', colSpan: 2, autoComplete: 'street-address' },
  { key: 'city', labelKey: 'settingsCompanyInfo.fields.city', defaultLabel: 'Cidade', autoComplete: 'address-level2' },
  { key: 'state', labelKey: 'settingsCompanyInfo.fields.state', defaultLabel: 'Estado (UF)', maxLength: 2, autoComplete: 'address-level1' },
]

export function CompanyInfoSection() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, isLoading, isSaving, error, save } = useCompanyInfo(true)

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (data && !isEditing) {
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
      })
    }
  }, [data, isEditing])

  const handleEdit = () => {
    setForm({
      name: data?.name || '',
      email: data?.email || '',
      phone: data?.phone || '',
      address: data?.address || '',
      city: data?.city || '',
      state: data?.state || '',
    })
    setFieldErrors({})
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFieldErrors({})
  }

  const handleChange = (key) => (e) => {
    const value = key === 'state' ? e.target.value.toUpperCase().slice(0, 2) : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const handleSave = async () => {
    try {
      await save(form)
      setIsEditing(false)
      toast({
        title: t('settingsCompanyInfo.toast.successTitle', { defaultValue: 'Informações atualizadas' }),
        description: t('settingsCompanyInfo.toast.successDescription', { defaultValue: 'Os dados da empresa foram salvos.' }),
        variant: 'success',
      })
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {}
      if (Object.keys(apiErrors).length > 0) {
        const next = {}
        Object.entries(apiErrors).forEach(([k, msgs]) => {
          next[k] = Array.isArray(msgs) ? msgs[0] : msgs
        })
        setFieldErrors(next)
      } else {
        toast({
          title: t('settingsCompanyInfo.toast.errorTitle', { defaultValue: 'Erro ao salvar' }),
          description: err?.response?.data?.message || err?.message || t('settingsCompanyInfo.toast.errorDescription', { defaultValue: 'Não foi possível salvar os dados.' }),
          variant: 'error',
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">
            {t('settingsCompanyInfo.title', { defaultValue: 'Informações da Empresa' })}
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t('settingsCompanyInfo.description', { defaultValue: 'Nome, contato e endereço da empresa.' })}
          </p>
        </div>
        {!isEditing && !isLoading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="shrink-0 rounded-full border-border/70 bg-transparent shadow-none"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t('common.actions.edit', { defaultValue: 'Editar' })}
          </Button>
        )}
        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className="flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            {t('common.actions.cancel', { defaultValue: 'Cancelar' })}
          </button>
        )}
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.loading', { defaultValue: 'Carregando...' })}
        </div>
      ) : error && !data ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map((field) => (
            <Field
              key={field.key}
              label={t(field.labelKey, { defaultValue: field.defaultLabel })}
              error={fieldErrors[field.key]}
              className={field.colSpan === 2 ? 'col-span-2' : ''}
            >
              <div className={cn(field.colSpan === 2 ? 'col-span-2' : '')}>
                {isEditing ? (
                  <Input
                    type={field.inputType || 'text'}
                    value={form[field.key] || ''}
                    onChange={handleChange(field.key)}
                    maxLength={field.maxLength}
                    autoComplete={field.autoComplete}
                    className={cn(fieldErrors[field.key] && 'border-rose-400')}
                    disabled={isSaving}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex items-center rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[12px]',
                      !data?.[field.key] && 'text-muted-foreground',
                    )}
                  >
                    {data?.[field.key] || (
                      <span className="italic">{t('common.notSet', { defaultValue: 'Não definido' })}</span>
                    )}
                  </div>
                )}
              </div>
            </Field>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="flex items-center gap-3 pt-2">
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
      )}
    </div>
  )
}
