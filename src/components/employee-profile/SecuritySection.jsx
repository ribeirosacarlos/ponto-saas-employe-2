import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { updateEmployeePassword } from '@/services/employeePasswordService'

function PasswordField({ label, value, onChange, error, id, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={error ? 'border-rose-400 pr-9' : 'pr-9'}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  )
}

const EMPTY_FORM = { current_password: '', password: '', password_confirmation: '' }
const EMPTY_ERRORS = { current_password: '', password: '', password_confirmation: '' }

export function SecuritySection() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setSuccess(false)
  }

  const validate = () => {
    const next = { ...EMPTY_ERRORS }
    if (!form.current_password) {
      next.current_password = t('profilePage.fields.currentPasswordRequired', { defaultValue: 'Informe a senha atual.' })
    }
    if (!form.password) {
      next.password = t('profilePage.fields.newPasswordRequired', { defaultValue: 'Informe a nova senha.' })
    } else if (form.password.length < 8) {
      next.password = t('profilePage.fields.newPasswordMin', { defaultValue: 'A nova senha deve ter ao menos 8 caracteres.' })
    }
    if (!form.password_confirmation) {
      next.password_confirmation = t('profilePage.fields.confirmPasswordRequired', { defaultValue: 'Confirme a nova senha.' })
    } else if (form.password !== form.password_confirmation) {
      next.password_confirmation = t('profilePage.fields.passwordMismatch', { defaultValue: 'As senhas não coincidem.' })
    }
    return next
  }

  const hasErrors = (errs) => Object.values(errs).some(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = validate()
    if (hasErrors(next)) {
      setErrors(next)
      return
    }

    setIsSaving(true)
    setErrors(EMPTY_ERRORS)
    setSuccess(false)

    try {
      await updateEmployeePassword(form)
      setForm(EMPTY_FORM)
      setSuccess(true)
      toast({
        title: t('profilePage.toast.passwordSuccessTitle', { defaultValue: 'Senha atualizada' }),
        description: t('profilePage.toast.passwordSuccessDescription', { defaultValue: 'Sua senha foi alterada com sucesso.' }),
        variant: 'success',
      })
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {}
      const next = {
        current_password: apiErrors?.current_password?.[0] || '',
        password: apiErrors?.password?.[0] || '',
        password_confirmation: apiErrors?.password_confirmation?.[0] || '',
      }
      if (hasErrors(next)) {
        setErrors(next)
      } else {
        const message = err?.response?.data?.message || err?.message || t('profilePage.toast.errorDescription', { defaultValue: 'Não foi possível salvar.' })
        toast({
          title: t('profilePage.toast.errorTitle', { defaultValue: 'Erro ao salvar' }),
          description: message,
          variant: 'error',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground">
          {t('profilePage.sections.security.title', { defaultValue: 'Segurança' })}
        </h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t('profilePage.sections.security.description', {
            defaultValue: 'Gerencie sua senha de acesso.',
          })}
        </p>
      </div>

      <Separator />

      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <span className="text-[12px] font-medium text-foreground">
          {t('profilePage.sections.security.changePassword', { defaultValue: 'Alterar senha' })}
        </span>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t('profilePage.toast.passwordSuccessDescription', { defaultValue: 'Sua senha foi alterada com sucesso.' })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-sm space-y-4" noValidate>
        <PasswordField
          id="current_password"
          label={t('profilePage.fields.currentPassword', { defaultValue: 'Senha atual' })}
          value={form.current_password}
          onChange={handleChange('current_password')}
          error={errors.current_password}
          autoComplete="current-password"
        />
        <PasswordField
          id="new_password"
          label={t('profilePage.fields.newPassword', { defaultValue: 'Nova senha' })}
          value={form.password}
          onChange={handleChange('password')}
          error={errors.password}
          autoComplete="new-password"
        />
        <PasswordField
          id="password_confirmation"
          label={t('profilePage.fields.confirmPassword', { defaultValue: 'Confirmar nova senha' })}
          value={form.password_confirmation}
          onChange={handleChange('password_confirmation')}
          error={errors.password_confirmation}
          autoComplete="new-password"
        />

        <Button type="submit" size="sm" disabled={isSaving} className="mt-2">
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('common.actions.saving', { defaultValue: 'Salvando...' })}
            </>
          ) : (
            t('profilePage.sections.security.updatePassword', { defaultValue: 'Atualizar senha' })
          )}
        </Button>
      </form>
    </div>
  )
}
